<!-- src/lib/components/common/ThemeToggle.svelte -->
<script>
    import { theme, THEMES } from '$lib/stores/themeStore';

    function toggleTheme() {
        theme.update(current => {
            if (current === THEMES.LIGHT) return THEMES.DARK;
            if (current === THEMES.DARK) return THEMES.SWEET;
            return THEMES.LIGHT; // from SWEET back to LIGHT
        });
    }
</script>

<button
    on:click={toggleTheme}
    class="p-2 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-light-text hover:dark:text-dark-text hover:bg-light-hover dark:hover:bg-dark-hover"
    aria-label="Toggle theme"
>
    {#if $theme === THEMES.DARK}
        <!-- Sun icon for dark theme -->
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    {:else if $theme === THEMES.SWEET}
        <!-- Candy icon for sweet theme -->
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
    {:else}
        <!-- Moon icon for light theme -->
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
    {/if}
</button>
