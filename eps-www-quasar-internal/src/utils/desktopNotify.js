import logo from 'src/assets/epslogo.png';

// Desktop notifications: a small card from the operating system (the Windows / macOS notification
// centre) that appears even when this tab is in the background or the browser is minimised.
// It uses the browser's Notification API, so it works while the app is open in a tab or window.

const KEY = 'eps_desktop_notify';

export const desktopSupported = () => typeof window !== 'undefined' && 'Notification' in window;

// 'granted' | 'denied' | 'default' (not asked yet) | 'unsupported'
export const desktopPermission = () => (desktopSupported() ? Notification.permission : 'unsupported');

// whether this person switched them off in the account menu (it is on once permission is given)
export const desktopMuted = () => {
    try { return localStorage.getItem(KEY) === 'off'; } catch { return false; }
};
export const setDesktopMuted = (muted) => {
    try { localStorage.setItem(KEY, muted ? 'off' : 'on'); } catch { /* storage is optional */ }
};

export const desktopEnabled = () => desktopPermission() === 'granted' && !desktopMuted();

// Asks the browser for permission (it shows its own prompt). Resolves to the permission state.
export const askDesktopPermission = async () => {
    if (!desktopSupported()) return 'unsupported';
    if (Notification.permission === 'default') {
        try { await Notification.requestPermission(); } catch { /* an old browser takes a callback; ignore */ }
    }
    if (Notification.permission === 'granted') setDesktopMuted(false);
    return Notification.permission;
};

// Shows one card. `onClick` runs when it is clicked (the window is brought to the front first).
// `force` skips the "only when you are looking elsewhere" rule (used for the test card).
export const showDesktopNotification = ({ title = 'eParticipation System', body = '', tag, onClick, force = false } = {}) => {
    if (!desktopEnabled()) return null;
    // While the app is the window in front, the bell and the toast already tell the person.
    if (!force && !document.hidden && document.hasFocus()) return null;
    try {
        const n = new Notification(title, {
            body,
            icon: logo,
            badge: logo,
            tag,
            renotify: !!tag,
            silent: false,
        });
        n.onclick = () => {
            window.focus();
            n.close();
            if (onClick) onClick();
        };
        return n;
    } catch (error) {
        console.error('Could not show a desktop notification:', error);
        return null;
    }
};
