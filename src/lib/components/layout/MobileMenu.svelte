<script>
    import { auth } from '$lib/stores/authStore';
    import { accountStore } from '$lib/stores/accountStore';
    import { subscriptionStore } from '$lib/stores/subscriptionStore';
    import { menuItems } from '../../data/menuItems.js';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import ThemeToggle from '../common/ThemeToggle.svelte';
    import AccountManager from '../accounts/AccountManager.svelte';
    import Button from '../common/Button.svelte';
    import TransactionModal from '../transactions/TransactionModal.svelte';
    import { fade, fly, slide } from 'svelte/transition';
    import { quintOut } from 'svelte/easing';

    let isOpen = false;
    let showDepositModal = false;
    let showWithdrawModal = false;
    let showAccountMenu = false;

    function toggleMenu() {
        isOpen = !isOpen;
    }

    function handleLogout() {
        auth.logout();
        goto('/login');
        isOpen = false;
    }

    function formatBalance(balance) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(balance || 0);
    }

    $: isActive = (path) => $page.url.pathname === path;

    function getUserDisplayName(user) {
        if (!user) return 'User';
        if (user.email) {
            return user.email.split('@')[0];
        }
        return 'User';
    }
</script>

<!-- Mobile Header -->
<div class="md:hidden flex items-center p-0.5 border-b border-light-border dark:border-0 bg-light-card dark:bg-dark-card">
    <button
        class="text-light-text-muted dark:text-dark-text-muted p-2 hover:bg-light-hover dark:hover:bg-dark-hover rounded-lg"
        on:click={toggleMenu}
    >
        {#if !isOpen}
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
        {:else}
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
        {/if}
    </button>
</div>

<!-- Mobile Menu -->
{#if isOpen}
    <div class="fixed inset-0 z-50 md:hidden" transition:fade={{ duration: 200 }}>
        <div 
            class="absolute inset-0 bg-black/50" 
            on:click={toggleMenu}
            transition:fade={{ duration: 200 }}
        ></div>
        
        <div 
            class="absolute flex flex-col  left-0 top-0 w-64 h-full bg-light-card dark:bg-dark-card overflow-y-auto"
            transition:fly={{ x: -320, duration: 300, easing: quintOut }}
        >
            <!-- User Profile Section -->
            <div class="p-4 border-b border-light-border dark:border-0">
                <div class="flex items-center gap-3">
                    <img
                        src={$auth?.user?.avatar || 'https://ui-avatars.com/api/?name=' + getUserDisplayName($auth?.user)}
                        alt="Profile"
                        class="w-10 h-10 rounded-full border-2 border-theme-500"
                    />
                    <div class="flex-1">
                        <p class="font-semibold text-light-text dark:text-dark-text">
                            {getUserDisplayName($auth?.user)}
                        </p>
                        <button
                            class="text-sm text-light-text-muted dark:text-dark-text-muted hover:text-theme-500"
                            on:click={() => {
                                goto('/profile');
                                isOpen = false;
                            }}
                        >
                            View Profile
                        </button>
                    </div>
                </div>
            </div>

            <!-- Account Section -->
            {#if $auth?.isAuthenticated && $accountStore?.currentAccount}
                <div class="p-4 border-b border-light-border dark:border-0">
                    <!-- Account Selector -->
                    <button 
                        class="w-full flex items-center justify-between mb-2"
                        on:click={() => showAccountMenu = !showAccountMenu}
                    >
                        <div class="flex items-center gap-2">
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Account:</div>
                            <div class="font-medium text-light-text dark:text-dark-text">
                                {$accountStore?.currentAccount?.name || 'Select Account'}
                            </div>
                        </div>
                        <svg 
                            class="w-4 h-4 text-light-text-muted transition-transform duration-200 {showAccountMenu ? 'rotate-180' : ''}" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                    </button>

                    {#if showAccountMenu}
                        <div 
                            class="mb-2 border-t border-light-border dark:border-0 pt-2"
                            transition:slide={{ duration: 200 }}
                        >
                            <AccountManager on:close={() => showAccountMenu = false} />
                        </div>
                    {/if}

                    <!-- Balance with Transaction Buttons -->
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Balance:</div>
                            <div class="font-semibold text-theme-500">
                                {formatBalance($accountStore.currentAccount.actualBalance)}
                            </div>
                        </div>
                        <div class="flex gap-1">
                            <button 
                                class="p-1.5 rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover text-light-text-muted dark:text-dark-text-muted"
                                on:click={() => showDepositModal = true}
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                </svg>
                            </button>
                            <button 
                                class="p-1.5 rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover text-light-text-muted dark:text-dark-text-muted"
                                on:click={() => showWithdrawModal = true}
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            {/if}

            <!-- Navigation Menu -->
            <nav class="p-4 flex-1 ">
                <ul class="space-y-2">
                    {#each menuItems as item}
                        {@const active = isActive(item.path)}
                        <li>
                            <a
                                href={item.path}
                                class="flex items-center px-3 py-2 rounded-lg {active
                                    ? 'bg-gradient-purple text-white'
                                    : 'text-light-text-muted dark:text-dark-text-muted hover:bg-light-hover dark:hover:bg-dark-hover'}"
                                on:click={() => isOpen = false}
                            >
                                {@html item.icon}
                                <span class="ml-3">{item.title}</span>
                            </a>
                        </li>
                    {/each}
                </ul>
            </nav>

            <!-- Footer Actions -->
            <div class="p-4 border-t border-light-border dark:border-0">
                <div class="flex items-center justify-between mb-4">
                    <span class="text-light-text-muted dark:text-dark-text-muted">Theme</span>
                    <ThemeToggle />
                </div>
                <button
                    class="w-full flex items-center justify-center px-3 py-2 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:bg-light-hover dark:hover:bg-dark-hover"
                    on:click={handleLogout}
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                    </svg>
                    <span class="ml-3">Logout</span>
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- Transaction Modals -->
<TransactionModal
    show={showDepositModal}
    type="deposit"
    accountId={$accountStore?.currentAccount?._id}
    on:close={() => showDepositModal = false}
/>

<TransactionModal
    show={showWithdrawModal}
    type="withdraw"
    accountId={$accountStore?.currentAccount?._id}
    on:close={() => showWithdrawModal = false}
/>

<style>
    /* Add easing function */
    @keyframes slideIn {
        from {
            transform: translateX(-100%);
        }
        to {
            transform: translateX(0);
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
        }
        to {
            transform: translateX(-100%);
        }
    }
</style>
