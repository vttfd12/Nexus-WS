use std::collections::{HashMap, HashSet};
use std::time::Instant;
use std::sync::{Arc, Mutex};
use uuid::Uuid;
use serde::{Deserialize, Serialize};
use tokio::sync::{mpsc, broadcast};

#[derive(Clone)]
pub struct UserInfo {
    pub session_id: Uuid,
    pub db_user_id: i32,
    pub username: String,
    pub display_name: String,
    pub avatar_url: Option<String>,
    pub status: String,
    pub rooms: HashSet<String>,
    pub _joined_at: Instant,
    pub last_heartbeat: Instant,
    pub tx: mpsc::Sender<axum::extract::ws::Message>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RoomUser {
    pub username: String,
    pub display_name: String,
    pub avatar_url: Option<String>,
    pub status: String,
}

#[derive(Clone)]
pub struct AppState {
    pub users: Arc<Mutex<HashMap<Uuid, UserInfo>>>,
    pub rooms: Arc<Mutex<HashMap<String, HashSet<Uuid>>>>,
    pub profile_subscribers: Arc<Mutex<HashMap<i32, HashSet<Uuid>>>>, 

    pub _tx: broadcast::Sender<String>,
    pub http_client: reqwest::Client,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct MessageAuthor {
    pub id: i32,
    pub username: String,
    pub display_name: String,
    pub avatar_url: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RoomMessage{
    pub id: i32,
    pub content: String,
    pub created_at: String,
    pub edited_at: Option<String>,
    pub message_type: String, //Text, System, etc.
    pub user: MessageAuthor,
}