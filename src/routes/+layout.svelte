<!-- src/routes/+layout.svelte -->
<script>
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { auth } from '$lib/stores/authStore';
    import { theme } from '$lib/stores/themeStore';
    import { accountStore } from '$lib/stores/accountStore';
    import { subscriptionStore } from '$lib/stores/subscriptionStore';
    import { goto } from '$app/navigation';
    import CollapsibleSidebar from '$lib/components/layout/CollapsibleSidebar.svelte';
    import Navbar from '$lib/components/layout/Navbar.svelte';
    import '../app.css';

    const publicRoutes = ['/', '/login', '/register', '/forgot-password'];

    let sidebarCollapsed = false;
    let isLoading = true;
    let initialized = false;

    function handleLogout() {
        auth.logout();
        goto('/login');
    }

    function handleSidebarCollapse(event) {
        sidebarCollapsed = event.detail;
    }

    async function initializeAccount() {
        if ($auth.isAuthenticated) {
            await accountStore.loadAccounts();
        }
    }

    async function checkSubscriptionStatus() {
        if ($auth.isAuthenticated) {
            try {
                const subscription = await subscriptionStore.initializeSubscription();
                await subscriptionStore.loadInvoices();
                
                // If subscription is expired or cancelled, redirect to subscription page
                if (subscription && (subscription.status === 'expired' || subscription.status === 'cancelled')) {
                    if ($page.url.pathname !== '/subscription') {
                        goto('/subscription');
                    }
                }
            } catch (error) {
                console.error('Failed to check subscription status:', error);
            }
        }
    }

    onMount(async () => {
        try {
            initialized = true;
            const success = await auth.initialize();
            
            if (success) {
                await Promise.all([
                    initializeAccount(),
                    checkSubscriptionStatus()
                ]);
            }
            
            // ถ้าไม่ได้อยู่ใน public routes และยังไม่ได้ login ให้ redirect ไปหน้า login
            if (!success && !publicRoutes.includes($page.url.pathname)) {
                goto('/login');
            }
            // ถ้า login แล้วแต่อยู่ที่หน้า login ให้ไปที่ dashboard
            else if (success && publicRoutes.includes($page.url.pathname) && $page.url.pathname !== '/') {
                goto('/dashboard');
            }
        } catch (error) {
            console.error('Failed to initialize auth:', error);
            if (!publicRoutes.includes($page.url.pathname)) {
                goto('/login');
            }
        }
    });

    // Watch for auth state changes
    $: if (!$auth?.isAuthenticated && !publicRoutes.includes($page.url.pathname) && !isLoading) {
        goto('/login');
    }

    // Watch for navigation to ensure proper layout and account loading
    $: {
        if ($page.url.pathname && $auth.isAuthenticated && !publicRoutes.includes($page.url.pathname)) {
            Promise.all([
                initializeAccount(),
                checkSubscriptionStatus()
            ]);
        }
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
            auth.initialize().then(() => {
                if ($auth.isAuthenticated) {
                    checkSubscriptionStatus();
                }
            });
        }
    }
}} />

{#if initialized}
    {#if isPublicRoute}
        <slot />
    {:else}
        <div class="flex h-screen">
            <CollapsibleSidebar 
                collapsed={sidebarCollapsed} 
                on:collapse={handleSidebarCollapse} 
            />
            <div class="flex-1 flex flex-col overflow-hidden">
                <Navbar {sidebarCollapsed} on:logout={handleLogout} />
                <main class="flex-1 overflow-x-hidden overflow-y-auto">
                    <slot />
                </main>
            </div>
        </div>
    {/if}
{:else}
    <div class="flex items-center justify-center min-h-screen">
        <div class="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
    </div>
{/if}

<style lang="postcss">
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
