<!-- src/routes/+layout.svelte -->
<script>
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { auth } from '$lib/stores/authStore';
    import { theme } from '$lib/stores/themeStore';
    import { goto } from '$app/navigation';
    import CollapsibleSidebar from '$lib/components/layout/CollapsibleSidebar.svelte';
    import Navbar from '$lib/components/layout/Navbar.svelte';
    import '../app.css';

    let sidebarCollapsed = false;
    let isLoading = true;

    // List of routes that don't require authentication
    const publicRoutes = ['/', '/login', '/register'];

    function handleLogout() {
        auth.logout();
        goto('/login');
    }

    function handleSidebarCollapse(event) {
        sidebarCollapsed = event.detail;
    }

    onMount(async () => {
        try {
            // Check if we're on a public route
            const isPublicRoute = publicRoutes.includes($page.url.pathname);

            // Try to initialize auth state from stored data
            const initialized = auth.initialize();

            // If we're not on a public route and not authenticated, redirect to login
            if (!isPublicRoute && !initialized) {
                goto('/login');
            }
        } catch (error) {
            console.error('Auth initialization error:', error);
            // Clear any invalid auth data
            auth.logout();
            if (!publicRoutes.includes($page.url.pathname)) {
                goto('/login');
            }
        } finally {
            isLoading = false;
        }
    });

    // Watch for auth state changes
    $: if (!$auth?.isAuthenticated && !publicRoutes.includes($page.url.pathname) && !isLoading) {
        goto('/login');
    }

    // Watch for navigation to ensure proper layout
    $: currentPath = $page.url.pathname;
    $: isPublicRoute = publicRoutes.includes(currentPath);

    // Update document class based on theme
    $: if (typeof document !== 'undefined') {
        if ($theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }
</script>

<svelte:window on:storage={(event) => {
    // Handle auth state changes from other tabs
    if (event.key === 'auth') {
        if (!event.newValue) {
            auth.logout();
            if (!publicRoutes.includes($page.url.pathname)) {
                goto('/login');
            }
        } else {
            auth.initialize();
        }
    }
}} />

{#if isLoading}
    <div class="min-h-screen bg-dark-bg dark:bg-dark-bg flex items-center justify-center">
        <div class="spinner"></div>
    </div>
{:else if $auth?.isAuthenticated && !isPublicRoute}
    <div class="flex h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text transition-colors duration-200">
        <!-- Sidebar -->
        <CollapsibleSidebar 
            bind:collapsed={sidebarCollapsed}
            on:collapse={handleSidebarCollapse}
            on:logout={handleLogout}
        />

        <!-- Main Content -->
        <div class="flex-1 flex flex-col overflow-hidden">
            <!-- Top Navigation -->
            <Navbar />

            <!-- Page Content -->
            <main class="flex-1 overflow-x-hidden overflow-y-auto bg-light-bg dark:bg-dark-bg">
                <slot />
            </main>
        </div>
    </div>
{:else}
    <!-- Public pages (landing, login, register) -->
    <main class="bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text min-h-screen transition-colors duration-200">
        <slot />
    </main>
{/if}

<style>
    :global(body) {
        @apply bg-light-bg dark:bg-dark-bg transition-colors duration-200;
    }

    .spinner {
        @apply animate-spin rounded-full border-4 border-light-border dark:border-dark-border border-t-theme-500 h-8 w-8;
    }

    :global(.card) {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl shadow-lg transition-colors duration-200;
    }

    :global(.btn-primary) {
        @apply bg-gradient-purple hover:bg-gradient-purple-dark text-white font-medium px-4 py-2 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-theme-500 focus:ring-offset-2 focus:ring-offset-light-bg dark:focus:ring-offset-dark-bg;
    }

    :global(.btn-secondary) {
        @apply bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text border border-light-border dark:border-dark-border hover:bg-light-hover dark:hover:bg-dark-hover font-medium px-4 py-2 rounded-lg transition-all duration-200;
    }

    :global(.input) {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border text-light-text dark:text-dark-text rounded-lg px-4 py-2 focus:ring-2 focus:ring-theme-500 focus:border-transparent transition-colors duration-200;
    }

    :global(.link) {
        @apply text-theme-500 hover:text-theme-400 transition-colors duration-200;
    }
</style>
