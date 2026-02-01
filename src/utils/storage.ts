export const STORAGE_KEY = 'numo_recent_apps';
export const MAX_RECENT_APPS = 5;

export function getRecentAppIds(): string[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.warn('Failed to parse recent apps from storage', error);
        return [];
    }
}

export function addRecentAppId(id: string): void {
    try {
        const current = getRecentAppIds();
        // Remove if exists to push to top
        const filtered = current.filter(appId => appId !== id);
        // Add to beginning
        const updated = [id, ...filtered].slice(0, MAX_RECENT_APPS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
        console.warn('Failed to save recent app to storage', error);
    }
}
