<!-- src/lib/components/layout/CollapsibleSidebar.svelte -->
<script>
    import { page } from '$app/stores';
    import { createEventDispatcher } from 'svelte';
    import { slide } from 'svelte/transition';

    const dispatch = createEventDispatcher();
    export let collapsed = false;

    const menuItems = [
        {
            title: 'Dashboard',
            icon: 'fas fa-chart-line',
            path: '/dashboard',
            color: 'text-blue-500'
        },
        {
            title: 'Trades',
            icon: 'fas fa-exchange-alt',
            path: '/trades',
            color: 'text-green-500'
        },
        {
            title: 'Analytics',
            icon: 'fas fa-chart-pie',
            path: '/analytics',
            color: 'text-purple-500'
        },
        {
            title: 'Settings',
            icon: 'fas fa-cog',
            path: '/settings',
            color: 'text-slate-400'
        }
    ];

    function toggleCollapse() {
        collapsed = !collapsed;
        dispatch('collapse', collapsed);
    }
</script>

<aside class="h-screen bg-slate-800 border-r border-slate-700 flex flex-col transition-all duration-300 {collapsed ? 'w-16' : 'w-64'}">
    <!-- Header -->
    <div class="p-4 border-b border-slate-700 flex items-center justify-between">
        {#if !collapsed}
            <h1 class="text-xl font-bold gradient-text">Trading Journal</h1>
        {/if}
        <button 
            class="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700"
            on:click={toggleCollapse}
        >
            <i class="fas {collapsed ? 'fa-chevron-right' : 'fa-chevron-left'}"></i>
        </button>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto py-4">
        <ul class="space-y-2">
            {#each menuItems as item}
                <li>
                    <a
                        href={item.path}
                        class="flex items-center px-4 py-2 text-slate-300 hover:bg-slate-700 {$page.url.pathname === item.path ? 'bg-slate-700' : ''}"
                    >
                        <i class="{item.icon} {item.color} w-6"></i>
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
    <div class="p-4 border-t border-slate-700">
        <button
            class="w-full flex items-center justify-center px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg"
            on:click={() => dispatch('logout')}
        >
            <i class="fas fa-sign-out-alt"></i>
            {#if !collapsed}
                <span class="ml-3">Logout</span>
            {/if}
        </button>
    </div>
</aside>

<style>
    .gradient-text {
        background: linear-gradient(45deg, #3b82f6, #8b5cf6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
</style>
