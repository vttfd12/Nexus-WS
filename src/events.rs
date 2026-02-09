use serde::{Deserialize, Serialize};
use uuid::Uuid;
use crate::state::{ RoomUser, RoomMessage};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type", content = "payload", rename_all = "snake_case")]
pub enum ClientEvent {
    JoinRoom(String),
    SendMessage(String),
    LeaveRoom(String),
    ChangeDisplayname{ #[serde(rename = "displayName")] display_name: String },
    PrivateMessage{ payload: String, target_username: String },
    ServerBroadcast{ payload: String },
    RoomBroadcast{ payload: String, room_name: String },
    GetUsernameFromDisplayname(String),
    Pong,
    GetRoomList,
    GetRoomUsers(String),
    UpdateStatus(String),
    SubscribeToProfile { user_id: i32 },
    UnsubscribeFromProfile { user_id: i32 },
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RoomListEntry {
    pub name: String,
    pub count: usize,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ServerEvent{
    IdentityAnnounced{ payload: String },
    SendMessage { 
        payload: String, 
        from_id: Uuid, 
        from_username: String, 
        from_display_name: String,
        created_at: String,
        edited_at: Option<String>
    }, 
    RoomUpdate{ room_name: String, users: Vec<RoomUser> },
    PrivateMessage { 
        from_id: Uuid,
        from_username: String, 
        from_display_name: String,
        payload: String,
        created_at: String,
        edited_at: Option<String>
    },
    Error{ code: String, message: String },
    DisplaynameChanged{ old: String, new: String },
    UserJoined{ room_name: String, username: String },
    UserLeft{ room_name: String, username: String },
    RoomList{rooms: Vec<RoomListEntry>},
    UserStatusChanged{ username: String, status: String },
    LoadRoomMessages{ room_name: String, messages: Vec<RoomMessage> },
    UserStatusUpdate { status: String },
    RecieveUsername{username: String},
    Ping,
}