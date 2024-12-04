<!-- src/lib/components/layout/CollapsibleSidebar.svelte -->
<script>
    import { page } from '$app/stores';
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();
    export let collapsed = false;

    const menuItems = [
        {
            title: 'Dashboard',
            icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>`,
            path: '/dashboard'
        },
        {
            title: 'Trades',
            icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>`,
            path: '/trades'
        },
        {
            title: 'Analytics',
            icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>`,
            path: '/analytics'
        },
        {
            title: 'Settings',
            icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>`,
            path: '/settings'
        }
    ];

    function toggleCollapse() {
        collapsed = !collapsed;
        dispatch('collapse', collapsed);
    }

    $: isActive = (path) => $page.url.pathname === path;
</script>

<aside class="h-screen bg-light-card dark:bg-dark-card border-r border-light-border dark:border-dark-border flex flex-col transition-all duration-100 {collapsed ? 'w-20' : 'w-64'}">
    <!-- Header -->
    <div class="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between">
        {#if !collapsed}
            <h1 class="text-xl font-bold bg-gradient-purple bg-clip-text text-transparent">Trading Journal</h1>
        {/if}
        <button 
            class="text-light-text dark:text-dark-text hover:text-theme-500 dark:hover:text-theme-400 p-2 rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover transition-colors duration-200"
            on:click={toggleCollapse}
        >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="{collapsed ? 'M13 5l7 7-7 7M5 5l7 7-7 7' : 'M11 19l-7-7 7-7m8 14l-7-7 7-7'}" />
            </svg>
        </button>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto py-4">
        <ul class="space-y-1 px-3">
            {#each menuItems as item}
                {@const active = isActive(item.path)}
                <li>
                    <a
                        href={item.path}
                        class="flex items-center px-3 py-2 rounded-lg transition-colors duration-200 
                            {active ? 
                                'bg-gradient-purple text-white font-medium shadow-lg shadow-theme-500/25' : 
                                'text-light-text-muted dark:text-dark-text-muted hover:bg-light-hover dark:hover:bg-dark-hover hover:text-light-text dark:hover:text-dark-text'
                            }"
                    >
                        {@html item.icon}
                        {#if !collapsed}
                            <span class="ml-3">{item.title}</span>
                        {:else}
                            <span class="sr-only">{item.title}</span>
                        {/if}
                    </a>
                </li>
            {/each}
        </ul>
    </nav>

    <!-- Footer -->
    <div class="p-4 border-t border-light-border dark:border-dark-border">
        <button
            class="w-full flex items-center justify-center px-3 py-2 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:bg-light-hover dark:hover:bg-dark-hover hover:text-light-text dark:hover:text-dark-text transition-colors duration-200"
            on:click={() => dispatch('logout')}
        >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {#if !collapsed}
                <span class="ml-3">Logout</span>
            {/if}
        </button>
    </div>
</aside>
