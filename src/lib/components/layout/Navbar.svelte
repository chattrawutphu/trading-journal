<script>
    import { auth } from '$lib/stores/authStore';
    import { accountStore } from '$lib/stores/accountStore';
    import { subscriptionStore } from '$lib/stores/subscriptionStore';
    import { SUBSCRIPTION_FEATURES, SUBSCRIPTION_TYPES } from '$lib/config/subscription';
    import { goto } from '$app/navigation';
    import AccountManager from '../accounts/AccountManager.svelte';
    import Button from '../common/Button.svelte'; // Added import for Button component
    import TransactionModal from '../transactions/TransactionModal.svelte'; // Added import for TransactionModal component
    import { onMount } from 'svelte';
  
    let showAccountMenu = false;
    let showUserMenu = false;
    let accountMenuRef;
    let userMenuRef;
    let showSubscriptionWarning = false;
    let warningDismissed = false;
    let showDepositModal = false; // Added for deposit modal
    let showWithdrawModal = false; // Added for withdraw modal

    function handleLogout() {
      auth.logout();
      goto('/login');
    }

    function handleClickOutside(event) {
      if (accountMenuRef && !accountMenuRef.contains(event.target)) {
        showAccountMenu = false;
      }
      if (userMenuRef && !userMenuRef.contains(event.target)) {
        showUserMenu = false;
      }
    }

    function formatBalance(balance) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(balance || 0);
    }

    // Check if subscription is near expiry (within 7 days)
    function isSubscriptionNearExpiry(endDate) {
        if (!endDate) return false;
        const expiryDate = new Date(endDate);
        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        return expiryDate <= sevenDaysFromNow && expiryDate > now;
    }

    // Dismiss warning and save to localStorage
    function dismissWarning() {
        warningDismissed = true;
        localStorage.setItem('subscriptionWarningDismissed', 'true');
    }

    // Reset localStorage warning when a new invoice is created
    function resetWarningDismissal() {
        localStorage.removeItem('subscriptionWarningDismissed');
        warningDismissed = false;
    }

    $: subscriptionBadge = SUBSCRIPTION_FEATURES[$subscriptionStore?.type];

    // Add badge styles mapping
    const subscriptionBadgeStyles = {
        [SUBSCRIPTION_TYPES.BASIC]: 'bg-gray-200 text-gray-800',
        [SUBSCRIPTION_TYPES.PRO]: 'bg-blue-200 text-blue-800',
        [SUBSCRIPTION_TYPES.PRO_PLUS]: 'bg-purple-200 text-purple-800'
    };

    // Helper function to get badge style
    function getSubscriptionBadgeStyle(type) {
        return subscriptionBadgeStyles[type] || subscriptionBadgeStyles[SUBSCRIPTION_TYPES.BASIC];
    }

    // Add function to format subscription type
    function formatSubscriptionType(type) {
        if (!type) return 'basic';
        return type.toLowerCase();
    }

    onMount(() => {
        // Check localStorage for previous warning dismissal
        warningDismissed = localStorage.getItem('subscriptionWarningDismissed') === 'true';
    });

    // Reactive statement to check subscription expiry
    $: {
        if ($subscriptionStore?.endDate && 
            isSubscriptionNearExpiry($subscriptionStore.endDate) && 
            !warningDismissed) {
            showSubscriptionWarning = true;
        } else {
            showSubscriptionWarning = false;
        }
    }
</script>

<svelte:window on:click={handleClickOutside}/>

{#if showSubscriptionWarning}
<div class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 fixed top-0 left-0 right-0 z-50" role="alert">
    <div class="flex items-center justify-between">
        <p>
            <strong>Subscription Expiring Soon!</strong> 
            Your subscription will expire in less than 7 days. 
            <a href="/subscription" class="underline ml-2">Renew Now</a>
        </p>
        <button 
            on:click={dismissWarning}
            class="text-yellow-700 hover:text-yellow-900 ml-4"
        >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        </button>
    </div>
</div>
{/if}
  
<nav class>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-end gap-x-4 h-16">
            <!-- Balance Display -->
            {#if $auth?.isAuthenticated && $accountStore?.currentAccount}
                <div class="flex items-center">
                    <div class="text-light-text dark:text-dark-text">
                        <span class="text-light-text-muted dark:text-dark-text-muted mr-2">Balance:</span>
                        <span class="font-semibold text-theme-500">{formatBalance($accountStore.currentAccount.actualBalance)}</span>
                    </div>
                    <!-- Added Deposit and Withdraw Buttons -->
                    <div class="flex items-center gap-1 ml-4">
                        <Button variant="secondary" size="xs" on:click={() => showDepositModal = true}>
                            <svg class="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                            </svg>
                            Deposit
                        </Button>
                        <Button variant="secondary" size="xs" on:click={() => showWithdrawModal = true}>
                            <svg class="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
                            </svg>
                            Withdraw
                        </Button>
                    </div>
                </div>
            {/if}

            {#if $auth?.isAuthenticated}
                <div class="flex items-center space-x-4">
                    <!-- Account Selector -->
                    <div class="relative" bind:this={accountMenuRef}>
                        <button 
                            class="flex items-center space-x-2 text-light-text dark:text-dark-text hover:text-theme-500 dark:hover:text-theme-400 "
                            on:click|stopPropagation={() => showAccountMenu = !showAccountMenu}
                        >
                            <span>{$accountStore?.currentAccount?.name || 'Select Account'}</span>
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                            </svg>
                        </button>
  
                        {#if showAccountMenu}
                            <div class="absolute right-0 mt-2 w-64 rounded-lg shadow-lg bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border ring-1 ring-black ring-opacity-5 z-50 ">
                                <AccountManager on:close={() => showAccountMenu = false} />
                            </div>
                        {/if}
                    </div>
  
                    <!-- User Menu -->
                    <div class="relative" bind:this={userMenuRef}>
                        <button class="flex items-center space-x-2 text-light-text dark:text-dark-text hover:text-theme-500 dark:hover:text-theme-400 "
                            on:click|stopPropagation={() => showUserMenu = !showUserMenu}
                        >
                            <span>{$auth?.user?.name || 'User'}</span>
                            <span class="px-2 py-0.5 text-xs font-semibold rounded-full {getSubscriptionBadgeStyle($subscriptionStore?.type)}">
                                {formatSubscriptionType($subscriptionStore?.type)}
                            </span>
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                            </svg>
                        </button>
  
                        {#if showUserMenu}
                            <div class="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border ring-1 ring-black ring-opacity-5 z-50 ">
                                <button
                                    class="block w-full text-left px-4 py-2 text-sm text-light-text dark:text-dark-text hover:bg-light-hover dark:hover:bg-dark-hover "
                                    on:click={() => goto('/profile')}
                                >
                                    Profile Settings
                                </button>
                                <button
                                    class="block w-full text-left px-4 py-2 text-sm text-light-text dark:text-dark-text hover:bg-light-hover dark:hover:bg-dark-hover "
                                    on:click={() => goto('/subscription')}
                                >
                                    Subscription
                                </button>
                                <button
                                    class="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-light-hover dark:hover:bg-dark-hover "
                                    on:click={handleLogout}
                                >
                                    Logout
                                </button>
                            </div>
                        {/if}
                    </div>
                </div>
            {/if}
        </div>
    </div>
</nav>

<!-- Deposit Modal -->
<TransactionModal
    show={showDepositModal}
    type="deposit"
    accountId={$accountStore.currentAccount._id}
    on:close={() => showDepositModal = false}
/>

<!-- Withdraw Modal -->
<TransactionModal
    show={showWithdrawModal}
    type="withdraw"
    accountId={$accountStore.currentAccount._id}
    on:close={() => showWithdrawModal = false}
/>
