<!-- src/routes/+layout.svelte -->
<script>
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { auth } from '$lib/stores/authStore';
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
    <div class="min-h-screen bg-slate-900 flex items-center justify-center">
        <div class="spinner"></div>
    </div>
{:else if $auth?.isAuthenticated && !isPublicRoute}
    <div class="flex h-screen bg-slate-900 text-white">
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
            <main class="flex-1 overflow-x-hidden overflow-y-auto bg-slate-900">
                <slot />
            </main>
        </div>
    </div>
{:else}
    <!-- Public pages (landing, login, register) -->
    <main class="bg-slate-900 text-white min-h-screen">
        <slot />
    </main>
{/if}

<style>
    :global(body) {
        @apply bg-slate-900;
    }

    .spinner {
        @apply animate-spin rounded-full border-4 border-slate-600 border-t-blue-500 h-8 w-8;
    }
</style>
