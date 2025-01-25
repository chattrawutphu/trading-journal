<script>
    import { page } from "$app/stores";
    import { createEventDispatcher } from "svelte";
    import { writable } from "svelte/store";
    import { auth } from '$lib/stores/authStore';
    import { subscriptionStore } from '$lib/stores/subscriptionStore';
    import { goto } from '$app/navigation';
    import ThemeToggle from '../common/ThemeToggle.svelte';
    import { menuItems } from '../../data/menuItems.js';
    import { onMount } from 'svelte';
    
    // Add subscription badge styles
    const subscriptionBadgeStyles = {
        'basic': 'bg-gray-200 text-gray-800',
        'pro': 'bg-blue-200 text-blue-800',
        'pro_plus': 'bg-purple-200 text-purple-800'
    };

    const dispatch = createEventDispatcher();
    export let collapsed = false;

    const isCollapsed = writable(collapsed);

    function toggleCollapse() {
        collapsed = !collapsed;
        isCollapsed.set(collapsed);
        dispatch("collapse", collapsed);
    }

    $: $isCollapsed = collapsed;

    $: isActive = (path) => $page.url.pathname === path;

    function handleLogout() {
        auth.logout();
        goto('/login');
    }

    function formatSubscriptionType(type) {
        if (!type) return 'basic';
        return type.toLowerCase();
    }

    function getSubscriptionBadgeStyle(type) {
        return subscriptionBadgeStyles[formatSubscriptionType(type)] || subscriptionBadgeStyles['basic'];
    }

    function getUserDisplayName(user) {
        if (!user) return '';
        return user.username || user.email?.split('@')[0] || 'User';
    }

    let isLoading = true;

    onMount(async () => {
        // Initialize auth on mount
        await auth.initialize();
        
        const unsubscribe = auth.subscribe(authState => {
            isLoading = authState.loading;
        });

        return () => {
            unsubscribe();
        };
    });

    // Remove debug logs if no longer needed
    // $: console.log('Auth store user:', $auth?.user);
</script>

<aside class="h-screen hidden md:block p-3 pe-0">
    <div
        class="rounded-md h-full bg-light-card dark:bg-dark-card border-r border-light-border dark:border-0 flex flex-col { $isCollapsed
            ? 'w-20'
            : 'w-64'}"
    >
        <!-- Header -->
        <div
            class="p-4 border-b border-light-border dark:border-0 flex items-center {$isCollapsed ? 'justify-center' : 'justify-between'} "
        >
            {#if !$isCollapsed}
                <h1
                    class="text-2xl font-bold bg-gradient-purple bg-clip-text text-transparent"
                >
                    Trading Journal
                </h1>
            {/if}
            <button
                class="text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 dark:hover:text-theme-400 p-2 rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover"
                on:click={toggleCollapse}
            >
                <svg
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d={$isCollapsed
                            ? "M13 5l7 7-7 7M5 5l7 7-7 7"
                            : "M11 19l-7-7 7-7m8 14l-7-7 7-7"}
                    />
                </svg>
            </button>
        </div>

        <!-- User Profile Section -->
        <div class="p-4 border-b border-light-border dark:border-0">
            <div class="flex items-center gap-3 {$isCollapsed ? 'justify-center' : ''}">
                {#if isLoading || !$auth?.user}
                    <!-- Skeleton Loading -->
                    <div class="flex-shrink-0">
                        <div class="w-10 h-10 rounded-full bg-light-hover dark:bg-dark-hover animate-pulse"></div>
                    </div>
                    {#if !$isCollapsed}
                        <div class="flex-1 min-w-0 my-2 space-y-2">
                            <div class="flex items-center gap-2">
                                <div class="h-4 w-24 bg-light-hover dark:bg-dark-hover rounded animate-pulse"></div>
                                <div class="h-4 w-12 bg-light-hover dark:bg-dark-hover rounded animate-pulse"></div>
                            </div>
                            <div class="h-4 w-20 bg-light-hover dark:bg-dark-hover rounded animate-pulse"></div>
                        </div>
                    {/if}
                {:else}
                    <!-- User Profile Content -->
                    <div class="flex-shrink-0">
                        <img
                            src={$auth.user.avatar || `https://ui-avatars.com/api/?name=${getUserDisplayName($auth.user)}&background=8b5cf6&color=fff`}
                            alt="Profile"
                            class="w-10 h-10 rounded-full border-2 border-theme-500"
                        />
                    </div>
                    {#if !$isCollapsed}
                        <div class="flex-1 min-w-0 my-2">
                            <div class="flex items-center gap-2">
                                <p class="text-sm font-semibold text-light-text dark:text-dark-text truncate">
                                    {getUserDisplayName($auth.user)}
                                </p>
                                <span class="px-2 py-0.5 text-xs font-semibold rounded-full {getSubscriptionBadgeStyle($subscriptionStore?.type)}">
                                    {formatSubscriptionType($subscriptionStore?.type)}
                                </span>
                            </div>
                            <button
                                class="mt-1 flex items-center gap-1 text-xs text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 dark:hover:text-theme-400"
                                on:click={() => goto('/profile')}
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                </svg>
                                <span>Profile Settings</span>
                            </button>
                        </div>
                    {/if}
                {/if}
            </div>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 overflow-y-auto py-4">
            <ul class="space-y-1 px-3">
                {#each menuItems as item}
                    {@const active = isActive(item.path)}
                    <li>
                        <a
                            href={item.path}
                            class="flex items-center {$isCollapsed ? 'justify-center' : ''} px-3 py-2 rounded-lg
                            {active
                                ? 'bg-gradient-purple text-white font-medium shadow-lg shadow-theme-500/25'
                                : 'text-light-text-muted dark:text-dark-text-muted hover:bg-light-hover dark:hover:bg-dark-hover hover:text-light-text dark:hover:text-dark-text'}"
                        >
                            {@html item.icon}
                            {#if !$isCollapsed}
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
        <div class="p-4 border-t border-light-border dark:border-0">
            <div class="{$isCollapsed ? 'flex flex-col gap-4' : 'flex items-center justify-between'}">
                <!-- Theme Toggle -->
                <div class="{$isCollapsed ? 'mx-auto' : ''}">
                    <ThemeToggle />
                </div>

                <!-- Logout Button -->
                <button
                    class="{$isCollapsed 
                        ? 'w-full flex items-center justify-center p-2 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:bg-light-hover dark:hover:bg-dark-hover hover:text-light-text dark:hover:text-dark-text'
                        : 'flex items-center justify-center px-3 py-2 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:bg-light-hover dark:hover:bg-dark-hover hover:text-light-text dark:hover:text-dark-text'}"
                    on:click={handleLogout}
                >
                    <svg
                        class="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                    </svg>
                    {#if !$isCollapsed}
                        <span class="ml-3">Logout</span>
                    {/if}
                </button>
            </div>
        </div>
    </div>
</aside>
