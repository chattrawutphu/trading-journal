<script>
    import { createEventDispatcher } from "svelte";
    import { fade, fly } from "svelte/transition";
    import { accountStore } from "$lib/stores/accountStore";
    import { transactionStore } from "$lib/stores/transactionStore";
    import { tradingStatsConfig } from "$lib/utils/widgetUtils";
    import { accountSymbolStore } from "$lib/stores/accountSymbolStore";
    import { userStrategyStore } from "$lib/stores/userStrategyStore";
    import { api } from "$lib/utils/api";
    import Button from "../common/Button.svelte";
    import Input from "../common/Input.svelte";
    import Loading from "../common/Loading.svelte";
    import { subscriptionStore } from '$lib/stores/subscriptionStore';
    import { SUBSCRIPTION_TYPES } from '$lib/config/subscription';
    import Modal from '../common/Modal.svelte';
    import LimitReachedModal from '../common/LimitReachedModal.svelte';
    import NewAccountModal from './NewAccountModal.svelte';
    import { formatTrades, syncTrades } from '$lib/utils/importTrades';

    const dispatch = createEventDispatcher();

    let showNewAccountModal = false;
    let showEditAccountModal = false;
    let newAccountName = "";
    let newAccountBalance = 0;
    let editingAccount = null;
    let error = "";
    let switchingAccount = false;
    let showUpgradeModal = false;
    let loading = false;
    let toastType = null;
    let toastMessage = "";
    let showToast = false;

    async function handleCreateAccount() {
        if ($subscriptionStore.type === SUBSCRIPTION_TYPES.BASIC && $accountStore.accounts.length > 0) {
            showUpgradeModal = true;
            return;
        }

        if (newAccountName.trim()) {
            try {
                error = "";
                await accountStore.createAccount({
                    name: newAccountName,
                    balance: parseFloat(newAccountBalance) || 0,
                });
                newAccountName = "";
                newAccountBalance = 0;
                showNewAccountModal = false;
                dispatch("close");
            } catch (err) {
                error = err.message;
            }
        }
    }

    async function handleUpdateAccount() {
        if (editingAccount && editingAccount.name.trim()) {
            try {
                error = "";
                await accountStore.updateAccount(editingAccount._id, {
                    name: editingAccount.name,
                    apiKey: editingAccount.apiKey,
                    secretKey: editingAccount.secretKey,
                    excludeZeroPnL: editingAccount.excludeZeroPnL
                });
                showEditAccountModal = false;
                editingAccount = null;
            } catch (err) {
                error = err.message;
            }
        }
    }

    async function handleDeleteAccount(accountId) {
        if (
            confirm(
                "Are you sure you want to delete this account? This will delete all trades, layouts, and other data associated with this account.",
            )
        ) {
            try {
                error = "";
                await api.deleteAccount(accountId);
                
                // Refresh the account list
                await accountStore.loadAccounts();
                
                // If the deleted account was the current account, set a new current account
                if ($accountStore.currentAccount?._id === accountId) {
                    if ($accountStore.accounts.length > 0) {
                        await accountStore.setCurrentAccount($accountStore.accounts[0]._id);
                    } else {
                        accountStore.setCurrentAccount(null);
                    }
                }
            } catch (err) {
                error = err.message;
            }
        }
    }

    function startEditAccount(account) {
        editingAccount = { ...account };
        showEditAccountModal = true;
    }

    async function handleAccountSwitch(accountId) {
        try {
            error = "";
            switchingAccount = true;

            // Set current account
            await accountStore.setCurrentAccount(accountId);

            // Reload all data for the new account
            await Promise.all([
                // Load transactions
                transactionStore.fetchTransactions(accountId),

                // Load trades
                api.getTrades(accountId),

                // Load account symbols
                accountSymbolStore.loadSymbols(accountId),

                // Load user strategies
                userStrategyStore.loadStrategies(accountId),
            ]);

            // Trigger trade update event to refresh stats
            window.dispatchEvent(new CustomEvent("tradeupdate"));

            dispatch("close");
        } catch (err) {
            error = err.message;
        } finally {
            switchingAccount = false;
        }
    }

    function handleAddAccount() {
        if ($subscriptionStore.type === SUBSCRIPTION_TYPES.BASIC && $accountStore.accounts.length > 0) {
            showUpgradeModal = true;
        } else {
            showNewAccountModal = true;
        }
    }

    function upgradePlan() {
        showUpgradeModal = false;
        showNewAccountModal = false;
        goto('/settings/subscription');
    }

    async function handleSyncTrades(accountId) {
        try {
            error = "";
            loading = true;

            const result = await syncTrades(accountId, api);
            
            toastType = result.type;
            toastMessage = result.message;
            showToast = true;

            if (result.success && result.newTradesCount > 0) {
                // Refresh data
                await Promise.all([
                    transactionStore.fetchTransactions(accountId),
                    api.getTrades(accountId)
                ]);

                // Trigger trade update event
                window.dispatchEvent(new CustomEvent("tradeupdate"));
            }

        } catch (err) {
            console.error('Error syncing trades:', err);
            error = err.message;
            toastType = 'error';
            toastMessage = `Error syncing trades: ${err.message}`;
            showToast = true;
        } finally {
            loading = false;
        }
    }
</script>

{#if switchingAccount}
    <div
        class="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center"
    >
        <Loading message="Switching account..." />
    </div>
{/if}

<div class="space-y-2">
    <!-- Error Message -->
    {#if error}
        <div
            class="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-3 rounded-lg"
        >
            <div class="flex">
                <svg
                    class="w-5 h-5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path
                        fill-rule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clip-rule="evenodd"
                    />
                </svg>
                <span>{error}</span>
            </div>
            <button
                class="float-right text-red-500 hover:text-red-400"
                on:click={() => (error = "")}
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
                        d="M6 18L18 6M6 6l12 12"
                    />
                </svg>
            </button>
        </div>
    {/if}

    <!-- Account List -->
    {#if $accountStore.loading}
        <div class="px-4 py-2">
            <Loading size="sm" message="Loading accounts..." />
        </div>
    {:else if $accountStore.accounts.length > 0}
        <div class="flex flex-col gap-0.5 p-2">
            {#each $accountStore.accounts as account}
                <div
                    class="flex items-center justify-between px-2 py-1.5 rounded text-sm
                           {$accountStore.currentAccount?._id === account._id 
                               ? 'bg-theme-500 text-white' 
                               : 'bg-light-hover/50 dark:bg-dark-hover/50 hover:bg-light-hover dark:hover:bg-dark-hover text-light-text dark:text-dark-text'}"
                >
                    <button
                        class="flex items-center gap-2 flex-grow text-left text-xs"
                        class:font-medium={$accountStore.currentAccount?._id === account._id}
                        on:click={() => handleAccountSwitch(account._id)}
                    >
                        <!-- Account Icon -->
                        <div class="p-1.5 rounded-lg {$accountStore.currentAccount?._id === account._id ? 'bg-white/20' : 'bg-theme-500/10'}">
                            {#if account.type === 'BINANCE_FUTURES'}
                                <svg class="w-3.5 h-3.5 {$accountStore.currentAccount?._id === account._id ? 'text-white' : 'text-[#F3BA2F]'}" 
                                     viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0L7.272 4.728L12 9.456L16.728 4.728L12 0Z"/>
                                    <path d="M2.544 9.456L7.272 14.184L12 9.456L7.272 4.728L2.544 9.456Z"/>
                                    <path d="M12 9.456L16.728 14.184L21.456 9.456L16.728 4.728L12 9.456Z"/>
                                    <path d="M12 18.912L16.728 14.184L12 9.456L7.272 14.184L12 18.912Z"/>
                                </svg>
                            {:else if account.type === 'BYBIT'}
                                <svg class="w-3.5 h-3.5 {$accountStore.currentAccount?._id === account._id ? 'text-white' : 'text-[#00b4c9]'}" 
                                     viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19.4,8.3L19.4,8.3L19.4,8.3l0,0c0,0-1.7,0-3.2,0c-1.5,0-2.7,1.2-2.7,2.7v3.2c0,1.5,1.2,2.7,2.7,2.7h3.2
                                           c1.5,0,2.7-1.2,2.7-2.7v-3.2C22.1,9.5,20.9,8.3,19.4,8.3z M19.4,14.8h-3.2v-3.2h3.2V14.8z"/>
                                    <path d="M7.8,8.3L7.8,8.3L7.8,8.3l0,0c0,0-1.7,0-3.2,0C3.1,8.3,1.9,9.5,1.9,11v3.2c0,1.5,1.2,2.7,2.7,2.7h3.2
                                           c1.5,0,2.7-1.2,2.7-2.7V11C10.5,9.5,9.3,8.3,7.8,8.3z M7.8,14.8H4.6v-3.2h3.2V14.8z"/>
                                </svg>
                            {:else if account.type === 'OKEX'}
                                <svg class="w-3.5 h-3.5 {$accountStore.currentAccount?._id === account._id ? 'text-white' : 'text-[#121212] dark:text-white'}" 
                                     viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12,2C6.48,2,2,6.48,2,12c0,5.52,4.48,10,10,10s10-4.48,10-10C22,6.48,17.52,2,12,2z M12,18
                                           c-3.31,0-6-2.69-6-6s2.69-6,6-6s6,2.69,6,6S15.31,18,12,18z"/>
                                </svg>
                            {:else if ['MT4', 'MT5'].includes(account.type)}
                                <svg class="w-3.5 h-3.5 {$accountStore.currentAccount?._id === account._id ? 'text-white' : 'text-blue-500'}" 
                                     viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                                </svg>
                            {:else}
                                <svg class="w-3.5 h-3.5 {$accountStore.currentAccount?._id === account._id ? 'text-white' : 'text-theme-500'}" 
                                     viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                                </svg>
                            {/if}
                        </div>
                        <span>{account.name}</span>
                    </button>
                    <div class="flex items-center gap-0.5">
                        {#if account.type === 'BINANCE_FUTURES'}
                            <button
                                class="p-0.5 rounded-full {$accountStore.currentAccount?._id === account._id 
                                    ? 'hover:bg-white/20' 
                                    : 'hover:bg-theme-500/20 hover:text-theme-500 dark:hover:text-theme-400'}"
                                on:click|stopPropagation={() => handleSyncTrades(account._id)}
                                title="Sync Trades"
                            >
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        {/if}
                        <button
                            class="p-0.5 rounded-full {$accountStore.currentAccount?._id === account._id 
                                ? 'hover:bg-white/20' 
                                : 'hover:bg-theme-500/20 hover:text-theme-500 dark:hover:text-theme-400'}"
                            on:click|stopPropagation={() => startEditAccount(account)}
                            title="Edit Account"
                        >
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        <button
                            class="p-0.5 rounded-full {$accountStore.currentAccount?._id === account._id 
                                ? 'hover:bg-white/20' 
                                : 'hover:bg-red-500/20 hover:text-red-500 dark:hover:text-red-400'}"
                            on:click|stopPropagation={() => handleDeleteAccount(account._id)}
                            title="Delete Account"
                        >
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    {:else}
        <div class="px-3 py-2 text-xs text-light-text-muted dark:text-dark-text-muted">
            No accounts yet
        </div>
    {/if}

    <!-- Add Account Button -->
    <div class="px-2 pb-2">
        <button
            class="w-full px-2 py-1.5 text-xs font-medium rounded
                   bg-theme-500/10 text-theme-500 dark:text-theme-400
                   hover:bg-theme-500/20 transition-colors"
            on:click={handleAddAccount}
        >
            <div class="flex items-center justify-center gap-1.5">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                Add Account
            </div>
        </button>
    </div>
</div>

<!-- New Account Modal -->
{#if showNewAccountModal}
    <NewAccountModal 
        bind:show={showNewAccountModal}
        on:close={() => showNewAccountModal = false}
    />
{/if}

<!-- Edit Account Modal -->
{#if showEditAccountModal && editingAccount}
    <div
        class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center overflow-y-auto p-4"
        transition:fade={{ duration: 150 }}
    >
        <div class="min-h-[calc(100vh-2rem)] flex items-center justify-center py-8">
            <div class="card w-full max-w-md relative">
                <!-- Header - Fixed at top -->
                <div class="px-8 py-5 border-b border-light-border dark:border-0 flex justify-between items-center sticky top-0 bg-light-card dark:bg-dark-card z-20">
                    <div>
                        <h2 class="text-2xl font-bold bg-gradient-purple bg-clip-text text-transparent">
                    Edit Account
                </h2>
                        <p class="text-sm text-light-text-muted dark:text-dark-text-muted mt-1">
                            Update your account settings
                        </p>
                    </div>
                <button
                        class="p-2 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover"
                    on:click={() => {
                        showEditAccountModal = false;
                        editingAccount = null;
                    }}
                >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>

                <!-- Content - Scrollable -->
                <div class="px-8 py-6 space-y-6 max-h-[calc(100vh-16rem)] overflow-y-auto">
                    <!-- Account Type Info -->
                    {#if editingAccount.type !== 'MANUAL'}
                        <div class="p-4 rounded-xl bg-light-hover/30 dark:bg-dark-hover/30 border border-light-border/10 dark:border-dark-border/10">
                            <div class="flex items-center gap-3">
                                <!-- Exchange Icon -->
                                <div class="p-2.5 rounded-lg bg-theme-500/10">
                                    {#if editingAccount.type === 'BINANCE_FUTURES'}
                                        <svg class="w-5 h-5 text-[#F3BA2F]" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 0L7.272 4.728L12 9.456L16.728 4.728L12 0Z"/>
                                            <path d="M2.544 9.456L7.272 14.184L12 9.456L7.272 4.728L2.544 9.456Z"/>
                                            <path d="M12 9.456L16.728 14.184L21.456 9.456L16.728 4.728L12 9.456Z"/>
                                            <path d="M12 18.912L16.728 14.184L12 9.456L7.272 14.184L12 18.912Z"/>
                                        </svg>
                                    {:else if editingAccount.type === 'MT4'}
                                        <svg class="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                                        </svg>
                                    {:else if editingAccount.type === 'MT5'}
                                        <svg class="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                                        </svg>
                                    {/if}
                                </div>
                                <div>
                                    <div class="font-medium text-light-text dark:text-dark-text">
                                        {#if editingAccount.type === 'BINANCE_FUTURES'}
                                            Binance Futures
                                        {:else if editingAccount.type === 'MT4'}
                                            MetaTrader 4
                                        {:else if editingAccount.type === 'MT5'}
                                            MetaTrader 5
                                        {/if}
                                    </div>
                                    <div class="text-xs text-light-text-muted dark:text-dark-text-muted mt-0.5">
                                        Connected Account
                                    </div>
                                </div>
                            </div>

                            <!-- API Keys (Editable) -->
                            {#if editingAccount.apiKey}
                                <div class="mt-4 space-y-3">
                                    <div class="space-y-1.5">
                                        <label class="block text-sm font-medium text-light-text dark:text-dark-text">
                                            API Key *
                                        </label>
                                        <input
                                            type="text"
                                            bind:value={editingAccount.apiKey}
                                            required
                                            placeholder="Enter your API key"
                                            class="w-full px-3 py-2 bg-light-background dark:bg-dark-background 
                                                   border border-light-border dark:border-dark-border 
                                                   rounded-lg focus:ring-2 focus:ring-theme-500 focus:border-transparent
                                                   text-light-text dark:text-dark-text placeholder-light-text-muted 
                                                   dark:placeholder-dark-text-muted font-mono"
                                        />
                                    </div>
                                    <div class="space-y-1.5">
                                        <label class="block text-sm font-medium text-light-text dark:text-dark-text">
                                            Secret Key *
                                        </label>
                                        <input
                                            type="text"
                                            bind:value={editingAccount.secretKey}
                                            required
                                            placeholder="Enter your Secret key"
                                            class="w-full px-3 py-2 bg-light-background dark:bg-dark-background 
                                                   border border-light-border dark:border-dark-border 
                                                   rounded-lg focus:ring-2 focus:ring-theme-500 focus:border-transparent
                                                   text-light-text dark:text-dark-text placeholder-light-text-muted 
                                                   dark:placeholder-dark-text-muted font-mono"
                                        />
                                    </div>

                                    <!-- IP Whitelist Instructions -->
                                    <div class="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                        <div class="flex items-start gap-3">
                                            <svg class="w-5 h-5 text-blue-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                                            </svg>
                                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">
                                                <p class="font-medium text-light-text dark:text-dark-text mb-1">Important</p>
                                                <p>Make sure your API key has the following:</p>
                                                <ul class="mt-1 ml-4 list-disc space-y-0.5">
                                                    <li>IP whitelist updated</li>
                                                    <li>Reading permission enabled</li>
                                                    <li>Futures permission enabled</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Add new option -->
                                    <div class="p-4 rounded-xl bg-light-hover/30 dark:bg-dark-hover/30 border border-light-border/10 dark:border-dark-border/10">
                                        <label class="flex items-start gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                bind:checked={editingAccount.excludeZeroPnL}
                                                class="mt-1 rounded border-light-border dark:border-dark-border text-theme-500 focus:ring-theme-500"
                                            />
                                            <div class="text-sm">
                                                <div class="font-medium text-light-text dark:text-dark-text">Exclude Zero PnL Trades</div>
                                                <div class="text-light-text-muted dark:text-dark-text-muted mt-0.5">
                                                    Skip importing trades with 0% profit/loss when syncing trades.
                                                </div>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            {/if}
                        </div>
                    {/if}

                    <!-- Account Name -->
                    <div class="space-y-1.5">
                        <label class="block text-sm font-medium text-light-text dark:text-dark-text">
                            Account Name *
                        </label>
                        <input
                        type="text"
                        bind:value={editingAccount.name}
                        required
                        placeholder="e.g., Binance Spot"
                            class="w-full px-3 py-2 bg-light-background dark:bg-dark-background 
                                   border border-light-border dark:border-dark-border 
                                   rounded-lg focus:ring-2 focus:ring-theme-500 focus:border-transparent
                                   text-light-text dark:text-dark-text placeholder-light-text-muted 
                                   dark:placeholder-dark-text-muted"
                    />
                    </div>
            </div>

                <!-- Footer - Fixed at bottom -->
                <div class="px-8 py-5 border-t border-light-border dark:border-0 flex justify-end gap-4 sticky bottom-0 bg-light-card dark:bg-dark-card z-20">
                <Button
                    type="button"
                    variant="secondary"
                    on:click={() => {
                        showEditAccountModal = false;
                        editingAccount = null;
                    }}
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    variant="primary"
                    on:click={handleUpdateAccount}
                >
                    Save Changes
                </Button>
                </div>
            </div>
        </div>
    </div>
{/if}

<!-- Upgrade Modal -->
{#if showUpgradeModal}
    <LimitReachedModal
        show={showUpgradeModal}
        title="Account Limit Reached"
        description="Basic users are limited to 1 account. Upgrade to Pro for unlimited accounts and advanced features."
        upgradeText="Upgrade to Pro"
        cancelText="Maybe Later"
        width="md"
        on:close={() => showUpgradeModal = false}
        on:upgrade={upgradePlan}
    />
{/if}

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-0 rounded-xl shadow-xl;
    }

    /* Add smooth scrolling */
    .overflow-y-auto {
        scrollbar-width: thin;
        scrollbar-color: var(--scrollbar-thumb) transparent;
    }

    .overflow-y-auto::-webkit-scrollbar {
        width: 6px;
    }

    .overflow-y-auto::-webkit-scrollbar-track {
        background: transparent;
    }

    .overflow-y-auto::-webkit-scrollbar-thumb {
        background-color: var(--scrollbar-thumb, rgba(0, 0, 0, 0.2));
        border-radius: 3px;
    }

    .dark .overflow-y-auto::-webkit-scrollbar-thumb {
        background-color: var(--scrollbar-thumb, rgba(255, 255, 255, 0.2));
    }
</style>
