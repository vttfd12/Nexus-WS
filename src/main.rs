use axum::{
    extract::{ws::WebSocketUpgrade, State},
    response::Response,
    routing::any,
    Router,
};
use std::path::PathBuf;
use axum_server::Handle;
use std::time::Duration;
use axum_server::tls_rustls::RustlsConfig;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::sync::broadcast;

use my_websocket::state::AppState;
mod ws;
use crate::ws::handle_socket;

async fn handler(
    ws: WebSocketUpgrade, 
    State(state): State<AppState>,
    axum::extract::Query(params): axum::extract::Query<HashMap<String, String>>,
) -> Response {
    let token = params.get("token").cloned().unwrap_or_default();
    ws.on_upgrade(move |socket| handle_socket(socket, state, token))
}

#[tokio::main]
async fn main() {
    rustls::crypto::ring::default_provider().install_default().expect("Failed to install rustls crypto provider");

    let users = Arc::new(Mutex::new(HashMap::new()));
    let rooms = Arc::new(Mutex::new(HashMap::new()));
    let (tx, _rx) = broadcast::channel(100);
    let state = AppState {
        users,
        rooms,
        profile_subscribers: Arc::new(Mutex::new(HashMap::new())),
        _tx: tx,
        http_client: reqwest::Client::builder()
            .danger_accept_invalid_certs(true)
            .build()
            .unwrap(),
    };

    let app = Router::new()
        .route("/ws", any(handler)) 
        .with_state(state);   

    let config = RustlsConfig::from_pem_file(
        PathBuf::from("certs/cert.pem"),
        PathBuf::from("certs/key.pem"),
    )
    .await
    .unwrap();

    let handle = Handle::new();
    let shutdown_handle = handle.clone();
    tokio::spawn(async move {
        shutdown_signal().await;
        shutdown_handle.graceful_shutdown(Some(Duration::from_secs(30)));
    });

    let addr = "127.0.0.1:3000".parse().unwrap();
    println!("Server running at https://{}", addr);

    axum_server::bind_rustls(addr, config)
        .handle(handle)
        .serve(app.into_make_service())
        .await
        .unwrap();
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
    println!("Signal received, starting graceful shutdown...");
}
