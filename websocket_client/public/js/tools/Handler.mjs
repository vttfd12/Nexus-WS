import { SocketManager } from './SocketManager.mjs';
export class Handler {
    constructor(ui) {
        this.ui = ui;
        this.socketManager = new SocketManager(this.ui);
    }

    handleThemeChange(theme) {
        this.ui.changeTheme(theme);
        this.ui.applyTheme();
    }

    handleUserIconClick(e) {

        if (this.ui.isUserPanelOpen) {
            this.ui.closeUserPanel();
        } else {
            this.handleUserStatusClick(e);
        }

    }

    handleUserIconRightClick(e, target) {
        e.preventDefault();

        if (this.ui.isUserPanelOpen && this.ui.currentTarget === target) {
            this.ui.closeUserPanel()
        } else if (this.ui.isUserPanelOpen) {
            this.ui.closeUserPanel()
            this.ui.openUserPanel(target);
        } else {
            this.ui.openUserPanel(target);
        }
    }

    handleOtherUserIconClick(display_name) {
        this.requestProfileLink(display_name)
    }
    handleOtherUserIconRightClick(e, target) {
        e.preventDefault();
        if (this.ui.isUserPanelOpen && this.ui.currentTarget === target) {
            this.ui.closeUserPanel()
        } else if (this.ui.isUserPanelOpen) {
            this.ui.closeUserPanel()
            this.ui.openOtherUserPanel(target);
        } else {
            this.ui.openOtherUserPanel(target);
        }

    }

    handleMessageKeydown(e, target) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            this.handleSendButton()
        }
    }


    handleNavButtonClick(buttonName) {
        const id = buttonName;

        let disabled = document.querySelector('.nav-button.disabled');
        if (disabled) {
            const oldId = disabled.id.replace('-button', '');
            this.ui.enableButton(oldId);
        }

        this.ui.disableButton(id);
        this.#fetchPage(id);
    }

    handleInputFocus(input) {

        if (this.ui.isUserPanelOpen) this.ui.closeUserPanel();

        input.style.border = `2px solid ${this.ui.activeInputBorderColor}`;
        input.style.boxShadow = `0 0 0 2px ${this.ui.activeInputBorderColor}`;
    }

    handleInputBlur(input) {
        input.style.border = `2px solid ${this.ui.nonActiveInputBorderColor}`;
        input.style.boxShadow = `none`;
    }


    handleMentionButton(target) {
        let copy = this.ui.messageInput.value;
        //I wish queryselector worked for this :(
        let userToMention;
        for (const child of target.children) {
            if (child.tagName === "SPAN") {
                userToMention = child.textContent;
                break;
            }
        }

        this.ui.messageInput.focus();
        this.ui.messageInput.value = `@${userToMention} ${copy}`;
    }


    sendSubscribe(user_id) {
        this.socketManager.send(JSON.stringify({ type: "subscribe_to_profile", payload: { user_id: parseInt(user_id) } }));
    }

    sendUnsubscribe(user_id) {
        this.socketManager.send(JSON.stringify({ type: "unsubscribe_from_profile", payload: { user_id: parseInt(user_id) } }));
    }

    sendUpdateDisplayName(parentEl, displayName) {
        let child = document.querySelector('.username-edit-container');
        if (child && parentEl.contains(child)) {
            parentEl.removeChild(child);
        }
        this.socketManager.send(JSON.stringify({ type: "change_displayname", payload: { "displayName": `${displayName}` } }));
    }

    handleUserStatusClick(e) {
        if (this.ui.statusCircle.classList.contains('offline')) {
            return;
        }


        if (this.ui.statusCircle.classList.contains('online')) {
            this.socketManager.send(JSON.stringify({ type: "update_status", payload: "away" }));
            this.ui.changeMyStatus('away');
        } else {
            this.socketManager.send(JSON.stringify({ type: "update_status", payload: "online" }));
            this.ui.changeMyStatus('online');
        }
    }

    handleJoinRoom(roomName) {
        let message = {
            "type": "join_room",
            "payload": roomName
        }
        this.socketManager.send(JSON.stringify(message));
    }

    leaveRoom(currentRoom) {
        this.socketManager.send(JSON.stringify({ type: "leave_room", payload: currentRoom }))
        this.ui.currentRoom = "";
        this.ui.hideChatBox();
        this.ui.removeRoomList();
        this.ui.switchTab("friends");
        this.ui.firstTimePanel = true;
        this.ui.openFriendPanel();
    }

    handleSendButton() {
        //Check for if in room for room_broadcast/private_message
        let message = this.ui.messageInput.value;
        if (message === "")
            return this.ui.showGlobalError("Message cannot be blank!");

        //Not checking ^ so i will just default to room_broadcast for now 
        this.socketManager.send(JSON.stringify({
            type: "room_broadcast",
            payload: {
                payload: message,
                room_name: this.ui.currentRoom
            }
        }));
        this.ui.messageInput.value = "";
        const myDisplayName = document.querySelector('#display-name')?.textContent || 'You';
        this.ui.addMessage(message, true, myDisplayName, new Date().toISOString());

    }

    requestProfileLink(display_name) {
        this.socketManager.send(JSON.stringify({ type: "get_username_from_displayname", payload: `${display_name}` }))
    }

    gotoProfileLink(username) {
        window.location.href = `/profile/${username}`;
    }


    getRoomList() {
        if (this.socketManager.status !== 'online') return;
        this.socketManager.send(JSON.stringify({ type: 'get_room_list', payload: null }));
    }

    handleThemeOptionChange(event) {
        const theme = event.target.value;
        localStorage.setItem("theme", theme)
        this.ui.setThemeOption(theme);
    }

    #fetchPage(button) {
        let url = '';
        switch (button) {
            case 'home': url = '/home/'; break;
            case 'chat': url = '/chat/'; break;
            case 'about': url = '/about/'; break;
            case 'contact': url = '/contact/'; break;
            default:
                console.error('Invalid button name');
                return;
        }
        window.location.href = url;
    }


}