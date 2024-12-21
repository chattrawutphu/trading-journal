<!-- src/lib/components/common/ThemeToggle.svelte -->
<script>
    import { theme } from '$lib/stores/themeStore';

    function toggleTheme() {
        theme.update(current => current === 'dark' ? 'light' : 'dark');
    }
</script>

<button
    on:click={toggleTheme}
    class="p-2 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-light-text hover:dark:text-dark-text hover:bg-light-hover dark:hover:bg-dark-hover "
    aria-label="Toggle theme"
>
    {#if $theme === 'dark'}
        <!-- Sun icon -->
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    {:else}
        <!-- Moon icon -->
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
    {/if}
</button>
