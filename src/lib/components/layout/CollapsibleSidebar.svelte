<script>
    import { page } from "$app/stores";
    import { createEventDispatcher } from "svelte";
    import { writable } from "svelte/store";
    import { auth } from '$lib/stores/authStore';
    import { subscriptionStore } from '$lib/stores/subscriptionStore';
    import { layoutStore } from '$lib/stores/layoutStore';
    import { goto } from '$app/navigation';
    import ThemeToggle from '../common/ThemeToggle.svelte';
    import { menuItems } from '../../data/menuItems.js';
    import { onMount } from 'svelte';
    import { fade, fly } from 'svelte/transition';
    
    // Add subscription badge styles
    const subscriptionBadgeStyles = {
        'basic': 'bg-gray-200 text-gray-800',
        'pro': 'bg-blue-200 text-blue-800',
        'pro_plus': 'bg-purple-200 text-purple-800'
    };

    const dispatch = createEventDispatcher();
    export let collapsed = false;
    export let key = ''; // Add key prop for forcing component reload

    const isCollapsed = writable(collapsed);

    function toggleCollapse() {
        collapsed = !collapsed;
        isCollapsed.set(collapsed);
        dispatch("collapse", collapsed);
    }

    $: $isCollapsed = collapsed;

    $: isActive = (path) => $page.url.pathname === path || $page.url.pathname.startsWith(path + '/');

    $: isDashboard = $page.url.pathname === '/dashboard' || $page.url.pathname.startsWith('/dashboard/');

    // เพิ่มตัวแปรเพื่อเก็บ active layout index จาก layoutStore
    let activeLayoutFromStore = 0;
    let layoutStoreData = null;
    
    // Add reactive statement to update when layoutStore changes
    $: if (layoutStoreData) {
        activeLayoutFromStore = layoutStoreData.activeLayoutIndex;
    }
    
    // Add reactive statement to update when key changes
    $: if (key) {
        console.log(`CollapsibleSidebar reloaded with key: ${key}`);
        
        // Force re-evaluation of active layout
        const urlLayoutParam = $page.url.searchParams.get('layout');
        if (urlLayoutParam !== null) {
            const layoutIndex = parseInt(urlLayoutParam);
            if (!isNaN(layoutIndex) && layoutIndex >= 0) {
                console.log(`Setting active layout to ${layoutIndex} from URL param`);
                // Update the layoutStore
                layoutStore.setActiveLayout(layoutIndex);
            }
        }
    }
    
    // เพิ่มการ subscribe layoutStore.activeLayoutIndex (ต้องเพิ่มใน layoutStore)
    onMount(async () => {
        // Initialize auth on mount
        await auth.initialize();
        
        const unsubscribeAuth = auth.subscribe(authState => {
            isLoading = authState.loading;
        });

        await layoutStore.loadLayouts();
        
        const unsubscribeLayout = layoutStore.subscribe(layoutData => {
            layoutStoreData = layoutData;
            if (layoutData && layoutData.layouts) {
                layouts = layoutData.layouts;
                if (layoutData.activeLayoutIndex !== undefined) {
                    activeLayoutFromStore = layoutData.activeLayoutIndex;
                }
            }
        });

        // Add event listener for layout changes
        const handleLayoutChange = (event) => {
            console.log('Layout change event received:', event.detail);
            if (event.detail && event.detail.layoutIndex !== undefined) {
                // Force re-render of the component
                showDashboardSubmenu = true; // Ensure submenu is visible
            }
        };
        
        window.addEventListener('layoutchange', handleLayoutChange);
        
        window.addEventListener('layoutupdate', async () => {
            await layoutStore.loadLayouts();
        });

        return () => {
            unsubscribeAuth();
            unsubscribeLayout();
            window.removeEventListener('layoutchange', handleLayoutChange);
            window.removeEventListener('layoutupdate', async () => {
                await layoutStore.loadLayouts();
            });
        };
    });

    // แก้ไขฟังก์ชัน isActiveLayout ให้ตรวจสอบทั้ง URL parameter และค่าจาก layoutStore
    $: isActiveLayout = (layoutIndex) => {
        // Always check URL parameter first
        const urlLayoutParam = $page.url.searchParams.get('layout');
        if (urlLayoutParam !== null) {
            const isActive = urlLayoutParam === layoutIndex.toString();
            if (isActive) {
                console.log(`Layout ${layoutIndex} is active from URL param: ${urlLayoutParam}`);
            }
            return isActive;
        }
        
        // ตรวจสอบจาก layoutStore (ถ้ามีการกำหนดค่าไว้)
        if (layoutStoreData && layoutStoreData.activeLayoutIndex !== undefined) {
            const isActive = layoutIndex === layoutStoreData.activeLayoutIndex;
            if (isActive) {
                console.log(`Layout ${layoutIndex} is active from layoutStore: ${layoutStoreData.activeLayoutIndex}`);
            }
            return isActive;
        }
        
        // ค่าเริ่มต้น: ถ้าเป็นหน้า Dashboard และเป็น layout แรก
        const isDefault = isDashboard && layoutIndex === 0 && !urlLayoutParam;
        if (isDefault) {
            console.log(`Layout ${layoutIndex} is active by default`);
        }
        return isDefault;
    };

    let showDashboardSubmenu = true;

    let layouts = [];

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

    function navigateToLayout(layoutIndex) {
        // Update the layoutStore first
        layoutStore.setActiveLayout(layoutIndex);
        
        // Then navigate to update the URL
        goto(`/dashboard?layout=${layoutIndex}`, {
            replaceState: false,
            noscroll: true
        });
    }

    function toggleSubmenu() {
        if (!$isCollapsed) {
            showDashboardSubmenu = !showDashboardSubmenu;
            console.log('Toggled submenu:', showDashboardSubmenu);
        }
    }

    let isLoading = true;

    function getIconPath(iconId) {
        if (!iconId) return icons['dashboard'];
        
        const icons = {
            'dashboard': 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
            'chart': 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
            'trading': 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
            'calendar': 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
            'target': 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
            'money': 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
            'stats': 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z',
            'settings': 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
        };
        
        return icons[iconId] || icons['dashboard'];
    }
</script>

<aside class="h-screen hidden md:block p-3 pe-0 z-10">
    <div
        class="rounded-xl h-full bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border shadow-lg transition-all duration-300 ease-in-out flex flex-col { $isCollapsed
            ? 'w-20'
            : 'w-64'}"
    >
        <!-- Header -->
        <div
            class="p-4 border-b border-light-border dark:border-dark-border flex items-center {$isCollapsed ? 'justify-center' : 'justify-between'}"
        >
            {#if !$isCollapsed}
                <h1
                    class="text-2xl font-bold bg-gradient-purple bg-clip-text text-transparent"
                >
                    Trading Journal
                </h1>
            {:else}
                <div class="w-8 h-8 flex items-center justify-center">
                    <div class="w-6 h-6 rounded-md bg-gradient-purple"></div>
                </div>
            {/if}
            <button
                class="text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 dark:hover:text-theme-400 p-2 rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover transition-colors duration-200"
                on:click={toggleCollapse}
                aria-label={$isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
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
        <div class="p-4 border-b border-light-border dark:border-dark-border">
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
                    <div class="flex-shrink-0 relative">
                        <img
                            src={$auth.user.avatar || `https://ui-avatars.com/api/?name=${getUserDisplayName($auth.user)}&background=8b5cf6&color=fff`}
                            alt="Profile"
                            class="w-10 h-10 rounded-full border-2 border-theme-500 object-cover"
                        />
                        <div class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-light-card dark:border-dark-card"></div>
                    </div>
                    {#if !$isCollapsed}
                        <div class="flex-1 min-w-0 my-2" in:fade={{ duration: 200, delay: 100 }}>
                            <div class="flex items-center gap-2">
                                <p class="text-sm font-semibold text-light-text dark:text-dark-text truncate">
                                    {getUserDisplayName($auth.user)}
                                </p>
                                <span class="px-2 py-0.5 text-xs font-semibold rounded-full {getSubscriptionBadgeStyle($subscriptionStore?.type)}">
                                    {formatSubscriptionType($subscriptionStore?.type)}
                                </span>
                            </div>
                            <button
                                class="mt-1 flex items-center gap-1 text-xs text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 dark:hover:text-theme-400 transition-colors duration-200"
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
                <li>
                    <div>
                        <button
                            class="w-full flex items-center {$isCollapsed ? 'justify-center' : ''} px-3 py-2.5 rounded-lg transition-all duration-200
                            {isDashboard
                                ? 'bg-gradient-purple text-white font-medium shadow-lg shadow-theme-500/25'
                                : 'text-light-text-muted dark:text-dark-text-muted hover:bg-light-hover dark:hover:bg-dark-hover hover:text-light-text dark:hover:text-dark-text'}"
                            on:click={() => {
                                if ($isCollapsed) {
                                    goto('/dashboard');
                                } else {
                                    toggleSubmenu();
                                    console.log('Dashboard menu clicked, submenu state:', showDashboardSubmenu);
                                }
                            }}
                        >
                            <div class="flex-shrink-0 {isDashboard ? 'text-white' : 'text-theme-500 dark:text-theme-400'}">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            {#if !$isCollapsed}
                                <span class="ml-3 transition-opacity duration-200" in:fade={{ duration: 200, delay: 50 }}>Dashboard</span>
                                
                                <div class="ml-auto">
                                    {#if showDashboardSubmenu && layouts.length > 0}
                                        <svg class="w-4 h-4 transform rotate-180 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    {:else}
                                        <svg class="w-4 h-4 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    {/if}
                                </div>
                            {/if}
                        </button>

                        {#if !$isCollapsed && showDashboardSubmenu && layouts.length > 0}
                            <div class="mt-1 space-y-1" transition:fade={{ duration: 150 }}>
                                {#each layouts as layout, i}
                                    <a
                                        href="/dashboard?layout={i}"
                                        class="flex items-center px-3 py-1.5 rounded-lg transition-colors duration-200 ml-3
                                            {isActiveLayout(i)
                                                ? 'bg-theme-100 dark:bg-theme-900/40 text-theme-500 dark:text-theme-400'
                                                : 'text-light-text-muted dark:text-dark-text-muted hover:bg-light-hover dark:hover:bg-dark-hover'}"
                                        on:click|preventDefault={() => {
                                            navigateToLayout(i);
                                        }}
                                    >
                                        {#if layout && layout.icon}
                                            <svg class="w-3.5 h-3.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getIconPath(layout.icon)} />
                                            </svg>
                                        {:else}
                                            <svg class="w-3.5 h-3.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getIconPath('dashboard')} />
                                            </svg>
                                        {/if}
                                        <span class="text-xs truncate">{layout ? layout.name : 'Layout'}</span>
                                    </a>
                                {/each}
                            </div>
                        {/if}
                    </div>
                </li>

                {#each menuItems.filter(item => item.path !== '/dashboard') as item}
                    {@const active = isActive(item.path)}
                    <li>
                        <a
                            href={item.path}
                            class="flex items-center {$isCollapsed ? 'justify-center' : ''} px-3 py-2.5 rounded-lg transition-all duration-200
                            {active
                                ? 'bg-gradient-purple text-white font-medium shadow-lg shadow-theme-500/25'
                                : 'text-light-text-muted dark:text-dark-text-muted hover:bg-light-hover dark:hover:bg-dark-hover hover:text-light-text dark:hover:text-dark-text'}"
                        >
                            <div class="flex-shrink-0 {active ? 'text-white' : 'text-theme-500 dark:text-theme-400'}">
                            {@html item.icon}
                            </div>
                            {#if !$isCollapsed}
                                <span class="ml-3 transition-opacity duration-200" in:fade={{ duration: 200, delay: 50 }}>{item.title}</span>
                            {:else}
                                <span class="sr-only">{item.title}</span>
                            {/if}
                            
                            {#if !$isCollapsed && active}
                                <div class="ml-auto">
                                    <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
                                </div>
                            {/if}
                        </a>
                    </li>
                {/each}
            </ul>
        </nav>

        <!-- Footer -->
        <div class="p-4 border-t border-light-border dark:border-dark-border mt-auto">
            <div class="{$isCollapsed ? 'flex flex-col gap-4 items-center' : 'flex items-center justify-between'}">
                <!-- Theme Toggle -->
                <div class="{$isCollapsed ? 'mx-auto' : ''}">
                    <ThemeToggle />
                </div>

                <!-- Logout Button -->
                <button
                    class="{$isCollapsed 
                        ? 'w-full flex items-center justify-center p-2.5 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:bg-light-hover dark:hover:bg-dark-hover hover:text-red-500 dark:hover:text-red-400 transition-colors duration-200'
                        : 'flex items-center gap-2 px-3 py-2.5 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:bg-light-hover dark:hover:bg-dark-hover hover:text-red-500 dark:hover:text-red-400 transition-colors duration-200'}"
                    on:click={handleLogout}
                    aria-label="Logout"
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
                        <span class="transition-opacity duration-200" in:fade={{ duration: 200 }}>Logout</span>
                    {/if}
                </button>
            </div>
        </div>
    </div>
</aside>
