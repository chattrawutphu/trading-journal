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

    const dispatch = createEventDispatcher();

    let showNewAccountModal = false;
    let showEditAccountModal = false;
    let newAccountName = "";
    let newAccountBalance = 0;
    let editingAccount = null;
    let error = "";
    let switchingAccount = false;
    let showUpgradeModal = false;

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
                    balance: parseFloat(editingAccount.balance) || 0,
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
                "Are you sure you want to delete this account? This will delete all trades associated with this account.",
            )
        ) {
            try {
                error = "";
                await accountStore.deleteAccount(accountId);
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
                        class="flex-grow text-left text-xs"
                        class:font-medium={$accountStore.currentAccount?._id === account._id}
                        on:click={() => handleAccountSwitch(account._id)}
                    >
                        <span>{account.name}</span>
                    </button>
                    <div class="flex items-center gap-0.5">
                        <button
                            class="p-0.5 rounded-full hover:bg-theme-500/20 hover:text-theme-500 dark:hover:text-theme-400"
                            on:click|stopPropagation={() => startEditAccount(account)}
                            title="Edit Account"
                        >
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        <button
                            class="p-0.5 rounded-full hover:bg-red-500/20 hover:text-red-500 dark:hover:text-red-400"
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
        show={showNewAccountModal}
        on:close={() => showNewAccountModal = false}
    />
{/if}

<!-- Edit Account Modal -->
{#if showEditAccountModal && editingAccount}
    <div
        class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
        transition:fade={{ duration: 150 }}
    >
        <div class="card w-full max-w-md mx-auto relative transform ease-out">
            <!-- Header -->
            <div
                class="px-8 py-5 border-b border-light-border dark:border-0 flex justify-between items-center sticky top-0 bg-light-card dark:bg-dark-card rounded-t-xl bg-opacity-90 dark:bg-opacity-90 z-10"
            >
                <h2
                    class="text-2xl font-bold bg-gradient-purple bg-clip-text text-transparent"
                >
                    Edit Account
                </h2>
                <button
                    class="p-2 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover "
                    on:click={() => {
                        showEditAccountModal = false;
                        editingAccount = null;
                    }}
                >
                    <svg
                        class="w-6 h-6"
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

            <!-- Content -->
            <div class="px-8 py-6 space-y-4">
                <form on:submit|preventDefault={handleUpdateAccount}>
                    <Input
                        label="Account Name"
                        type="text"
                        bind:value={editingAccount.name}
                        required
                        placeholder="e.g., Binance Spot"
                    />
                </form>
            </div>

            <!-- Footer -->
            <div
                class="px-8 py-5 border-t border-light-border dark:border-0 flex justify-end gap-4 sticky bottom-0 bg-light-card dark:bg-dark-card rounded-b-xl bg-opacity-90 dark:bg-opacity-90 z-10"
            >
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
</style>
