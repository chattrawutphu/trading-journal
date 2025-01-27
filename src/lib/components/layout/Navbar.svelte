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
    import { api } from '$lib/utils/api';

    let showAccountMenu = false;
    let accountMenuRef;
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

    // เพิ่มฟังก์ชันสำหรับ reload account balance
    async function reloadAccountBalance() {
        if (!$accountStore.currentAccount?._id) return;
        
        try {
            // Reload account data to get updated balance
            await accountStore.setCurrentAccount($accountStore.currentAccount._id);
        } catch (err) {
            console.error('Error reloading account balance:', err);
        }
    }

    onMount(() => {
        // Subscribe to layout updates
        window.addEventListener('layoutupdate', reloadAccountBalance);
        
        // Check localStorage for previous warning dismissal
        warningDismissed = localStorage.getItem('subscriptionWarningDismissed') === 'true';

        return () => {
            window.removeEventListener('layoutupdate', reloadAccountBalance);
        };
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
  
<nav class="hidden md:block">
    <div class="mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-end gap-x-4 h-12">
            <!-- Account Selector -->
            <div class="flex gap-4">
                <!-- Balance Display and Deposit/Withdraw Buttons -->
                <div class="flex items-center space-x-4">
                    {#if $auth?.isAuthenticated && $accountStore?.currentAccount}
                        <div class="flex items-center gap-2">

                            <div class="text-light-text dark:text-dark-text">
                                <span class="text-light-text-muted text-sm dark:text-dark-text-muted mr-2">Balance:</span>
                                <span class="font-semibold text-theme-500">{formatBalance($accountStore.currentAccount.actualBalance)}</span>
                            </div>
                            <!-- Added Deposit and Withdraw Buttons -->
                            <div class="flex items-center gap-1">
                                <Button variant="secondary" size="xs" on:click={() => showDepositModal = true}>
                                    <svg class="w-3 h-3 " fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                    </svg>
                                </Button>
                                <Button variant="secondary" size="xs" on:click={() => showWithdrawModal = true}>
                                    <svg class="w-3 h-3 " fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
                                    </svg>
                                </Button>
                            </div>
                        </div>
                    {/if}
                </div>
                <div class="flex items-center space-x-4 gap-4">
                    {#if $auth?.isAuthenticated}
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
                                <div class="absolute right-0 mt-2 w-64 rounded-lg shadow-lg bg-light-card dark:bg-dark-card border border-light-border dark:border-0 ring-1 ring-black ring-opacity-5 z-50 ">
                                    <AccountManager on:close={() => showAccountMenu = false} />
                                </div>
                            {/if}
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </div>
</nav>

<!-- Deposit Modal -->
<TransactionModal
    show={showDepositModal}
    type="deposit"
    accountId={$accountStore.currentAccount?._id}
    on:close={() => showDepositModal = false}
/>

<!-- Withdraw Modal -->
<TransactionModal
    show={showWithdrawModal}
    type="withdraw"
    accountId={$accountStore.currentAccount?._id}
    on:close={() => showWithdrawModal = false}
/>
