import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'light' | 'dark';

function createThemeStore() {
    const { subscribe, set, update } = writable<Theme>('light');

    return {
        subscribe,
        init: () => {
            if (!browser) return;

            const storedTheme = localStorage.getItem('theme') as Theme | null;
            if (storedTheme) {
                set(storedTheme);
                document.documentElement.setAttribute('data-theme', storedTheme);
            } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                set('dark');
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                set('light');
                document.documentElement.setAttribute('data-theme', 'light');
            }
        },
        toggle: () => update((current) => {
            const newTheme = current === 'light' ? 'dark' : 'light';
            if (browser) {
                localStorage.setItem('theme', newTheme);
                document.documentElement.setAttribute('data-theme', newTheme);
            }
            return newTheme;
        }),
        set: (theme: Theme) => {
            if (browser) {
                localStorage.setItem('theme', theme);
                document.documentElement.setAttribute('data-theme', theme);
            }
            set(theme);
        }
    };
}

export const theme = createThemeStore();
