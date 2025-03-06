import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Get initial theme from localStorage or system preference
const getInitialTheme = () => {
    if (browser) {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            return savedTheme;
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark'; // Default to dark theme on server
};

export const theme = writable(getInitialTheme());

// Update localStorage when theme changes
theme.subscribe((value) => {
    if (browser) {
        localStorage.setItem('theme', value);
    }
});

// Export valid theme values for type-checking
export const THEMES = {
    LIGHT: 'light',
    DARK: 'dark',
    SWEET: 'sweet'
};
