import { UI } from './core/UI.mjs';
import { NavHandler } from './tools/NavHandler.mjs';

let ui;
let navHandler;
let currentProfileHandler = null;

// Initialize UI as soon as DOM is ready to apply themes/structure
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

async function init() {
    let path = new URL(window.location.href).pathname;
    const normalizedPath = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;

    ui = new UI(normalizedPath);
    window.ui = ui;
    navHandler = new NavHandler(ui);

    let localTheme = localStorage.getItem("theme");
    if (!localTheme)
        ui.changeTheme('main-dark-theme');
    else
        ui.changeTheme(localTheme);
    ui.applyTheme();

    if (normalizedPath.startsWith('/profile')) {

        if (currentProfileHandler) currentProfileHandler.cleanup();

        const { ProfileHandler } = await import('./profile/ProfileHandler.mjs');
        const username = normalizedPath.split('/').pop();
        currentProfileHandler = new ProfileHandler(ui, username);
        return;
    } else {
        if (currentProfileHandler) {
            currentProfileHandler.cleanup();
            currentProfileHandler = null;
        }
    }

    switch (normalizedPath) {
        case "/home":
            ui.disableButton('home');
            break;
        case "/chat":
            ui.disableButton('chat');
            break;
        case "/about":
            ui.disableButton('about');
            break;
        case "/contact":
            ui.disableButton('contact');
            break;
        default:
            console.error('Invalid page title (called in init())');
            break;
    }

    if (document.readyState === 'complete') {
        ui.initLayout();
    } else {
        window.addEventListener('load', () => ui.initLayout());
    }
}
