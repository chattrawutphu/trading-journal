<script>
    import { page } from "$app/stores";
    import { createEventDispatcher } from "svelte";
    import { writable } from "svelte/store";
    import ThemeToggle from '../common/ThemeToggle.svelte';
    import { menuItems } from '../../data/menuItems.js'; // Import menuItems

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
</script>

<aside class="h-screen hidden sm:block p-3 pe-0">
    <div
        class="rounded-md h-full bg-light-card dark:bg-dark-card border-r border-light-border dark:border-dark-border flex flex-col { $isCollapsed
            ? 'w-20'
            : 'w-64'}"
    >
        <!-- Header -->
        <div
            class="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between"
        >
            {#if !$isCollapsed}
                <h1
                    class="text-xl font-bold bg-gradient-purple bg-clip-text text-transparent"
                >
                    Trading Journal
                </h1>
            {/if}
            <button
                class="text-light-text dark:text-dark-text hover:text-theme-500 dark:hover:text-theme-400 p-2 rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover"
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

        <!-- Navigation -->
        <nav class="flex-1 overflow-y-auto py-4">
            <ul class="space-y-1 px-3">
                {#each menuItems as item}
                    {@const active = isActive(item.path)}
                    <li>
                        <a
                            href={item.path}
                            class="flex items-center px-3 py-2 rounded-lg
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
        <div class="p-4 border-t border-light-border dark:border-dark-border flex items-center justify-between">
            <!-- Theme Toggle -->
            <ThemeToggle />

            <!-- Logout Button -->
            <button
                class="w-full flex items-center justify-center px-3 py-2 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:bg-light-hover dark:hover:bg-dark-hover hover:text-light-text dark:hover:text-dark-text"
                on:click={() => dispatch("logout")}
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
</aside>
