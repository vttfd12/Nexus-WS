import { UI } from '/js/core/UI.mjs';

class AuthHandler {
    constructor() {
        this.ui = new UI(window.location.pathname);

        // Load persist theme
        const localTheme = localStorage.getItem("theme") || 'main-dark-theme';
        this.ui.changeTheme(localTheme);
        this.ui.applyTheme();

        this.form = document.getElementById('auth-form');
        this.title = document.getElementById('title');
        this.subtitle = document.getElementById('subtitle');
        this.submitBtn = document.getElementById('submit-btn');
        this.toggleBtn = document.getElementById('toggle-mode');
        this.footerText = document.getElementById('footer-text');
        this.messageEl = document.getElementById('message');

        this.isLogin = true;
        this.init();
    }

    init() {
        // Check for message in URL
        const params = new URLSearchParams(window.location.search);
        const msg = params.get('message');
        if (msg) {
            this.showMessage(msg, 'error');
        }

        this.toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleMode();
        });

        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        // Ensure layout is initialized (though auth pages are simpler)
        this.ui.initLayout();
    }

    toggleMode() {
        this.isLogin = !this.isLogin;
        document.body.classList.toggle('register-mode', !this.isLogin);

        if (this.isLogin) {
            this.title.textContent = 'Sign In';
            this.subtitle.textContent = 'Enter your details to access the secure chat.';
            this.submitBtn.textContent = 'Login';
            this.footerText.textContent = "Don't have an account?";
            this.toggleBtn.textContent = 'Sign Up';
            document.getElementById('email').required = false;
        } else {
            this.title.textContent = 'Create Account';
            this.subtitle.textContent = 'Join the private conversation.';
            this.submitBtn.textContent = 'Register';
            this.footerText.textContent = "Already have an account?";
            this.toggleBtn.textContent = 'Sign In';
            document.getElementById('email').required = true;
        }

        this.messageEl.style.display = 'none';
        this.form.reset();
    }

    async handleSubmit() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const email = document.getElementById('email').value;

        const endpoint = this.isLogin ? '/api/auth/login' : '/api/auth/register';
        const payload = { username, password };
        if (!this.isLogin) payload.email = email;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.success) {
                if (this.isLogin) {
                    this.showMessage('Login successful! Redirecting...', 'success');
                    // Store user minimal info for UI
                    localStorage.setItem('chat_user', JSON.stringify(data.user));
                    setTimeout(() => window.location.href = '/chat', 1000);
                } else {
                    this.showMessage('Registration successful! Please login.', 'success');
                    this.toggleMode();
                }
            } else {
                this.showMessage(data.error || 'Authentication failed.', 'error');
            }
        } catch (error) {
            this.showMessage('Connection error. Is the server running?', 'error');
        }
    }

    showMessage(text, type) {
        this.messageEl.textContent = text;
        this.messageEl.className = type;
        this.messageEl.style.display = 'block';
    }
}

new AuthHandler();
