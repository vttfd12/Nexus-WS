# My WebSocket Project

A production-grade, full-featured WebSocket server implementation using Rust (Axum) for the real-time core and Node.js (Express) for the API and frontend. This project aims to provide a Socket.io-like experience with event-based messaging, rooms/channels, and robust session management.

## 🚀 Key Features

### Core Infrastructure (Implemented ✅)
- **High-Performance Backend**: Built with Rust and Axum for scalable WebSocket handling.
- **REST API Subsystem**: Node.js/Express server for user authentication and data persistence.
- **Persistent Storage**: PostgreSQL database integrated via Prisma ORM.
- **Real-time Messaging**: Event-based JSON protocol with support for rooms and private messaging.
- **State Management**: Shared in-memory state in Rust with database synchronization.
- **Secure Authentication**: Session-based login with password hashing (Bcrypt).
- **Rich UI**: Mobile-responsive chat interface with "bubbled" messages, user lists, and real-time status indicators.
- **Presence System**: Real-time online/away/busy/offline status syncing across clients.

### Planned Enhancements (Roadmap 🛠️)
- **Interaction Panels**: Context menus for mentions, direct messages, and profile views.
- **Message History**: Pagination and scroll restoration for loading older messages.
- **Advanced Security**: JWT integration and identifier-based rate limiting.
- **Message Features**: Editing/deleting messages, reactions, replies (threading), and file sharing.
- **Scalability**: Redis Pub/Sub for horizontal scaling and MessagePack for binary protocol support.

## 📂 Project Structure

- `/src`: Rust backend source code (Axum WebSocket server).  
- `/websocket_client`: Node.js API and Frontend application.
  - `/public`: Frontend assets (HTML, CSS, JS).
  - `/prisma`: Database schema and migrations.
  - `server.js`: Express server and API endpoints.
- `/certs`: SSL/TLS certificates for HTTPS/WSS.

## 🛠️ Prerequisites

- **Rust**: Latest stable version (Edition 2024).
- **Node.js**: LTS version.
- **PostgreSQL**: Running instance for data storage. (default port)

## 🚀 Getting Started

### 1. Generate SSL/TLS Certificates
This project uses HTTPS/WSS. Generate self-signed certificates for local development:
```bash
cargo run --bin gen_certs
```

### 2. Setup the Database
Navigate to the `websocket_client` directory and set up the database using Prisma:
```bash
cd websocket_client
npm install
npx prisma migrate dev
```

### 2. Run the Node.js API/Frontend
From the `websocket_client` directory:
```bash
npm start
```
The server will be running on `https://localhost:443`.

### 3. Run the Rust WebSocket Server
From the root directory:
```bash
cargo run --bin my_websocket
```
The WebSocket server will be running on `https://127.0.0.1:3000`.

> [!IMPORTANT]
> **Self-Signed Certificates (Development)**:
> Since the servers use self-signed certificates in development, you may need to manually visit `https://127.0.0.1:3000/ws` (or simply `https://localhost:3000`) in your browser and select "Advanced" -> "Proceed anyway" to accept the certificate. Without this, the WebSocket connection from the frontend will likely fail.

## 📝 Documentation
Note: For detailed development progress and production requirements, refer to the internal `/websocket_client/todo.txt`
