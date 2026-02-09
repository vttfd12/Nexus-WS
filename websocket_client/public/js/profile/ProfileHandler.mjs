export class ProfileHandler {
    constructor(ui, username) {
        this.ui = ui;
        this.targetUsername = username;
        this.elements = {
            displayName: document.getElementById('display-name'),
            usernameTag: document.getElementById('username-tag'),
            statusBadge: document.getElementById('status-badge'),
            joinDate: document.getElementById('join-date'),
            userDbId: document.getElementById('user-db-id'),
            avatarImg: document.querySelector('#profile-avatar img')
        };
        this.init();
    }

    static init() {
        window.addEventListener('load', () => {
            // Check if we are on a profile page
            if (window.ui && window.location.pathname.startsWith('/profile/')) {
                const username = window.location.pathname.split('/').pop();
                new ProfileHandler(window.ui, username);
            }
        });
    }

    async init() {
        if (!this.targetUsername) {
            console.error('No username provided in URL');
            return;
        }
        await this.fetchProfile();
    }

    async fetchProfile() {
        try {
            const response = await fetch(`/api/users/${this.targetUsername}`);
            const data = await response.json();

            if (data.error) {
                this.renderError(data.error);
                return;
            }
            console.log(data.user)
            this.renderProfile(data.user);
        } catch (error) {
            console.error('Failed to fetch profile:', error);
            this.renderError('Failed to load profile');
        }
    }

    #openNameEditor() {
        //check to close 
        let inputContainer = document.querySelector('.username-edit-container');

        if (inputContainer) {
            //Reclick pencil - close
            inputContainer.remove();
        } else {
            let container = document.createElement('div');
            container.className = 'username-edit-container';

            let changeB = document.createElement('button');
            changeB.classList.add('change-button');
            changeB.textContent = 'Save';
            changeB.style.backgroundColor = this.ui.buttonColor;

            //changeB:hover
            changeB.addEventListener('mouseenter', () => { changeB.style.backgroundColor === this.ui.buttonHoverColor });
            changeB.addEventListener('mouseleave', () => { changeB.style.backgroundColor === this.ui.buttonColor });


            let input = document.createElement('input');
            input.type = "text";
            input.maxLength = "64";

            changeB.addEventListener('click', () => this.ui.handler.sendUpdateDisplayName(this.elements.usernameTag, input.value))

            input.style.backgroundColor = this.ui.inputBackgroundColor;
            input.style.border = `2px solid ${this.ui.activeInputBorderColor}`;
            input.style.boxShadow = `none`;
            input.addEventListener('focus', () => this.ui.handler.handleInputFocus(input))
            input.addEventListener('blur', () => this.ui.handler.handleInputBlur(input))

            input.value = this.targetUsername;


            container.appendChild(input);
            container.appendChild(changeB);

            this.elements.usernameTag.appendChild(container);
        }
    }

    renderProfile(user) {
        this.elements.displayName.textContent = user.displayName || user.username;
        this.elements.usernameTag.textContent = `@${user.username}`;
        this.elements.userDbId.textContent = `#${user.id}`;

        this.subscribedUserId = user.id;
        this.ui.handler.sendSubscribe(user.id);

        if (this.ui.myUsername === user.username) {

            let img = document.createElement('img');
            img.src = "../../assets/pencil.svg"
            img.classList.add('edit-icon');
            img.addEventListener('click', () => this.#openNameEditor())
            this.elements.usernameTag.appendChild(img);
        }
        const date = new Date(user.createdAt);
        this.elements.joinDate.textContent = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        this.elements.statusBadge.textContent = user.status || 'Offline';
        this.elements.statusBadge.className = `status-badge status-${(user.status || 'offline').toLowerCase()}`;

        if (user.avatarUrl) {
            this.elements.avatarImg.src = user.avatarUrl;
        }
    }

    renderError(message) {
        this.elements.displayName.textContent = 'Error';
        this.elements.usernameTag.textContent = message;
        this.elements.statusBadge.style.display = 'none';

        this.elements.joinDate.textContent = '---';
        this.elements.userDbId.textContent = '---';
    }


    cleanUp() {
        if (this.subscribedUserId) {
            this.ui.handler.sendUnsubscribe();
            this.subscribedUserId = null;
        }
    }



}
