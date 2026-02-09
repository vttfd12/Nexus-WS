export class SocketManager {
    constructor(ui) {
        this.ui = ui;
        this.socket = null;
        this.timeoutId = null;
        this.lastPingTime = Date.now();

        this.connect();
    }


    connect() {
        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
            return;
        }

        const tokenMatch = document.cookie.match(/session_token=([^;]+)/);
        const token = tokenMatch ? tokenMatch[1] : '';

        this.socket = new WebSocket(`wss://127.0.0.1:3000/ws?token=${token}`);

        this.socket.onopen = () => {
            console.log("Connected to WSS Server");
            this.createTimer();
            this.ui.changeMyStatus('online');
            this.status = 'online';

        };

        this.socket.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                this.handleServerEvent(payload);
            } catch (e) {
                console.error("Failed to parse server message:", event.data, e);
            }
        };

        this.socket.onerror = (error) => {
            console.error("WSS Error:", error);
        };

        this.socket.onclose = () => {
            console.log("WSS Connection Closed");
            this.status = 'offline';
            this.ui.changeMyStatus('offline');
        };
    }

    send(message) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(message);
        }
    }

    createTimer() {
        // Clear any existing timer first
        if (this.timeoutId) {
            clearInterval(this.timeoutId);
        }
        // Check connection health every 60 seconds
        this.timeoutId = setInterval(() => {
            this.keepAlive();
        }, 60000);
    }

    handleServerEvent(payload) {
        switch (payload.type) {
            case 'identity_announced':
                this.ui.myId = payload.payload;
                break;
            case 'private_message':
                this.ui.addPrivateMessage(payload.from_username, payload.payload);
                break;
            case 'send_message':
                const isOwnMessage = payload.from_id === this.ui.myId;
                this.ui.addMessage(payload.payload, isOwnMessage, payload.from_display_name, payload.created_at, payload.edited_at);
                break;
            case 'error':
                this.ui.showError(payload.code, payload.message);
                break;
            case 'room_update':
                this.ui.updateRoom(payload.room_name, payload.users);
                break;
            case 'user_joined':
                if (payload.username === this.ui.myUsername) {
                    this.ui.closeFriendPanel();
                    this.ui.showChatBox();
                }
                this.ui.addUser(payload.room_name, payload.username);
                break;
            case 'user_left':
                this.ui.removeUser(payload.room_name, payload.username);
                break;
            case 'displayname_changed':
                this.ui.changeUsername(payload.old, payload.new);
                break;
            case 'room_list':
                this.ui.updateRoomList(payload.rooms);
                break;
            case 'user_status_changed':
                console.log(false);

                this.ui.updateUserStatus(payload.username, payload.status);
                break;
            case 'ping':
                this.lastPingTime = Date.now();
                this.send(JSON.stringify({ type: 'pong' }));
                break;
            case 'load_room_messages':
                this.ui.loadRoomMessages(payload.room_name, payload.messages);
                break;
            case 'user_status_update':
                console.log('true')
                this.ui.refreshProfileStatus(payload.status);
                break;
            case 'recieve_username':
                this.ui.handler.gotoProfileLink(payload.username);
                break;
        }
    }




    keepAlive() {
        const timeSinceLastPing = Date.now() - this.lastPingTime;
        if (timeSinceLastPing > 70000) { // 70 seconds (10s grace period)
            // No ping received in over 70 seconds, consider offline
            this.ui.changeMyStatus('offline');
            this.status = 'offline';
            // Clear the timer
            if (this.timeoutId) {
                clearInterval(this.timeoutId);
                this.timeoutId = null;
            }
        }
    }


} 