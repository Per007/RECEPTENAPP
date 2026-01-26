import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface Settings {
    hideWhatsappShare: boolean;
}

const defaultSettings: Settings = {
    hideWhatsappShare: false
};

function createSettingsStore() {
    const { subscribe, set, update } = writable<Settings>(defaultSettings);

    return {
        subscribe,
        init: () => {
            if (!browser) return;

            const stored = localStorage.getItem('settings');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    set({ ...defaultSettings, ...parsed });
                } catch (e) {
                    console.error('Error parsing settings:', e);
                }
            }
        },
        toggleWhatsappShare: () => update((s) => {
            const newSettings = { ...s, hideWhatsappShare: !s.hideWhatsappShare };
            if (browser) {
                localStorage.setItem('settings', JSON.stringify(newSettings));
            }
            return newSettings;
        })
    };
}

export const settings = createSettingsStore();
