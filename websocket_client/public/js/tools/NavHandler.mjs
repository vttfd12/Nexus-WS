export class NavHandler {
    constructor(ui) {
        this.ui = ui;
        this.authButton = null;
        this.init();
    }

    async init() {
        this.createAuthButton();
        await this.checkAuthStatus();
    }

    createAuthButton() {
        let navUl = document.querySelector('#navigation-bar ul');

        if (!navUl) {
            console.warn('NavHandler: #navigation-bar ul not found, attempting to find #navigation-bar');
            const navBar = document.getElementById('navigation-bar');
            if (navBar) {
                navUl = document.createElement('ul');
                navBar.appendChild(navUl);
            } else {
                console.error('NavHandler: Navigation bar not found');
                return;
            }
        }

        if (document.getElementById('auth-nav-button')) return;

        this.authButton = document.createElement('button');
        this.authButton.className = 'nav-button';
        this.authButton.id = 'auth-nav-button';
        this.authButton.textContent = 'Login';
        this.authButton.type = 'button';

        this.authButton.style.display = 'flex';
        this.authButton.style.marginTop = 'auto';

        this.authButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleAuthClick();
        });

        navUl.appendChild(this.authButton);
        console.log('NavHandler: Auth button created and appended');
    }

    async checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/me');
            const data = await response.json();

            if (data.authenticated) {
                this.setLoggedIn(data.user);
            } else {
                this.setLoggedOut();
            }
        } catch (error) {
            console.error('Failed to check auth status:', error);
            this.setLoggedOut();
        }
    }

    setLoggedIn(user) {
        if (this.authButton) {
            this.authButton.textContent = 'Logout';
            this.authButton.style.backgroundColor = "#FF746C"
        }
        if (this.ui.chatButton && this.ui.whereAmI !== "/chat") {
            this.ui.enableButton('chat');
        }
        this.ui.setUserInfo(user);
    }

    setLoggedOut() {
        if (this.authButton) {
            this.authButton.textContent = 'Login';
        }
        if (this.ui.chatButton && this.ui.whereAmI !== "/chat") {
            this.ui.disableButton('chat');
        }
    }

    async handleAuthClick() {
        if (this.authButton.textContent === 'Logout') {
            await this.logout();
        } else {
            window.location.href = '/auth';
        }
    }

    async logout() {
        try {
            const response = await fetch('/api/auth/logout', { method: 'POST' });
            const data = await response.json();
            if (data.success) {
                localStorage.removeItem('chat_user');
                window.location.href = '/home';
            }
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }
}
