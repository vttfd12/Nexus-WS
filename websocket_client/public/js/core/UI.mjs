import { Handler } from '../tools/Handler.mjs';

export class UI {
    constructor(url) {
        this.whereAmI = url;
        this.handler = new Handler(this);
        this.homeButton = document.getElementById('home-button');
        this.chatButton = document.getElementById('chat-button');
        this.aboutButton = document.getElementById('about-button');
        this.contactButton = document.getElementById('contact-button');
        this.navBar = document.getElementById('navigation-bar');
        this.themeSelector = document.getElementById('theme-selector');

        const isChat = this.whereAmI === "/chat";
        this.isChat = isChat;

        if (isChat) {
            this.mainContent = document.getElementById('main-content');
            this.messageInput = document.getElementById('message-input');
            this.messageInput.value = "";
            this.sendButton = document.getElementById('send-button');
            this.chatWindow = document.getElementById('chat-window');
            this.bottomContainer = document.getElementById('bottom-container');
            this.friendPanel = document.getElementById('friend-panel');
            this.roomNameInput = document.getElementById('room-name-input');
            this.roomNameInput.value = "";
            this.joinRoomButton = document.getElementById('join-room-button');
            this.roomSelectionArea = document.getElementById('room-selection');
            this.userListContainer = document.getElementById('user-list-container');
            this.friendsTab = document.getElementById('friends-tab');
            this.roomsTab = document.getElementById('rooms-tab');
            this.friendsView = document.getElementById('friends-view');
            this.roomsView = document.getElementById('rooms-view');
            this.firstTimePanel = true;
            this.roomListContainer = document.getElementById('room-list-container');
            this.roomMembersSidebar = document.getElementById('room-members-sidebar');
            this.friendsSearchInput = document.getElementById('friends-search-input');
            this.isUserPanelOpen = false;
            this.alertContainer = document.getElementById('global-alert-container');
            this.userConnectionStatus = document.getElementById('user-connection-status');
            this.statusCircle = document.querySelector('#user-status .status-circle');
            this.userStatus = document.getElementById('user-status');
            this.friendsPanel = document.getElementById('friend-panel');
            this.profileIconContainer = document.getElementById('user-profile-icon-container');
            this.profileIcon = document.getElementById('user-profile-icon');
        }

        this.changeTheme('main-dark-theme');
        this.applyTheme();
        this.#addEventListeners();
        if (isChat) {
            this.switchTab("rooms")
            this.hideChatBox();
        }

        this.currentUser = null;
        this.myId = null;
        this.currentRoom = null;
        this.rooms = [];
    }

    setUserInfo(user) {
        this.currentUser = user;
        this.myId = user.id;
        this.myUsername = user.username;
        if (this.profileIcon && user.avatarUrl) {
            this.profileIcon.src = user.avatarUrl;
        }
    }

    handleProfileClick() {
        if (this.currentUser && this.currentUser.username) {
            window.location.href = `/profile/${this.currentUser.username}`;
        }
    }

    //open user panel if right-clicked on different user
    openOtherUserPanel(target) {
        if (this.userPanel) this.closeUserPanel();
        this.userPanel = null;

        let targetRect = target.getBoundingClientRect();
        let targetWidth = target.clientWidth;
        let targetX = targetRect.left + (targetWidth / 3);
        let targetY = targetRect.bottom;



        this.userPanel = document.createElement("div");
        this.userPanel.id = "user-panel";
        // this.userPanel.style.width = (targetWidth * 2 / 3);
        this.userPanel.style.width = '130px';
        this.userPanel.style.height = '100px';
        this.userPanel.style.left = `${targetX - (targetWidth / 3) + 100}px`;
        this.userPanel.style.top = `${targetY}px`;

        let mention = document.createElement("span");
        let directMessage = document.createElement("span");
        let muteUser = document.createElement("span");
        let viewProfile = document.createElement("span");

        mention.innerText = "@Mention";
        directMessage.innerText = "Private Message";
        muteUser.innerText = "Mute User";
        viewProfile.innerText = "View Profile";

        mention.style.height = `${100 / 4}px`;
        directMessage.style.height = `${100 / 4}px`;
        muteUser.style.height = `${100 / 4}px`;
        viewProfile.style.height = `${100 / 4}px`;

        mention.style.width = "130px";
        directMessage.style.width = "130px";
        muteUser.style.width = "130px";
        viewProfile.style.width = "130px";

        mention.style.display = "block";
        directMessage.style.display = "block";
        muteUser.style.display = "block";
        viewProfile.style.display = "block";

        mention.style.borderBottom = `1px solid ${this.nonActiveInputBorderColor}`;
        directMessage.style.borderBottom = `1px solid ${this.nonActiveInputBorderColor}`;
        muteUser.style.borderBottom = `1px solid ${this.nonActiveInputBorderColor}`;

        mention.style.cursor = "pointer";
        directMessage.style.cursor = "pointer";
        muteUser.style.cursor = "pointer";
        viewProfile.style.cursor = "pointer";

        mention.classList.add('user-panel-option');
        directMessage.classList.add('user-panel-option');
        muteUser.classList.add('user-panel-option');
        viewProfile.classList.add('user-panel-option');

        let target_displayname = target.innerText;
        mention.addEventListener('click', () => this.handler.handleMentionButton(target));
        // directMessage.addEventListener('click', () => this.handler.handlePrivateMessageButton(target));
        // muteUser.addEventListener('click', () => this.handler.handleMuteButton(target));
        viewProfile.addEventListener('click', () => this.handler.requestProfileLink(target_displayname));

        this.userPanel.appendChild(mention);
        this.userPanel.appendChild(directMessage);
        this.userPanel.appendChild(muteUser);
        this.userPanel.appendChild(viewProfile);
        document.body.appendChild(this.userPanel);
        this.isUserPanelOpen = true;
        this.currentTarget = target;


    }
    //open user panel if right-clicked on same user
    openUserPanel(target) {

        if (this.userPanel) this.closeUserPanel();
        this.userPanel = null;

        let targetRect = target.getBoundingClientRect();
        let targetWidth = target.clientWidth;
        let targetX = targetRect.left + (targetWidth / 3);
        let targetY = targetRect.bottom;

        this.userPanel = document.createElement("div");
        this.userPanel.id = "user-panel";
        // this.userPanel.style.width = (targetWidth * 2 / 3);
        this.userPanel.style.width = '130px';
        this.userPanel.style.height = '75px';
        this.userPanel.style.left = `${targetX - (targetWidth / 3) + 100}px`;
        this.userPanel.style.top = `${targetY}px`;



        document.body.appendChild(this.userPanel);
        this.isUserPanelOpen = true;
        this.currentTarget = target;


    }

    closeUserPanel() {
        let userPanel = document.getElementById('user-panel');

        if (userPanel) {
            document.body.removeChild(userPanel);
            this.isUserPanelOpen = false;
            return;
        }
    }


    hideChatBox() {
        if (this.mainContent && this.chatWindow && this.bottomContainer) {
            if (this.mainContent.contains(this.chatWindow)) this.mainContent.removeChild(this.chatWindow);
            if (this.mainContent.contains(this.bottomContainer)) this.mainContent.removeChild(this.bottomContainer);
        }
        if (this.roomMembersSidebar) this.roomMembersSidebar.classList.add('hidden');
    }

    showChatBox() {
        if (this.mainContent && this.chatWindow && this.bottomContainer) {
            this.mainContent.appendChild(this.chatWindow);
            this.mainContent.appendChild(this.bottomContainer);
        }
    }

    animatePanel(targetWidth, targetOpacity, targetTranslate, duration) {
        if (this.panelAnimationId) cancelAnimationFrame(this.panelAnimationId);

        const startTime = performance.now();
        const style = getComputedStyle(this.friendPanel);
        const startWidth = this.friendPanel.offsetWidth;
        const startOpacity = parseFloat(style.opacity) || 0;

        let startTranslate = 0;
        if (style.transform && style.transform !== 'none') {
            const matrix = new DOMMatrixReadOnly(style.transform);
            startTranslate = matrix.m41;
        }

        let targetWidthVal;
        if (typeof targetWidth === 'string') {
            const temp = document.createElement('div');
            temp.style.width = targetWidth;
            temp.style.visibility = 'hidden';
            temp.style.position = 'absolute';
            document.body.appendChild(temp);
            targetWidthVal = temp.offsetWidth;
            document.body.removeChild(temp);
        } else {
            targetWidthVal = targetWidth;
        }

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);

            this.friendPanel.style.width = `${startWidth + (targetWidthVal - startWidth) * ease}px`;
            this.friendPanel.style.opacity = startOpacity + (targetOpacity - startOpacity) * ease;
            this.friendPanel.style.transform = `translateX(${startTranslate + (targetTranslate - startTranslate) * ease}px)`;

            if (progress < 1) {
                this.panelAnimationId = requestAnimationFrame(animate);
            } else {
                this.panelAnimationId = null;
            }
        };

        this.panelAnimationId = requestAnimationFrame(animate);
    }

    removeRoomList() {
        let roomContainer = document.querySelector('.room-container');
        let userList = document.querySelector('.user-list');
        let header = document.querySelector('.room-sidebar-header');

        if (roomContainer) this.userListContainer.removeChild(roomContainer);
        if (userList) this.userListContainer.removeChild(userList);
        if (header) this.userListContainer.removeChild(header);

    }

    toggleFriendPanel() {
        if (!this.isChat) return;

        const currentOpacity = parseFloat(getComputedStyle(this.friendPanel).opacity);
        const currentWidth = this.friendPanel.offsetWidth;
        const isVisible = currentOpacity > 0.5;
        const isWide = currentWidth > 600;

        if (this.firstTimePanel) {
            this.openFriendPanel();
            this.firstTimePanel = false;
        } else if (!isVisible) {
            this.closeFriendPanel();
        } else if (isWide) {
            this.closeFriendPanel();
        } else {
            this.hideFriendPanel();
        }
    }

    openFriendPanel() {
        if (!this.isChat) return;
        this.animatePanel('calc(100vw - 14rem)', 1, 0, 800);
        if (this.mainContent) this.mainContent.classList.add('right-panel-open');
    }

    closeFriendPanel() {
        if (!this.isChat) return;
        this.animatePanel('clamp(300px, 25vw, 500px)', 1, 0, 500);
        if (this.mainContent) this.mainContent.classList.add('right-panel-open');
    }

    hideFriendPanel() {
        if (!this.isChat) return;
        const targetTranslate = Math.max(this.friendPanel.offsetWidth, window.innerWidth / 2);
        this.animatePanel('clamp(300px, 25vw, 500px)', 0, targetTranslate, 500);
        if (this.mainContent) this.mainContent.classList.remove('right-panel-open');
    }

    changeTheme(theme) {
        switch (theme) {
            case 'main-light-theme':
                this.selectorColor = '#007AFF';
                this.optionsColor = '#007AFF';
                this.buttonColor = '#007AFF';
                this.buttonTextColor = '#FFFFFF';
                this.buttonHoverColor = '#0056B3';
                this.buttonDisabledColor = '#B3D7FF';
                this.backgroundColor = '#FFFFFF';
                this.navBarColor = '#F5F7FA';
                this.textColor = '#1A1A1A';
                this.accentColor = '#FF3B30';
                this.inputBackgroundColor = '#FFFFFF';
                this.nonActiveInputBorderColor = '#646464';
                this.messageInputColor = '#1A1A1A';
                this.sendButtonColor = '#007AFF';
                this.friendsPanelColor = this.navBarColor;
                this.chatWindowColor = '#E8ECF0';
                this.activeInputBorderColor = '#007AFF';
                this.userMessageBgColor = '#007AFF';
                this.userMessageTextColor = '#FFFFFF';
                this.otherMessageBgColor = '#D1D5DB';
                this.otherMessageTextColor = '#1A1A1A';
                this.leaveButtonColor = 'rgba(255, 69, 58, 0.8)';
                break;
            case 'main-dark-theme':
                this.selectorColor = '#BB86FC';
                this.optionsColor = '#BB86FC';
                this.buttonColor = '#BB86FC';
                this.buttonTextColor = '#000000';
                this.buttonHoverColor = '#9965F4';
                this.buttonDisabledColor = '#3D2D52';
                this.backgroundColor = '#121212';
                this.navBarColor = '#1E1E1E';
                this.textColor = '#E1E1E1';
                this.accentColor = '#03DAC6';
                this.inputBackgroundColor = '#121212';
                this.nonActiveInputBorderColor = '#E4E7EB';
                this.messageInputColor = '#E1E1E1';
                this.sendButtonColor = '#BB86FC';
                this.chatWindowColor = '#ffffff15';
                this.friendsPanelColor = this.navBarColor;
                this.activeInputBorderColor = '#BB86FC';
                this.userMessageBgColor = '#BB86FC';
                this.userMessageTextColor = '#000000';
                this.otherMessageBgColor = '#2D2D2D';
                this.otherMessageTextColor = '#E1E1E1';
                this.leaveButtonColor = 'rgba(255, 69, 58, 0.8)';
                break;
            case 'muted-theme':
                this.selectorColor = '#4A6741';
                this.optionsColor = '#4A6741';
                this.buttonColor = '#4A6741';
                this.buttonTextColor = '#FDFCF8';
                this.buttonHoverColor = '#385032';
                this.buttonDisabledColor = '#A3B19E';
                this.backgroundColor = '#FDFCF8';
                this.navBarColor = '#E9EAD8';
                this.textColor = '#2C2C2C';
                this.accentColor = '#D4A373';
                this.inputBackgroundColor = '#FDFCF8';
                this.nonActiveInputBorderColor = '#818385';
                this.messageInputColor = '#2C2C2C';
                this.sendButtonColor = '#4A6741';
                this.chatWindowColor = '#DDE0CC';
                this.friendsPanelColor = this.navBarColor;
                this.activeInputBorderColor = '#4A6741';
                this.userMessageBgColor = '#4A6741';
                this.userMessageTextColor = '#FDFCF8';
                this.otherMessageBgColor = '#C8CBBA';
                this.otherMessageTextColor = '#2C2C2C';
                this.leaveButtonColor = 'rgba(255, 69, 58, 0.8)';
                break;
            case 'ocean-theme':
                this.selectorColor = '#00ACC1';
                this.optionsColor = '#00ACC1';
                this.buttonColor = '#00ACC1';
                this.buttonTextColor = '#FFFFFF';
                this.buttonHoverColor = '#00838F';
                this.buttonDisabledColor = '#80D6E0';
                this.backgroundColor = '#0D1B2A';
                this.navBarColor = '#1B263B';
                this.textColor = '#E0F7FA';
                this.accentColor = '#26C6DA';
                this.inputBackgroundColor = '#0D1B2A';
                this.nonActiveInputBorderColor = '#415A77';
                this.messageInputColor = '#E0F7FA';
                this.sendButtonColor = '#00ACC1';
                this.chatWindowColor = '#E0F7FA15';
                this.friendsPanelColor = this.navBarColor;
                this.activeInputBorderColor = '#00ACC1';
                this.userMessageBgColor = '#00ACC1';
                this.userMessageTextColor = '#FFFFFF';
                this.otherMessageBgColor = '#1B3A4B';
                this.otherMessageTextColor = '#E0F7FA';
                this.leaveButtonColor = 'rgba(255, 69, 58, 0.8)';
                break;
            case 'sunset-theme':
                this.selectorColor = '#FF6B35';
                this.optionsColor = '#FF6B35';
                this.buttonColor = '#FF6B35';
                this.buttonTextColor = '#FFF8F0';
                this.buttonHoverColor = '#E85D2C';
                this.buttonDisabledColor = '#FFB59A';
                this.backgroundColor = '#2D1B2A';
                this.navBarColor = '#3D2B38';
                this.textColor = '#FFF8F0';
                this.accentColor = '#FFD23F';
                this.inputBackgroundColor = '#2D1B2A';
                this.nonActiveInputBorderColor = '#6B4E5A';
                this.messageInputColor = '#FFF8F0';
                this.sendButtonColor = '#FF6B35';
                this.chatWindowColor = '#FFF8F015';
                this.friendsPanelColor = this.navBarColor;
                this.activeInputBorderColor = '#FF6B35';
                this.userMessageBgColor = '#FF6B35';
                this.userMessageTextColor = '#FFF8F0';
                this.otherMessageBgColor = '#4D3B48';
                this.otherMessageTextColor = '#FFF8F0';
                this.leaveButtonColor = 'rgba(255, 69, 58, 0.8)';
                break;
            case 'forest-theme':
                this.selectorColor = '#2E7D32';
                this.optionsColor = '#2E7D32';
                this.buttonColor = '#2E7D32';
                this.buttonTextColor = '#E8F5E9';
                this.buttonHoverColor = '#1B5E20';
                this.buttonDisabledColor = '#81C784';
                this.backgroundColor = '#1A2F1A';
                this.navBarColor = '#263D26';
                this.textColor = '#E8F5E9';
                this.accentColor = '#A5D6A7';
                this.inputBackgroundColor = '#1A2F1A';
                this.nonActiveInputBorderColor = '#4A6B4A';
                this.messageInputColor = '#E8F5E9';
                this.sendButtonColor = '#2E7D32';
                this.chatWindowColor = '#E8F5E915';
                this.friendsPanelColor = this.navBarColor;
                this.activeInputBorderColor = '#2E7D32';
                this.userMessageBgColor = '#2E7D32';
                this.userMessageTextColor = '#E8F5E9';
                this.otherMessageBgColor = '#1E4D1E';
                this.otherMessageTextColor = '#E8F5E9';
                this.leaveButtonColor = 'rgba(255, 69, 58, 0.8)';
                break;
            case 'lavender-theme':
                this.selectorColor = '#9C27B0';
                this.optionsColor = '#9C27B0';
                this.buttonColor = '#9C27B0';
                this.buttonTextColor = '#FFFFFF';
                this.buttonHoverColor = '#7B1FA2';
                this.buttonDisabledColor = '#CE93D8';
                this.backgroundColor = '#F3E5F5';
                this.navBarColor = '#E1BEE7';
                this.textColor = '#4A148C';
                this.accentColor = '#E91E63';
                this.inputBackgroundColor = '#F3E5F5';
                this.nonActiveInputBorderColor = '#c976d8';
                this.messageInputColor = '#4A148C';
                this.sendButtonColor = '#9C27B0';
                this.chatWindowColor = '#D8BFE0';
                this.friendsPanelColor = this.navBarColor;
                this.activeInputBorderColor = '#9C27B0';
                this.userMessageBgColor = '#9C27B0';
                this.userMessageTextColor = '#FFFFFF';
                this.otherMessageBgColor = '#CE93D8';
                this.otherMessageTextColor = '#4A148C';
                this.leaveButtonColor = 'rgba(255, 69, 58, 0.8)';
                break;
            case 'midnight-theme':
                this.selectorColor = '#5C6BC0';
                this.optionsColor = '#5C6BC0';
                this.buttonColor = '#5C6BC0';
                this.buttonTextColor = '#FFFFFF';
                this.buttonHoverColor = '#3F51B5';
                this.buttonDisabledColor = '#9FA8DA';
                this.backgroundColor = '#0A0E1A';
                this.navBarColor = '#141B2D';
                this.textColor = '#E8EAF6';
                this.accentColor = '#FFD54F';
                this.inputBackgroundColor = '#0A0E1A';
                this.nonActiveInputBorderColor = '#3D5A80';
                this.messageInputColor = '#E8EAF6';
                this.sendButtonColor = '#5C6BC0';
                this.chatWindowColor = '#E8EAF615';
                this.friendsPanelColor = this.navBarColor;
                this.activeInputBorderColor = '#5C6BC0';
                this.userMessageBgColor = '#5C6BC0';
                this.userMessageTextColor = '#FFFFFF';
                this.otherMessageBgColor = '#1E2540';
                this.otherMessageTextColor = '#E8EAF6';
                this.leaveButtonColor = 'rgba(255, 69, 58, 0.8)';
                break;
            case 'coffee-theme':
                this.selectorColor = '#795548';
                this.optionsColor = '#795548';
                this.buttonColor = '#795548';
                this.buttonTextColor = '#FFF8E1';
                this.buttonHoverColor = '#5D4037';
                this.buttonDisabledColor = '#BCAAA4';
                this.backgroundColor = '#3E2723';
                this.navBarColor = '#4E342E';
                this.textColor = '#FFF8E1';
                this.accentColor = '#FFAB91';
                this.inputBackgroundColor = '#3E2723';
                this.nonActiveInputBorderColor = '#6D4C41';
                this.messageInputColor = '#FFF8E1';
                this.sendButtonColor = '#795548';
                this.chatWindowColor = '#FFF8E115';
                this.friendsPanelColor = this.navBarColor;
                this.activeInputBorderColor = '#795548';
                this.userMessageBgColor = '#795548';
                this.userMessageTextColor = '#FFF8E1';
                this.otherMessageBgColor = '#5D4037';
                this.otherMessageTextColor = '#FFF8E1';
                this.leaveButtonColor = 'rgba(255, 69, 58, 0.8)';
                break;
        }
    }

    setThemeOption(theme) {
        let title = document.title.toLocaleLowerCase();
        this.changeTheme(theme);
        if (this.themeSelector) {
            this.themeSelector.value = theme;
        }
        this.applyTheme();
        this.disableButton(title);
    }

    applyTheme() {
        const root = document.documentElement;

        root.style.setProperty('--bg-color', this.backgroundColor);
        root.style.setProperty('--text-color', this.textColor);
        root.style.setProperty('--nav-bar-color', this.navBarColor);
        root.style.setProperty('--accent-color', this.accentColor);
        root.style.setProperty('--button-color', this.buttonColor);
        root.style.setProperty('--button-text-color', this.buttonTextColor);
        root.style.setProperty('--button-hover-color', this.buttonHoverColor);
        root.style.setProperty('--button-disabled-color', this.buttonDisabledColor);
        root.style.setProperty('--input-bg-color', this.inputBackgroundColor);
        root.style.setProperty('--border-color', this.nonActiveInputBorderColor);
        root.style.setProperty('--active-border-color', this.activeInputBorderColor);

        document.body.style.backgroundColor = 'var(--bg-color)';
        document.body.style.color = 'var(--text-color)';

        if (this.themeSelector) {
            this.themeSelector.style.backgroundColor = 'var(--nav-bar-color)';
            this.themeSelector.style.color = 'var(--text-color)';
            this.themeSelector.style.width = 'fit-content';
            const options = this.themeSelector.getElementsByTagName('option');
            for (let opt of options) {
                opt.style.backgroundColor = 'var(--nav-bar-color)';
                opt.style.color = 'var(--text-color)';
            }
        }

        if (this.friendsTab && this.roomsTab) {
            const isFriendsActive = !this.friendsView.classList.contains('hidden');
            this.friendsTab.style.backgroundColor = isFriendsActive ? 'var(--button-color)' : 'rgba(255,255,255,0.1)';
            this.friendsTab.style.color = isFriendsActive ? 'var(--button-text-color)' : 'white';
            this.roomsTab.style.backgroundColor = !isFriendsActive ? 'var(--button-color)' : 'rgba(255,255,255,0.1)';
            this.roomsTab.style.color = !isFriendsActive ? 'var(--button-text-color)' : 'white';
        }

        if (this.homeButton) {
            this.homeButton.style.backgroundColor = 'var(--button-color)';
            this.homeButton.style.color = 'var(--button-text-color)';
        }
        if (this.chatButton) {
            this.chatButton.style.backgroundColor = 'var(--button-color)';
            this.chatButton.style.color = 'var(--button-text-color)';
        }
        if (this.aboutButton) {
            this.aboutButton.style.backgroundColor = 'var(--button-color)';
            this.aboutButton.style.color = 'var(--button-text-color)';
        }
        if (this.contactButton) {
            this.contactButton.style.backgroundColor = 'var(--button-color)';
            this.contactButton.style.color = 'var(--button-text-color)';
        }

        if (this.navBar) {
            this.navBar.style.backgroundColor = 'var(--nav-bar-color)';
        }




        if (this.isChat) {
            this.themeSelector.style.border = `2px solid ${this.nonActiveInputBorderColor}`;
            this.messageInput.style.border = `2px solid ${this.nonActiveInputBorderColor}`;
            if (this.friendsTab.classList.contains('active')) {
                this.roomsTab.style.backgroundColor = this.buttonDisabledColor;
                this.friendsTab.style.backgroundColor = this.buttonColor;
            }
            else {
                this.friendsTab.style.backgroundColor = this.buttonDisabledColor;
                this.roomsTab.style.backgroundColor = this.buttonColor;
            }

            this.chatWindow.style.backgroundColor = this.chatWindowColor;
            this.messageInput.style.backgroundColor = this.inputBackgroundColor;
            this.messageInput.style.color = this.messageInputColor;
            this.sendButton.style.backgroundColor = this.sendButtonColor;
            this.sendButton.style.color = this.buttonTextColor;
            this.friendsPanel.style.backgroundColor = this.friendsPanelColor;

            if (this.joinRoomButton) {
                this.joinRoomButton.style.backgroundColor = this.buttonColor;
                this.joinRoomButton.style.color = this.buttonTextColor;
            }

            if (this.roomNameInput) {
                this.roomNameInput.style.backgroundColor = this.inputBackgroundColor;
                this.roomNameInput.style.color = this.textColor;
                this.roomNameInput.style.border = `1px solid ${this.nonActiveInputBorderColor}`;
            }

            const ownMessages = this.chatWindow.querySelectorAll('.own-message');
            const otherMessages = this.chatWindow.querySelectorAll('.other-message');

            ownMessages.forEach(msg => {
                msg.style.backgroundColor = this.userMessageBgColor;
                msg.style.color = this.userMessageTextColor;
            });

            otherMessages.forEach(msg => {
                msg.style.backgroundColor = this.otherMessageBgColor;
                msg.style.color = this.otherMessageTextColor;
            });
        }
    }

    disableButton(buttonName) {
        const btn = this[`${buttonName}Button`];
        if (btn) {
            btn.classList.add('disabled');
            btn.disabled = true;
            btn.style.backgroundColor = this.buttonDisabledColor;
        }
    }

    enableButton(buttonName) {
        const btn = this[`${buttonName}Button`];
        if (btn) {
            btn.classList.remove('disabled');
            btn.disabled = false;
            btn.style.backgroundColor = this.buttonColor;
        }
    }

    addMessage(payload, isOwnMessage = false, senderName = null, createdAt = null, editedAt = null) {
        if (this.chatWindow) {
            const container = document.createElement('div');
            container.className = isOwnMessage ? 'message-wrapper own' : 'message-wrapper other';

            const msgEl = document.createElement('div');
            msgEl.className = isOwnMessage ? 'message own-message' : 'message other-message';
            msgEl.textContent = payload;

            if (isOwnMessage) {
                msgEl.style.backgroundColor = this.userMessageBgColor;
                msgEl.style.color = this.userMessageTextColor;
            } else {
                msgEl.style.backgroundColor = this.otherMessageBgColor;
                msgEl.style.color = this.otherMessageTextColor;
            }
            msgEl.style.padding = '8px 12px';
            msgEl.style.borderRadius = '12px';
            msgEl.style.maxWidth = '70%';

            container.appendChild(msgEl);

            const footer = document.createElement('div');
            footer.className = 'message-footer';
            footer.style.display = 'flex';
            footer.style.gap = '8px';
            footer.style.fontSize = '0.75rem';
            footer.style.opacity = '0.6';
            footer.style.marginTop = '2px';

            if (senderName) {
                const label = document.createElement('span');
                label.className = 'message-sender-label';
                label.textContent = isOwnMessage ? 'You' : senderName;
                footer.appendChild(label);
            }

            const activeTime = editedAt || createdAt || new Date().toISOString();
            const timeLabel = document.createElement('span');
            timeLabel.className = 'message-timestamp';
            timeLabel.textContent = this.formatTimestamp(activeTime);
            if (editedAt) timeLabel.textContent += ' (edited)';
            footer.appendChild(timeLabel);

            container.appendChild(footer);

            this.chatWindow.appendChild(container);
            this.chatWindow.scrollTop = this.chatWindow.scrollHeight;
        }
    }

    formatTimestamp(isoString) {
        try {
            const date = new Date(isoString);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return '';
        }
    }

    addPrivateMessage(fromId, payload) {
        if (this.chatWindow) {
            const container = document.createElement('div');
            container.className = 'message-wrapper private';

            const msgEl = document.createElement('div');
            msgEl.className = 'message private-message';
            msgEl.textContent = `[Private from ${fromId}]: ${payload}`;
            msgEl.style.padding = '8px 12px';
            msgEl.style.borderRadius = '8px';
            msgEl.style.backgroundColor = 'rgba(187, 134, 252, 0.1)';
            msgEl.style.border = '1px solid var(--button-color)';

            container.appendChild(msgEl);
            this.chatWindow.appendChild(container);
            this.chatWindow.scrollTop = this.chatWindow.scrollHeight;
        }
    }

    loadRoomMessages(roomName, messages) {
        if (!this.chatWindow || roomName !== this.currentRoom) return;

        this.chatWindow.innerHTML = '';

        messages.forEach(msg => {
            const isOwnMessage = msg.user.username === this.myUsername;
            const container = document.createElement('div');
            container.className = isOwnMessage ? 'message-wrapper own' : 'message-wrapper other';

            const msgEl = document.createElement('div');
            msgEl.className = isOwnMessage ? 'message own-message' : 'message other-message';
            msgEl.dataset.messageId = msg.id;

            const contentSpan = document.createElement('span');
            contentSpan.textContent = msg.content;
            msgEl.appendChild(contentSpan);

            if (isOwnMessage) {
                msgEl.style.backgroundColor = this.userMessageBgColor;
                msgEl.style.color = this.userMessageTextColor;
            } else {
                msgEl.style.backgroundColor = this.otherMessageBgColor;
                msgEl.style.color = this.otherMessageTextColor;
            }
            msgEl.style.padding = '8px 12px';
            msgEl.style.borderRadius = '12px';
            msgEl.style.maxWidth = '70%';

            container.appendChild(msgEl);

            const footer = document.createElement('div');
            footer.className = 'message-footer';
            footer.style.display = 'flex';
            footer.style.gap = '8px';
            footer.style.fontSize = '0.75rem';
            footer.style.opacity = '0.6';
            footer.style.marginTop = '2px';

            const label = document.createElement('span');
            label.className = 'message-sender-label';
            label.textContent = isOwnMessage ? 'You' : (msg.user.display_name || msg.user.username);
            footer.appendChild(label);

            const activeTime = msg.edited_at || msg.created_at;
            const timeLabel = document.createElement('span');
            timeLabel.className = 'message-timestamp';
            timeLabel.textContent = this.formatTimestamp(activeTime);
            if (msg.edited_at) timeLabel.textContent += ' (edited)';
            footer.appendChild(timeLabel);

            container.appendChild(footer);
            this.chatWindow.appendChild(container);
        });

        this.chatWindow.scrollTop = this.chatWindow.scrollHeight;
    }

    showError(code, message) {
        console.error(`Status ${code}: ${message}`);
        alert(`Error ${code}: ${message}`);
    }

    updateRoom(roomName, users) {
        if (this.userListContainer) {
            this.removeRoomList();

            let headerContainer = document.createElement('div');
            headerContainer.classList.add("room-sidebar-header");
            headerContainer.style.display = 'flex';
            headerContainer.style.flexDirection = 'column';
            headerContainer.style.gap = '10px';
            headerContainer.style.marginBottom = '20px';
            headerContainer.style.paddingBottom = '15px';

            let titleRow = document.createElement('div');
            titleRow.style.display = 'flex';
            titleRow.style.justifyContent = 'space-between';
            titleRow.style.alignItems = 'center';
            titleRow.style.width = '100%';

            let title = document.createElement('h3');
            title.textContent = roomName;
            title.style.margin = '0';
            title.style.fontSize = '1.2rem';
            title.style.color = this.accentColor;
            title.style.overlow = 'hidden';
            title.style.textOverflow = 'ellipsis';
            title.style.whiteSpace = 'nowrap';

            let countBadge = document.createElement('span');
            countBadge.textContent = `${users.length} 👤`;
            countBadge.style.fontSize = '0.9rem';
            countBadge.style.opacity = '0.7';
            countBadge.style.marginLeft = '10px';
            countBadge.style.whiteSpace = 'nowrap';

            titleRow.appendChild(title);
            titleRow.appendChild(countBadge);


            let leaveButton = document.createElement('button');
            leaveButton.textContent = 'Leave Room';
            leaveButton.classList.add('leave-room-button');

            leaveButton.style.width = '100%';
            leaveButton.style.padding = '8px';
            leaveButton.style.cursor = 'pointer';
            leaveButton.style.backgroundColor = this.leaveButtonColor;
            leaveButton.style.color = 'white';
            leaveButton.style.border = 'none';
            leaveButton.style.borderRadius = '5px';
            leaveButton.style.fontWeight = 'bold';

            headerContainer.appendChild(titleRow);
            headerContainer.appendChild(leaveButton);
            this.userListContainer.appendChild(headerContainer);

            leaveButton.addEventListener('click', () => this.handler.leaveRoom(this.currentRoom))

            const list = document.createElement('ul');
            list.classList.add("user-list");
            users.forEach(user => {
                const item = document.createElement('li');
                item.classList.add('user-item');

                const avatarContainer = document.createElement('div');
                avatarContainer.style.position = 'relative';
                avatarContainer.style.width = '32px';
                avatarContainer.style.height = '32px';
                avatarContainer.style.marginRight = '10px';
                avatarContainer.style.flexShrink = '0';

                const avatar = document.createElement('img');
                avatar.classList.add('user-avatar');
                avatar.src = user.avatar_url || '/assets/default-user-icon.svg';
                avatar.alt = user.username;
                avatar.style.width = '32px';
                avatar.style.height = '32px';
                avatar.style.borderRadius = '50%';

                avatarContainer.appendChild(avatar);

                const isYou = user.username === this.myUsername;
                if (!isYou) {
                    const statusDot = document.createElement('span');
                    statusDot.classList.add('status-circle', user.status || 'online');
                    statusDot.style.position = 'absolute';
                    statusDot.style.bottom = '0';
                    statusDot.style.right = '0';
                    statusDot.style.width = '10px';
                    statusDot.style.height = '10px';
                    statusDot.style.borderRadius = '50%';
                    statusDot.style.border = '2px solid var(--nav-bar-color, #1E1E1E)';
                    avatarContainer.appendChild(statusDot);

                    avatar.addEventListener('click', (e) => this.handler.handleOtherUserIconClick(user.display_name))
                    item.addEventListener('contextmenu', (e) => this.handler.handleOtherUserIconRightClick(e, item))
                } else {

                    avatar.addEventListener('click', (e) => this.handler.handleUserIconClick(avatar))
                    item.addEventListener('contextmenu', (e) => this.handler.handleUserIconRightClick(e, item))
                }



                const nameSpan = document.createElement('span');
                const displayName = user.display_name || user.username;
                nameSpan.textContent = isYou ? `${displayName} (You)` : displayName;

                item.style.display = 'flex';
                item.style.alignItems = 'center';
                item.style.padding = '4px 0';

                item.appendChild(avatarContainer);
                item.appendChild(nameSpan);
                list.appendChild(item);
            });

            this.userListContainer.appendChild(list);
        }
    }


    isCurrentRoom(roomInputValue) {
        if (!this.currentRoom) return false;
        return this.currentRoom === roomInputValue;

    }


    updateUserStatus(username, status) {

        document.querySelectorAll('.user-list .user-item').forEach((el) => {
            if (el.textContent.includes(username)) {
                const statusCircle = el.querySelector('.status-circle');
                if (statusCircle) {
                    statusCircle.classList.remove('online', 'away', 'busy', 'offline');
                    statusCircle.classList.add(status);
                }
            }
        });
    }

    refreshProfileStatus(status) {
        let profileBadge = document.getElementById('status-badge');

        if (profileBadge) {
            profileBadge.classList.remove('status-online', 'status-away', 'status-busy', 'status-offline');
            profileBadge.innerText = `${status}`
            profileBadge.classList.add(`status-${status}`);
        }
    }

    updateRoomList(rooms) {

        if (!this.isChat) return;

        if (!this.roomListContainer) {
            console.error("Room list container not found!");
            return;
        }

        this.rooms = rooms;
        this.roomListContainer.innerHTML = '';
        this.rooms.forEach(roomObj => {
            const roomName = roomObj.name || roomObj;
            const userCount = roomObj.count !== undefined ? roomObj.count : '?';

            const roomEl = document.createElement('div');
            roomEl.classList.add('room');

            const nameSpan = document.createElement('span');
            nameSpan.textContent = roomName;
            roomEl.appendChild(nameSpan);

            const rightContainer = document.createElement('div');
            rightContainer.style.display = 'flex';
            rightContainer.style.alignItems = 'center';

            let btn = document.createElement('button');
            btn.style.color = this.buttonTextColor;
            const isSameRoomButton = (roomName === this.currentRoom);
            if (isSameRoomButton) {
                btn.textContent = "Leave"
                btn.style.backgroundColor = this.leaveButtonColor;
                btn.classList.add('leave-room-button');
                btn.addEventListener('click', () => this.handler.leaveRoom(this.currentRoom));
            } else {
                btn.textContent = 'Join';
                btn.classList.add('join-room-button');
                btn.addEventListener('click', () => this.joinRoom(roomName));
            }
            rightContainer.appendChild(btn);

            const countBadge = document.createElement('span');
            countBadge.classList.add('room-count');
            countBadge.textContent = `${userCount} 👤`;
            countBadge.style.fontSize = '0.85em';
            countBadge.style.opacity = '0.7';
            countBadge.style.marginLeft = '12px';
            rightContainer.appendChild(countBadge);

            roomEl.appendChild(rightContainer);
            this.roomListContainer.appendChild(roomEl);
        });

    }

    switchTab(tabName) {
        if (tabName === 'friends') {
            this.friendsView.classList.remove('hidden');
            this.roomsView.classList.add('hidden');
            this.friendsTab.classList.add('active');
            this.roomsTab.classList.remove('active');
        } else {
            this.friendsView.classList.add('hidden');
            this.roomsView.classList.remove('hidden');
            this.friendsTab.classList.remove('active');
            this.roomsTab.classList.add('active');

            this.handler.getRoomList();

        }
        this.applyTheme();
    }

    joinRoom(name) {
        let roomToJoin = name;
        if (!roomToJoin && this.roomNameInput) {
            roomToJoin = this.roomNameInput.value.trim();
        }

        if (!roomToJoin) {
            this.showGlobalError("Please select a room or enter a name!");
            return;
        }

        if (this.isCurrentRoom(roomToJoin)) {
            this.showGlobalError(`You are already in room: ${roomToJoin}`);
            return;
        }

        this.handler.handleJoinRoom(roomToJoin);
        this.currentRoom = roomToJoin;

        this.showChatBox();
        this.chatWindow.classList.remove('hidden');
        this.chatWindow.innerHTML = '';
        this.bottomContainer.classList.remove('hidden');
        this.switchTab('friends');
        if (this.roomMembersSidebar) this.roomMembersSidebar.classList.remove('hidden');

        if (this.roomNameInput) this.roomNameInput.value = "";
    }

    changeMyStatus(status) {
        if (!this.isChat)
            return;
        switch (status) {
            case 'online':
                this.statusCircle.classList.remove('offline', 'away');
                this.statusCircle.classList.add('online');
                this.userConnectionStatus.textContent = 'Online';
                break;
            case 'offline':
                this.statusCircle.classList.remove('online', 'away');
                this.statusCircle.classList.add('offline');
                this.userConnectionStatus.textContent = 'Offline';
                break;
            case 'away':
                this.statusCircle.classList.remove('online', 'offline');
                this.statusCircle.classList.add('away');
                this.userConnectionStatus.textContent = 'Away';
                break;
        }
    }

    addUser(roomName, userId) {
        console.log(`User ${userId} joined ${roomName}`);
    }

    removeUser(roomName, userId) {
        console.log(`User ${userId} left ${roomName}`);
    }

    changeUsername(oldName, newName) {
        let displayEl = document.querySelector('#display-name');
        if (displayEl.textContent != oldName) return;
        else displayEl.textContent = newName;
    }

    initLayout() {
        if (this.isChat) {
            this.toggleFriendPanel();
        }
    }

    #addEventListeners() {
        if (this.isChat) {
            this.messageInput.addEventListener('focus', () => this.handler.handleInputFocus(this.messageInput));
            this.messageInput.addEventListener('blur', () => this.handler.handleInputBlur(this.messageInput));
            this.messageInput.addEventListener('keydown', (e) => this.handler.handleMessageKeydown(e, this.messageInput))
            this.sendButton.addEventListener('click', () => this.handler.handleSendButton());
            if (this.joinRoomButton) this.joinRoomButton.addEventListener('click', () => this.joinRoom());
            if (this.friendsTab) this.friendsTab.addEventListener('click', () => this.switchTab('friends'));
            if (this.roomsTab) this.roomsTab.addEventListener('click', () => this.switchTab('rooms'));
            if (this.userStatus) this.userStatus.addEventListener('click', (e) => this.handler.handleUserStatusClick(e));
            if (this.profileIconContainer) this.profileIconContainer.addEventListener('click', () => this.handleProfileClick());

            if (this.roomNameInput) {
                this.roomNameInput.addEventListener('focus', () => this.handler.handleInputFocus(this.messageInput));
                this.roomNameInput.addEventListener('blur', () => this.handler.handleInputBlur(this.messageInput));
            }
            if (this.friendsSearchInput) {
                this.friendsSearchInput.addEventListener('focus', () => this.handler.handleInputFocus(this.messageInput));
                this.friendsSearchInput.addEventListener('blur', () => this.handler.handleInputBlur(this.messageInput));
            }

        }



        if (this.themeSelector) {
            this.themeSelector.addEventListener('change', (e) => this.handler.handleThemeOptionChange(e));
        }
        if (this.homeButton) this.homeButton.addEventListener('click', () => this.handler.handleNavButtonClick('home'));
        if (this.chatButton) this.chatButton.addEventListener('click', () => this.handler.handleNavButtonClick('chat'));
        if (this.aboutButton) this.aboutButton.addEventListener('click', () => this.handler.handleNavButtonClick('about'));
        if (this.contactButton) this.contactButton.addEventListener('click', () => this.handler.handleNavButtonClick('contact'));
    }
    showGlobalError(message, duration = 3000) {
        if (!this.alertContainer) return;

        const alertEl = document.createElement('div');
        alertEl.classList.add('global-alert', 'error');
        alertEl.textContent = message;

        this.alertContainer.appendChild(alertEl);

        void alertEl.offsetWidth;

        alertEl.classList.add('show');

        setTimeout(() => {
            alertEl.classList.remove('show');
            setTimeout(() => {
                if (this.alertContainer.contains(alertEl)) {
                    this.alertContainer.removeChild(alertEl);
                }
            }, 300);
        }, duration);
    }
}
