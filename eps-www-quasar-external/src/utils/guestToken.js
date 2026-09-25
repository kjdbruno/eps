// A random id generated once per browser and persisted in localStorage — this is what lets a
// guest (no account) vote on a poll without logging in, while still stopping that same browser
// from voting twice on the same poll. It's a soft guard, not real identity: clearing storage or
// using another browser/incognito window resets it. That tradeoff is intentional — participating
// as a guest is meant to be zero-friction.
const STORAGE_KEY = 'epsGuestToken';

export function getGuestToken() {
    try {
        let token = localStorage.getItem(STORAGE_KEY);
        if (!token) {
            token = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
            localStorage.setItem(STORAGE_KEY, token);
        }
        return token;
    } catch {
        // Private browsing / storage disabled — fall back to a per-load token. Duplicate-vote
        // guarding just won't survive a refresh in that case, which is an acceptable tradeoff.
        return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
}
