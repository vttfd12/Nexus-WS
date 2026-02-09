use axum::extract::ws::{WebSocket, Message};
use futures_util::{sink::SinkExt, stream::{StreamExt, SplitSink, SplitStream}};
use tokio::sync::mpsc;
use uuid::Uuid;
use std::time::Instant;
use std::collections::HashSet;

use tokio::time::{self, Duration};

use my_websocket::state::{AppState, UserInfo, RoomMessage, MessageAuthor};
use my_websocket::events::{ClientEvent, ServerEvent};

async fn handle_client_event(
    event: ClientEvent, 
    state: AppState, 
    user_id: Uuid, 
    tx: mpsc::Sender<Message>
) {
    match event {
        ClientEvent::JoinRoom(room_name) => {
            println!("User {} is joining room: {}", user_id, room_name);
            
            // 1. Update the rooms map (Room -> User list)
            let count = {
                let mut rooms = state.rooms.lock().unwrap();
                rooms.entry(room_name.clone())
                    .or_insert_with(HashSet::new)
                    .insert(user_id);
                rooms.get(&room_name).unwrap().len()
            }; 

            // 2. Update the user's personal room list (User -> Room list)
            {
                let mut users = state.users.lock().unwrap();
                if let Some(user) = users.get_mut(&user_id) {
                    user.rooms.insert(room_name.clone());
                }
            }
            broadcast_status_update(user_id, "online", &state).await;
            broadcast_room_update(&room_name, &state).await;
            broadcast_user_joined(&room_name, user_id, &state).await;
            fetch_room_messages(&room_name, tx.clone(), &state).await;
            
            println!("Room {} now has {} users", room_name, count);
        }
        ClientEvent::SendMessage(message) => {
            let (username, display_name) = {
                let users = state.users.lock().unwrap();
                users.get(&user_id)
                    .map(|u| (u.username.clone(), u.display_name.clone()))
                    .unwrap_or_else(|| ("Unknown".to_string(), "Unknown".to_string()))
            };

            let created_at = chrono::Utc::now().to_rfc3339();
            let out_event = ServerEvent::SendMessage { 
                payload: message,
                from_id: user_id,
                from_username: username,
                from_display_name: display_name,
                created_at,
                edited_at: None,
            };
            let msg = Message::Text(serde_json::to_string(&out_event).unwrap());
            if tx.send(msg).await.is_err() {
                send_error(tx, "500", "Failed to send message").await;
            }
        }
        ClientEvent::LeaveRoom(room_name) => {
            println!("User {} is leaving room", user_id);
            
            // 1. Update the rooms map via helper
            perform_leave_room(&room_name, user_id, &state);

            // 2. Update the user's personal room list
            {
                let mut users = state.users.lock().unwrap();
                if let Some(user) = users.get_mut(&user_id) {
                    user.rooms.remove(&room_name);
                }
            }
            
            broadcast_room_update(&room_name, &state).await;
        }
        ClientEvent::PrivateMessage { payload, target_username } => {
            if payload.trim().is_empty(){
                send_error(tx, "400", "You cannot send an empty message").await;
                return;
            }

            // Get sender's username and find target by username
            let (from_username, target_tx, is_self_message) = {
                let users = state.users.lock().unwrap();
                let from_username = users.get(&user_id)
                    .map(|u| u.username.clone())
                    .unwrap_or_else(|| "Unknown".to_string());
                
                let is_self = from_username == target_username;
                
                let target_tx = users.values()
                    .find(|u| u.username == target_username)
                    .map(|u| u.tx.clone());
                
                (from_username, target_tx, is_self)
            };
            
            if is_self_message {
                send_error(tx, "400", "You cannot send a private message to yourself").await;
                return;
            }
            
            if let Some(receptor) = target_tx {
                let from_display_name = {
                    let users = state.users.lock().unwrap();
                    users.get(&user_id).map(|u| u.display_name.clone()).unwrap_or_else(|| from_username.clone())
                };

                let created_at = chrono::Utc::now().to_rfc3339();
                let out_event = ServerEvent::PrivateMessage { 
                    from_id: user_id, 
                    from_username, 
                    from_display_name, 
                    payload,
                    created_at,
                    edited_at: None,
                };
                let msg = Message::Text(serde_json::to_string(&out_event).unwrap());
                if receptor.send(msg).await.is_err() {
                    send_error(tx, "500", "Destination user disconnected abruptly").await;
                }
            } else {
                send_error(tx, "400", "User is offline or not found").await;
            }
        }
        ClientEvent::ServerBroadcast{ payload } => {
            let (username, display_name) = {
                let users = state.users.lock().unwrap();
                users.get(&user_id)
                    .map(|u| (u.username.clone(), u.display_name.clone()))
                    .unwrap_or_else(|| ("Unknown".to_string(), "Unknown".to_string()))
            };

            let created_at = chrono::Utc::now().to_rfc3339();
            let out_event = ServerEvent::SendMessage { 
                payload: payload.clone(),
                from_id: user_id,
                from_username: username,
                from_display_name: display_name,
                created_at,
                edited_at: None,
            };
            let msg = Message::Text(serde_json::to_string(&out_event).unwrap());
            let transmitters: Vec<_> = {
                let users = state.users.lock().unwrap();
                users.iter()
                    .filter(|(id, _)| *id != &user_id) // Skip the sender
                    .map(|(_, info)| info.tx.clone())
                    .collect()
            };

            // 2. Send the message
            for tx in transmitters {
                let _ = tx.send(msg.clone()).await;
            }
        }   
        ClientEvent::RoomBroadcast{ payload , room_name} => {
            let (username, display_name) = {
                let users = state.users.lock().unwrap();
                users.get(&user_id)
                    .map(|u| (u.username.clone(), u.display_name.clone()))
                    .unwrap_or_else(|| ("Unknown".to_string(), "Unknown".to_string()))
            };

            let created_at = chrono::Utc::now().to_rfc3339();
            let out_event = ServerEvent::SendMessage { 
                payload: payload.clone(),
                from_id: user_id,
                from_username: username,
                from_display_name: display_name,
                created_at,
                edited_at: None,
            };
            let msg = Message::Text(serde_json::to_string(&out_event).unwrap());
            
            println!("User {} is broadcasting to room {}: {}", user_id, room_name, payload);

            let db_id = {
                let users = state.users.lock().unwrap();
                users.get(&user_id).map(|u| u.db_user_id).unwrap_or(0)
            };

            match state.http_client.post("https://localhost:443/api/internal/messages")
                .json(&serde_json::json!({
                    "roomId": room_name,
                    "userId": db_id,
                    "content": payload
                }))
                .send().await {
                    Ok(response) => {
                        if response.status().is_success() {
                            println!("Message saved to database successfully");
                        } else {
                            println!("Failed to save message: HTTP {}", response.status());
                        }
                    }
                    Err(e) => println!("Failed to reach API server: {}", e),
                }

            let transmitters: Vec<_> = {
                let rooms = state.rooms.lock().unwrap();

                if let Some(members) = rooms.get(&room_name) {
                    let users = state.users.lock().unwrap();
                    members.iter()
                        .filter(|&&id| id != user_id) // Skip the sender
                        .filter_map(|id| users.get(id).map(|info| info.tx.clone()))
                        .collect()
                } else {
                    Vec::new()
                }
            };
            // 2. Send the message
            for tx in transmitters {
                let _ = tx.send(msg.clone()).await;
            }
        }
        ClientEvent::GetRoomList => {
            let msg = {
                 let rooms = state.rooms.lock().unwrap();
                 let room_entries: Vec<my_websocket::events::RoomListEntry> = rooms.iter()
                     .map(|(name, members)| my_websocket::events::RoomListEntry {
                         name: name.clone(),
                         count: members.len(),
                     })
                     .collect();
                 let out_event = ServerEvent::RoomList { rooms: room_entries };
                 Message::Text(serde_json::to_string(&out_event).unwrap())
            };
            let _ = tx.send(msg).await;
        }
        ClientEvent::ChangeDisplayname{ display_name } => {
            if display_name.trim().is_empty(){
                send_error(tx, "400", "Display name cannot be empty").await;
                return;
            }

            // 1. Get DB ID and Old Name
            let (db_id, old_name) = {
                let users = state.users.lock().unwrap();
                if let Some(user) = users.get(&user_id) {
                    (user.db_user_id, user.display_name.clone())
                } else {
                    (0, "Unknown".to_string())
                }
            };

            if db_id == 0 { return; } 
            
            if old_name == display_name { return; } 

            // 2. Update Database
            fetch_change_displayname(db_id, &display_name, &state).await;

            // 3. Update Local State
            {
                let mut users = state.users.lock().unwrap();
                if let Some(user) = users.get_mut(&user_id) {
                    user.display_name = display_name.clone();
                }
            }

            // 4. Broadcast to Subscribers
            let subscribers = {
                let subs = state.profile_subscribers.lock().unwrap();
                subs.get(&db_id).cloned()
            };

            if let Some(sessions) = subscribers {
                let out_event = ServerEvent::DisplaynameChanged { 
                    old: old_name.clone(), 
                    new: display_name.clone() 
                };
                let msg = Message::Text(serde_json::to_string(&out_event).unwrap());

                let transmitters: Vec<_> = {
                    let users = state.users.lock().unwrap();
                    sessions.iter()
                        .filter_map(|id| users.get(id).map(|u| u.tx.clone()))
                        .collect()
                };

                for tx in transmitters {
                    let _ = tx.send(msg.clone()).await;
                }
            }

            // 5. Broadcast to Rooms
            let rooms: Vec<String> = {
                let users = state.users.lock().unwrap();
                users.get(&user_id).map(|u| u.rooms.iter().cloned().collect()).unwrap_or_default()
            };
            
            for room in rooms {
                 broadcast_room_update(&room, &state).await;
            }
            
            // 6. Notify Self
            let out_event = ServerEvent::DisplaynameChanged { 
                old: old_name, 
                new: display_name 
            };
            let _ = tx.send(Message::Text(serde_json::to_string(&out_event).unwrap())).await;
        }
        ClientEvent::Pong => {
            let mut users = state.users.lock().unwrap();
            if let Some(user) = users.get_mut(&user_id) {
                user.last_heartbeat = Instant::now();
            }
        }
        ClientEvent::GetRoomUsers(room_name) => {
            fetch_and_send_room_members(&room_name, tx.clone(), &state).await;
        }
        ClientEvent::UpdateStatus(status) => {
            let valid_statuses = ["online", "away", "busy", "offline"];
            if !valid_statuses.contains(&status.to_lowercase().as_str()) {
                send_error(tx, "400", "Invalid status. Use: online, away, busy, offline").await;
                return;
            }
            
            broadcast_status_update(user_id, &status, &state).await;
            persist_status_to_db(user_id, &status, &state).await;
        }
        ClientEvent::SubscribeToProfile{ user_id: target_id } => {
            {
                let mut subs = state.profile_subscribers.lock().unwrap();
                subs.entry(target_id).or_default().insert(user_id);
            }
            println!("User {} subscribed to profile ID {}", user_id, target_id);

            // Send current status immediately
            let target_status = {
                let users = state.users.lock().unwrap();
                users.values()
                    .find(|u| u.db_user_id == target_id)
                    .map(|u| u.status.clone())
                    .unwrap_or_else(|| "offline".to_string())
            };

            let out_event = ServerEvent::UserStatusUpdate { 
                status: target_status 
            };
            let msg = Message::Text(serde_json::to_string(&out_event).unwrap());
            let _ = tx.send(msg).await;
        }
        ClientEvent::UnsubscribeFromProfile{ user_id: target_id } => {
            let mut subs = state.profile_subscribers.lock().unwrap();
            if let Some(subscribers) = subs.get_mut(&target_id) {
                subscribers.remove(&user_id);
                if subscribers.is_empty() {
                    subs.remove(&target_id);
                }
            }
            println!("User {} unsubscribed from profile ID {}", user_id, target_id);
        }
    
        ClientEvent::GetUsernameFromDisplayname(target_display_name) => {
            let username = {
                let users = state.users.lock().unwrap();
                users.values()
                .find(|u| u.display_name == target_display_name)
                .map(|u| u.username.clone())
                .unwrap_or_else(|| "Unknown".to_string())
            };
        
            let out_event = ServerEvent::RecieveUsername{ username: username };
            let msg = Message::Text(serde_json::to_string(&out_event).unwrap());

            let _ = tx.send(msg).await;
        }
    }
}
async fn fetch_change_displayname(
    db_id: i32,
    new_displayname: &str,
    state: &AppState
){
    let _ = state.http_client.post(format!("https://localhost:443/internal/updateDisplayname/{}", db_id))
        .json(&serde_json::json!({
            "displayName": new_displayname
        }))
        .send()
        .await;
}

async fn fetch_room_messages(    
    room_name: &str,
    tx: mpsc::Sender<Message>,
    state: &AppState
){
    match state.http_client
        .get(format!("https://localhost:443/internal/rooms/{}/messages", room_name))
        .send()
        .await
    {
        Ok(response) if response.status().is_success() => {
            if let Ok(data) = response.json::<serde_json::Value>().await {
                let messages: Vec<RoomMessage> = data["messages"].as_array()
                    .map(|arr| arr.iter()
                        .filter_map(|m| {
                            Some(RoomMessage {
                                id: m["id"].as_i64()? as i32,
                                content: m["content"].as_str()?.to_string(),
                                created_at: m["createdAt"].as_str()?.to_string(),
                                edited_at: m["editedAt"].as_str().map(String::from),
                                message_type: m["messageType"].as_str().unwrap_or("text").to_string(),
                                user: MessageAuthor {
                                    id: m["user"]["id"].as_i64()? as i32,
                                    username: m["user"]["username"].as_str()?.to_string(),
                                    display_name: m["user"]["displayName"].as_str()
                                        .map(String::from)
                                        .unwrap_or_else(|| m["user"]["username"].as_str().unwrap_or("").to_string()),
                                    avatar_url: m["user"]["avatarUrl"].as_str().map(String::from),
                                },
                            })
                        })
                        .collect())
                    .unwrap_or_default();


                let out_event = ServerEvent::LoadRoomMessages{
                    room_name: room_name.to_string(),
                    messages
                };
                let msg = Message::Text(serde_json::to_string(&out_event).unwrap());
                let _ = tx.send(msg).await;
            }
        }
        Ok(_) => send_error(tx, "404", "Room not found").await,
        Err(e) => {
            println!("API Error: {}", e);
            send_error(tx, "500", "Failed to fetch messages").await;
        }
    }
}


async fn send_error(tx: mpsc::Sender<Message>, code: &str, message: &str) {
    let error = ServerEvent::Error { code: code.to_string(), message: message.to_string() };
    if let Ok(msg) = serde_json::to_string(&error) {
        let _ = tx.send(Message::Text(msg)).await;
    }
}

async fn fetch_and_send_room_members(
    room_name: &str,
    tx: mpsc::Sender<Message>,
    state: &AppState
) {
    use my_websocket::state::RoomUser;
    
    match state.http_client
        .get(format!("https://localhost:443/internal/rooms/{}/members", room_name))
        .send()
        .await 
    {
        Ok(response) if response.status().is_success() => {
            if let Ok(data) = response.json::<serde_json::Value>().await {
                let users: Vec<RoomUser> = data["members"].as_array()
                    .map(|arr| arr.iter()
                        .filter_map(|m| {
                            let username = m["username"].as_str()?.to_string();
                            Some(RoomUser {
                                username: username.clone(),
                                display_name: m["displayName"].as_str().map(String::from).unwrap_or(username),
                                avatar_url: m["avatarUrl"].as_str().map(String::from),
                                status: m["status"].as_str().unwrap_or("online").to_string(),
                            })
                        })
                        .collect())
                    .unwrap_or_default();
                let out_event = ServerEvent::RoomUpdate {
                    room_name: room_name.to_string(),
                    users
                };
                let msg = Message::Text(serde_json::to_string(&out_event).unwrap());
                let _ = tx.send(msg).await;
            }
        }
        Ok(_) => send_error(tx, "404", "Room not found").await,
        Err(e) => {
            println!("API error: {}", e);
            send_error(tx, "500", "Failed to fetch room users").await;
        }
    }
}


pub async fn broadcast_room_update(room_name: &str, state: &AppState) {
    use my_websocket::state::RoomUser;
    
    let (room_users, transmitters) = {
        let rooms = state.rooms.lock().unwrap();
        let users = state.users.lock().unwrap();
        let members = rooms.get(room_name).cloned().unwrap_or_default();
        
        // Get full user info instead of just usernames
        let room_users: Vec<RoomUser> = members.iter()
            .filter_map(|id| users.get(id).map(|info| RoomUser {
                username: info.username.clone(),
                display_name: info.display_name.clone(),
                avatar_url: info.avatar_url.clone(),
                status: info.status.clone(),
            }))
            .collect();
        
        let txs: Vec<_> = members.iter()
            .filter_map(|id| users.get(id).map(|info| info.tx.clone()))
            .collect();
        
        (room_users, txs)
    };

    let out_event = ServerEvent::RoomUpdate { room_name: room_name.to_string(), users: room_users };
    let msg = Message::Text(serde_json::to_string(&out_event).unwrap());

    for tx in transmitters {
        let _ = tx.send(msg.clone()).await;
    }
}

pub async fn broadcast_user_joined(room_name: &str, user_id: Uuid, state: &AppState) {
    // Get username and transmitters
    let (username, transmitters) = {
        let rooms = state.rooms.lock().unwrap();
        let users = state.users.lock().unwrap();
        
        let username = users.get(&user_id)
            .map(|u| u.username.clone())
            .unwrap_or_else(|| "Unknown".to_string());
        
        let txs = if let Some(members) = rooms.get(room_name) {
            members.iter()
                .filter_map(|id| users.get(id).map(|info| info.tx.clone()))
                .collect::<Vec<_>>()
        } else {
            Vec::new()
        };
        
        (username, txs)
    };

    let out_event = ServerEvent::UserJoined { 
        room_name: room_name.to_string(), 
        username
    };
    let msg = Message::Text(serde_json::to_string(&out_event).unwrap());

    for tx in transmitters {
        let _ = tx.send(msg.clone()).await;
    }
}

/// Broadcasts a status change to all users in the given user's rooms
pub async fn broadcast_status_update(user_id: Uuid, new_status: &str, state: &AppState) {
    // 1. Notify Subscribers
    let db_id = {
        let users = state.users.lock().unwrap();
        users.get(&user_id).map(|u| u.db_user_id)
    };

    if let Some(uid) = db_id {
        let subscriber_sessions = {
            let subs = state.profile_subscribers.lock().unwrap();
            subs.get(&uid).cloned()
        };

        if let Some(sessions) = subscriber_sessions {
            let out_event = ServerEvent::UserStatusUpdate { 
                status: new_status.to_string() 
            };
            let message = serde_json::to_string(&out_event).unwrap();
            
            let transmitters: Vec<_> = {
                let users = state.users.lock().unwrap();
                sessions.iter()
                    .filter_map(|id| users.get(id).map(|u| u.tx.clone()))
                    .collect()
            };

            for tx in transmitters {
                let _ = tx.send(Message::Text(message.clone())).await;
            }
        }
    }    
    
    let (username, user_rooms) = {
        let mut users = state.users.lock().unwrap();
        if let Some(user) = users.get_mut(&user_id) {
            user.status = new_status.to_string();
            (user.username.clone(), user.rooms.clone())
        } else {
            return;
        }
    };

    let out_event = ServerEvent::UserStatusChanged {
        username,
        status: new_status.to_string(),
    };
    let msg = Message::Text(serde_json::to_string(&out_event).unwrap());

    // Broadcast to each room the user is in
    for room_name in user_rooms {
        let transmitters: Vec<_> = {
            let rooms = state.rooms.lock().unwrap();
            let users = state.users.lock().unwrap();
            
            if let Some(members) = rooms.get(&room_name) {
                members.iter()
                    .filter(|&&id| id != user_id)
                    .filter_map(|id| users.get(id).map(|info| info.tx.clone()))
                    .collect()
            } else {
                Vec::new()
            }
        };

        for tx in transmitters {
            let _ = tx.send(msg.clone()).await;
        }
    }
}

/// Persists status to database via Node.js
pub async fn persist_status_to_db(user_id: Uuid, status: &str, state: &AppState) {
    let db_id = {
        let users = state.users.lock().unwrap();
        users.get(&user_id).map(|u| u.db_user_id).unwrap_or(0)
    };

    let _ = state.http_client
        .post("https://localhost:443/internal/updateStatus")
        .json(&serde_json::json!({
            "userId": db_id,
            "status": status
        }))
        .send()
        .await;
}

pub async fn handle_socket(socket: WebSocket, state: AppState, token: String) {
    // 1. Verify token with Node.js server
    if token.is_empty() {
        println!("Connection rejected: No token provided");
        return;
    }

    let auth_res = match state.http_client.post("https://localhost:443/api/auth/verify-session")
        .json(&serde_json::json!({ "token": token }))
        .send().await {
            Ok(res) => res,
            Err(e) => {
                println!("Auth verification failed (network): {}", e);
                return;
            }
        };

    if !auth_res.status().is_success() {
        println!("Connection rejected: Invalid token (HTTP {})", auth_res.status());
        return;
    }

    let auth_data: serde_json::Value = auth_res.json().await.unwrap_or_default();
    if !auth_data["valid"].as_bool().unwrap_or(false) {
        println!("Connection rejected: Token not valid");
        return;
    }

    let db_user_id = auth_data["userId"].as_i64().unwrap_or(0) as i32;
    let username = auth_data["username"].as_str().unwrap_or("Anonymous").to_string();
    let display_name = auth_data["displayName"].as_str().unwrap_or(&username).to_string();
    let avatar_url = auth_data["avatarUrl"].as_str().map(String::from);
    // Force status to "online" on new connection
    let status = "online".to_string(); 

    let session_id = Uuid::new_v4();

    let (sender, reciever) = socket.split();
    let (tx, rx) = mpsc::channel(100);

    let now = Instant::now(); 
    
    let user_info = UserInfo {
        session_id,
        db_user_id,
        username,
        display_name,
        avatar_url,
        status: status.clone(),
        rooms: HashSet::new(),
        _joined_at: now,
        last_heartbeat: now,
        tx,
    };
    {
        let mut users = state.users.lock().unwrap();
        users.insert(session_id, user_info.clone());
        println!("Users Online: {}", users.len());
    }
    println!("New authenticated connection: {} (DB ID: {})", session_id, db_user_id);
    
    broadcast_status_update(session_id, &user_info.status, &state).await;
    persist_status_to_db(session_id, &user_info.status, &state).await;

    let welcome_msg = ServerEvent::IdentityAnnounced { payload: session_id.to_string() };
    let welcome_msg = serde_json::to_string(&welcome_msg).unwrap();
    let _ = user_info.tx.try_send(Message::Text(welcome_msg));

    let mut interval = time::interval(Duration::from_secs(30));

    let mut read_task = tokio::spawn(read(reciever, user_info.tx.clone(), session_id, state.clone()));
    let mut write_task = tokio::spawn(write(sender, rx, session_id));

    loop {
        tokio::select! {
            _ = &mut read_task => break,
            _ = &mut write_task => break,

            _ = interval.tick() => {
                let last_seen = {
                    let users = state.users.lock().unwrap();
                    users.get(&session_id).map(|u| u.last_heartbeat).unwrap_or(now)
                };
            
                if last_seen.elapsed() > Duration::from_secs(60) {
                    println!("User {} timed out. Dropping Connection.", session_id);
                    broadcast_status_update(session_id, "offline", &state).await;
                    persist_status_to_db(session_id, "offline", &state).await;
                    break;
                }

                let ping = ServerEvent::Ping;
                let msg = Message::Text(serde_json::to_string(&ping).unwrap());
                let _ = user_info.tx.send(msg).await;
            }
        }
    }

    disconnect(session_id, state).await;
}

fn perform_leave_room(room_name: &str, user_id: Uuid, state: &AppState) {
    let mut rooms = state.rooms.lock().unwrap();
    if let Some(members) = rooms.get_mut(room_name) {
        members.remove(&user_id);
        
        if members.is_empty() {
            rooms.remove(room_name);
            println!("Room {} was empty and has been removed", room_name);
        } else {
            println!("Room {} now has {} users", room_name, members.len());
        }
    }
}

pub async fn read(mut reciever: SplitStream<WebSocket>, tx: mpsc::Sender<Message>, user_id: Uuid, state: AppState) {
    while let Some(msg) = reciever.next().await {
        if let Ok(msg) = msg {
            if let Ok(text) = msg.to_text() {
                match serde_json::from_str::<ClientEvent>(text) {
                    Ok(event) => {
                        handle_client_event(event, state.clone(), user_id, tx.clone()).await;
                    }
                    Err(e) => {
                        println!("Failed to parse JSON from {}: {} \nRaw text: {}", user_id, e, text);
                    }
                }
            }
        } else {
            break;
        }
    }
    println!("Client {} disconnected (read task)", user_id);
}

pub async fn write(mut sender: SplitSink<WebSocket, Message>, mut rx: mpsc::Receiver<Message>, user_id: Uuid) {
    while let Some(msg) = rx.recv().await {
        if sender.send(msg).await.is_err() {
            break;
        }
    }
    println!("Client {} disconnected (write task)", user_id);
}

pub async fn disconnect(user_id: Uuid, state: AppState) {
    println!("Cleaning up session for {}: ", user_id);

    broadcast_status_update(user_id, "offline", &state).await;

    let user_rooms = {
        let mut users = state.users.lock().unwrap();
        users.remove(&user_id).map(|u| u.rooms).unwrap_or_default()
    };
    
    {
        let mut subs = state.profile_subscribers.lock().unwrap();
        for subscribers in subs.values_mut() {
            subscribers.remove(&user_id);
        }
    }

    for room in user_rooms {
        perform_leave_room(&room, user_id, &state);
        broadcast_room_update(&room, &state).await;
    }

    let count = state.users.lock().unwrap().len();
    println!("User {} left. \nOnline users: {}", user_id, count);
}
