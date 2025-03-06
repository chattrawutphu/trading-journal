<script>
    import { page } from "$app/stores";
    import { createEventDispatcher } from "svelte";
    import { writable } from "svelte/store";
    import { auth } from '$lib/stores/authStore';
    import { subscriptionStore } from '$lib/stores/subscriptionStore';
    import { layoutStore } from '$lib/stores/layoutStore';
    import { goto } from '$app/navigation';
    import { theme, THEMES } from '$lib/stores/themeStore';
    import { menuItems } from '../../data/menuItems.js';
    import { onMount } from 'svelte';
    import { fade, fly } from 'svelte/transition';
    
    // Add subscription badge styles
    const subscriptionBadgeStyles = {
        'basic': 'bg-gray-100 dark:bg-gray-800/40 text-gray-800 dark:text-gray-300',
        'pro': 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',
        'pro+': 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300'
    };

    const dispatch = createEventDispatcher();
    export let collapsed = false;
    export let key = ''; // Add key prop for forcing component reload

    const isCollapsed = writable(collapsed);
    
    // Theme dropdown state
    let showThemeDropdown = false;
    let themeButtonEl;
    let dropdownPosition = { top: 'bottom', left: 'left' };

    function toggleCollapse() {
        collapsed = !collapsed;
        isCollapsed.set(collapsed);
        dispatch("collapse", collapsed);
    }
    
    function setTheme(newTheme) {
        theme.set(newTheme);
        showThemeDropdown = false;
    }
    
    function toggleThemeDropdown() {
        if (!showThemeDropdown) {
            calculateDropdownPosition();
        }
        showThemeDropdown = !showThemeDropdown;
    }
    
    function calculateDropdownPosition() {
        if (!themeButtonEl) return;
        
        const rect = themeButtonEl.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        // Calculate if there's enough space below
        const spaceBelow = viewportHeight - rect.bottom;
        // Dropdown height (approximately 3 items * 36px)
        const dropdownHeight = 108;
        
        // Calculate horizontal position
        const spaceRight = viewportWidth - rect.left;
        const dropdownWidth = 160; // w-40 = 10rem = 160px
        
        dropdownPosition = {
            top: spaceBelow >= dropdownHeight ? 'bottom' : 'top',
            left: spaceRight >= dropdownWidth ? 'left' : 'right'
        };
    }
    
    // Click outside handler for theme dropdown
    function handleClickOutside(event) {
        if (showThemeDropdown && !event.target.closest('.theme-dropdown')) {
            showThemeDropdown = false;
        }
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
        // console.log(`CollapsibleSidebar reloaded with key: ${key}`);
        
        // Force re-evaluation of active layout
        const urlLayoutParam = $page.url.searchParams.get('layout');
        if (urlLayoutParam !== null) {
            const layoutIndex = parseInt(urlLayoutParam);
            if (!isNaN(layoutIndex) && layoutIndex >= 0) {
                // console.log(`Setting active layout to ${layoutIndex} from URL param`);
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
            // console.log('Layout change event received:', event.detail);
            if (event.detail && event.detail.layoutIndex !== undefined) {
                // Force re-render of the component
                showDashboardSubmenu = true; // Ensure submenu is visible
            }
        };
        
        window.addEventListener('layoutchange', handleLayoutChange);
        
        // Add click outside listener for theme dropdown
        document.addEventListener('click', handleClickOutside);
        
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
            // Remove click outside listener
            document.removeEventListener('click', handleClickOutside);
        };
    });

    // แก้ไขฟังก์ชัน isActiveLayout ให้ตรวจสอบทั้ง URL parameter และค่าจาก layoutStore
    $: isActiveLayout = (layoutIndex) => {
        // Always check URL parameter first
        const urlLayoutParam = $page.url.searchParams.get('layout');
        if (urlLayoutParam !== null) {
            const isActive = urlLayoutParam === layoutIndex.toString();
            if (isActive) {
                // console.log(`Layout ${layoutIndex} is active from URL param: ${urlLayoutParam}`);
            }
            return isActive;
        }
        
        // ตรวจสอบจาก layoutStore (ถ้ามีการกำหนดค่าไว้)
        if (layoutStoreData && layoutStoreData.activeLayoutIndex !== undefined) {
            const isActive = layoutIndex === layoutStoreData.activeLayoutIndex;
            if (isActive) {
                // console.log(`Layout ${layoutIndex} is active from layoutStore: ${layoutStoreData.activeLayoutIndex}`);
            }
            return isActive;
        }
        
        // ค่าเริ่มต้น: ถ้าเป็นหน้า Dashboard และเป็น layout แรก
        const isDefault = isDashboard && layoutIndex === 0 && !urlLayoutParam;
        if (isDefault) {
            // console.log(`Layout ${layoutIndex} is active by default`);
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
        const lowerType = type.toLowerCase();
        if (lowerType === 'pro_plus') return 'pro+';
        return lowerType;
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
            // console.log('Toggled submenu:', showDashboardSubmenu);
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
        class="rounded-xl h-full bg-light-card dark:bg-dark-card shadow-lg flex flex-col { $isCollapsed
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
                        class="sweet:hidden"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d={$isCollapsed
                            ? "M13 5l7 7-7 7M5 5l7 7-7 7"
                            : "M11 19l-7-7 7-7m8 14l-7-7 7-7"}
                    />
                    <path
                        class="hidden sweet:block"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d={$isCollapsed
                            ? "M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z"
                            : "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"}
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
                                <span class="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded {getSubscriptionBadgeStyle($subscriptionStore?.type)}">
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
                                    // console.log('Dashboard menu clicked, submenu state:', showDashboardSubmenu);
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
                <!-- Theme Dropdown -->
                <div class="relative theme-dropdown {$isCollapsed ? 'mx-auto' : ''}">
                    <button
                        bind:this={themeButtonEl}
                        on:click|stopPropagation={toggleThemeDropdown}
                        class="p-2 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-light-text hover:dark:text-dark-text hover:bg-light-hover dark:hover:bg-dark-hover flex items-center gap-2"
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
                        
                        {#if !$isCollapsed}
                            <span class="text-sm">Theme</span>
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        {/if}
                    </button>
                    
                    {#if showThemeDropdown}
                        <div 
                            class="absolute w-40 bg-light-card dark:bg-dark-card shadow-lg rounded-lg border border-light-border dark:border-dark-border overflow-hidden z-50"
                            class:bottom-full={dropdownPosition.top === 'top'}
                            class:top-full={dropdownPosition.top === 'bottom'}
                            class:left-0={dropdownPosition.left === 'left'}
                            class:right-0={dropdownPosition.left === 'right'}
                            class:mb-1={dropdownPosition.top === 'top'}
                            class:mt-1={dropdownPosition.top === 'bottom'}
                            transition:fade={{ duration: 150 }}
                        >
                            <button 
                                class="w-full px-3 py-2 text-left flex items-center gap-2 text-sm hover:bg-light-hover dark:hover:bg-dark-hover {$theme === THEMES.LIGHT ? 'bg-light-hover dark:bg-dark-hover' : ''}"
                                on:click={() => setTheme(THEMES.LIGHT)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                                <span>Light</span>
                            </button>
                            <button 
                                class="w-full px-3 py-2 text-left flex items-center gap-2 text-sm hover:bg-light-hover dark:hover:bg-dark-hover {$theme === THEMES.DARK ? 'bg-light-hover dark:bg-dark-hover' : ''}"
                                on:click={() => setTheme(THEMES.DARK)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                <span>Dark</span>
                            </button>
                            <button 
                                class="w-full px-3 py-2 text-left flex items-center gap-2 text-sm hover:bg-light-hover dark:hover:bg-dark-hover {$theme === THEMES.SWEET ? 'bg-light-hover dark:bg-dark-hover' : ''}"
                                on:click={() => setTheme(THEMES.SWEET)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                <span>Sweet</span>
                            </button>
                        </div>
                    {/if}
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
