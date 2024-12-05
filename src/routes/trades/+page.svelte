<script>
    import { onMount } from 'svelte';
    import { fade, fly } from 'svelte/transition';
    import { page } from '$app/stores';
    import { accountStore } from '$lib/stores/accountStore';
    import { transactionStore } from '$lib/stores/transactionStore';
    import TradeTable from '$lib/components/trades/TradeTable.svelte';
    import TradeModal from '$lib/components/trades/TradeModal.svelte';
    import TradeViewModal from '$lib/components/trades/TradeViewModal.svelte';
    import TradeFilters from '$lib/components/trades/TradeFilters.svelte';
    import TransactionTable from '$lib/components/transactions/TransactionTable.svelte';
    import Loading from '$lib/components/common/Loading.svelte';
    import Button from '$lib/components/common/Button.svelte';
    import Input from '$lib/components/common/Input.svelte';
    import { api } from '$lib/utils/api';

    let loading = false;
    let error = '';
    let trades = [];
    let showEditModal = false;
    let showViewModal = false;
    let showDepositModal = false;
    let showWithdrawModal = false;
    let selectedTrade = null;
    let selectedTransaction = null;
    let activeTab = 'trades';
    let transactionAmount = 0;
    let transactionDate = new Date().toISOString().split('T')[0];

    $: openTrades = trades.filter(t => t.status === 'OPEN');
    $: closedTrades = trades.filter(t => t.status === 'CLOSED');

    $: if ($accountStore.currentAccount) {
        loadTrades();
    }

    $: if ($page.url.searchParams.get('newTrade') === 'true') {
        showEditModal = true;
        // Clear the URL parameter without refreshing the page
        const url = new URL(window.location);
        url.searchParams.delete('newTrade');
        window.history.replaceState({}, '', url);
    }

    onMount(() => {
        accountStore.loadAccounts();
    });

    async function loadTrades() {
        try {
            loading = true;
            error = '';
            
            const response = await api.getTrades($accountStore.currentAccount._id);
            trades = response;
        } catch (err) {
            error = err.message;
        } finally {
            loading = false;
        }
    }

    async function handleSubmit(event) {
        try {
            loading = true;
            error = '';

            if (selectedTrade) {
                await api.updateTrade(selectedTrade._id, event.detail);
            } else {
                await api.createTrade(event.detail);
            }

            showEditModal = false;
            selectedTrade = null;
            await loadTrades();
            // Refresh account data to update balance
            await accountStore.setCurrentAccount($accountStore.currentAccount._id);
            // Dispatch trade update event
            window.dispatchEvent(new CustomEvent('tradeupdate'));
        } catch (err) {
            error = err.message;
        } finally {
            loading = false;
        }
    }

    async function handleDeposit() {
        if (transactionAmount > 0) {
            try {
                error = '';
                await transactionStore.createTransaction(
                    $accountStore.currentAccount._id,
                    'deposit',
                    transactionAmount,
                    new Date(transactionDate)
                );
                await accountStore.setCurrentAccount($accountStore.currentAccount._id);
                showDepositModal = false;
                transactionAmount = 0;
                transactionDate = new Date().toISOString().split('T')[0];
            } catch (err) {
                error = err.message;
            }
        }
    }

    async function handleWithdraw() {
        if (transactionAmount > 0) {
            try {
                error = '';
                await transactionStore.createTransaction(
                    $accountStore.currentAccount._id,
                    'withdrawal',
                    transactionAmount,
                    new Date(transactionDate)
                );
                await accountStore.setCurrentAccount($accountStore.currentAccount._id);
                showWithdrawModal = false;
                transactionAmount = 0;
                transactionDate = new Date().toISOString().split('T')[0];
            } catch (err) {
                error = err.message;
            }
        }
    }

    function handleView(event) {
        selectedTrade = event.detail;
        showViewModal = true;
    }

    function handleEdit(event) {
        selectedTrade = event.detail;
        showEditModal = true;
    }

    function handleEditTransaction(event) {
        selectedTransaction = event.detail;
        if (selectedTransaction.type === 'deposit') {
            transactionAmount = selectedTransaction.amount;
            transactionDate = new Date(selectedTransaction.date).toISOString().split('T')[0];
            showDepositModal = true;
        } else {
            transactionAmount = selectedTransaction.amount;
            transactionDate = new Date(selectedTransaction.date).toISOString().split('T')[0];
            showWithdrawModal = true;
        }
    }

    async function handleDelete(tradeId) {
        if (!confirm('Are you sure you want to delete this trade?')) return;

        try {
            loading = true;
            error = '';

            await api.deleteTrade(tradeId);
            await loadTrades();
            // Refresh account data to update balance
            await accountStore.setCurrentAccount($accountStore.currentAccount._id);
            // Dispatch trade update event
            window.dispatchEvent(new CustomEvent('tradeupdate'));
        } catch (err) {
            error = err.message;
        } finally {
            loading = false;
        }
    }

    async function handleFavorite(tradeId) {
        try {
            loading = true;
            error = '';

            await api.toggleFavorite(tradeId);
            await loadTrades();
        } catch (err) {
            error = err.message;
        } finally {
            loading = false;
        }
    }

    async function handleDisable(tradeId) {
        try {
            loading = true;
            error = '';

            await api.toggleDisabled(tradeId);
            await loadTrades();
        } catch (err) {
            error = err.message;
        } finally {
            loading = false;
        }
    }

    function closeEditModal() {
        showEditModal = false;
        selectedTrade = null;
    }

    function closeViewModal() {
        showViewModal = false;
        selectedTrade = null;
    }
</script>

<div class="space-y-4 p-8">
    {#if error}
        <div class="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
            <div class="flex">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                </svg>
                <span>{error}</span>
            </div>
        </div>
    {/if}

    <!-- Header -->
    <div class="flex justify-between items-center">
        <h1 class="text-4xl font-bold bg-gradient-purple bg-clip-text text-transparent">History</h1>
        {#if activeTab === 'trades'}
            <Button variant="primary" on:click={() => showEditModal = true}>
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                New Trade
            </Button>
        {:else if activeTab === 'transactions'}
            <div class="flex gap-2">
                <Button variant="primary" on:click={() => showDepositModal = true}>
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    Deposit
                </Button>
                <Button variant="primary" on:click={() => showWithdrawModal = true}>
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
                    </svg>
                    Withdraw
                </Button>
            </div>
        {/if}
    </div>

    <!-- Tab Navigation -->
    <div class="border-b border-light-border dark:border-dark-border">
        <nav class="-mb-px flex space-x-8">
            <button
                class="py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 {activeTab === 'trades' ? 'border-theme-500 text-theme-500' : 'border-transparent text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text hover:border-light-border dark:hover:border-dark-border'}"
                on:click={() => activeTab = 'trades'}
            >
                Trades
            </button>
            <button
                class="py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 {activeTab === 'transactions' ? 'border-theme-500 text-theme-500' : 'border-transparent text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text hover:border-light-border dark:hover:border-dark-border'}"
                on:click={() => activeTab = 'transactions'}
            >
                Transactions
            </button>
        </nav>
    </div>

    {#if loading}
        <Loading message="Loading..." overlay={true} />
    {:else if $accountStore.currentAccount}
        {#if activeTab === 'trades'}
            <!-- Filters -->
            <TradeFilters />

            <!-- Open Trades -->
            <div class="card">
                <div class="p-4 border-b border-light-border dark:border-dark-border">
                    <h2 class="text-xl font-semibold">Open Positions</h2>
                </div>
                <TradeTable 
                    trades={openTrades}
                    type="open"
                    on:view={handleView}
                    on:edit={handleEdit}
                    on:delete={e => handleDelete(e.detail)}
                    on:favorite={e => handleFavorite(e.detail)}
                    on:disable={e => handleDisable(e.detail)}
                />
            </div>

            <!-- Closed Trades -->
            <div class="card">
                <div class="p-4 border-b border-light-border dark:border-dark-border">
                    <h2 class="text-xl font-semibold">Closed Trades</h2>
                </div>
                <TradeTable 
                    trades={closedTrades}
                    type="closed"
                    on:view={handleView}
                    on:edit={handleEdit}
                    on:delete={e => handleDelete(e.detail)}
                    on:favorite={e => handleFavorite(e.detail)}
                    on:disable={e => handleDisable(e.detail)}
                />
            </div>
        {:else if activeTab === 'transactions'}
            <div class="card">
                <TransactionTable 
                    accountId={$accountStore.currentAccount._id}
                    on:edit={handleEditTransaction}
                />
            </div>
        {/if}
    {:else}
        <div class="card p-8 text-center">
            <p class="text-light-text-muted dark:text-dark-text-muted">
                Create an account to see your history
            </p>
        </div>
    {/if}
</div>

<TradeModal
    bind:show={showEditModal}
    trade={selectedTrade}
    accountId={$accountStore.currentAccount?._id}
    on:submit={handleSubmit}
    on:close={closeEditModal}
/>

<TradeViewModal
    bind:show={showViewModal}
    trade={selectedTrade}
/>

<!-- Deposit Modal -->
{#if showDepositModal}
    <div 
        class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
        on:click={() => {
            showDepositModal = false;
            selectedTransaction = null;
            transactionAmount = 0;
            transactionDate = new Date().toISOString().split('T')[0];
        }}
        transition:fade={{ duration: 200 }}
    >
        <div 
            class="card w-full max-w-md mx-auto relative transform ease-out"
            on:click|stopPropagation
            in:fly={{ y: 20, duration: 300, delay: 150 }}
            out:fly={{ y: 20, duration: 200 }}
        >
            <!-- Header -->
            <div class="px-8 py-5 border-b border-light-border dark:border-dark-border flex justify-between items-center sticky top-0 bg-light-card dark:bg-dark-card rounded-t-xl bg-opacity-90 dark:bg-opacity-90 z-10">
                <h2 class="text-2xl font-bold bg-gradient-purple bg-clip-text text-transparent">Deposit</h2>
                <button 
                    class="p-2 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover transition-all duration-200"
                    on:click={() => {
                        showDepositModal = false;
                        selectedTransaction = null;
                        transactionAmount = 0;
                        transactionDate = new Date().toISOString().split('T')[0];
                    }}
                >
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <!-- Content -->
            <div class="px-8 py-6 space-y-4">
                <form on:submit|preventDefault={handleDeposit}>
                    <Input
                        label="Amount"
                        type="number"
                        bind:value={transactionAmount}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                    />
                    <Input
                        label="Date"
                        type="date"
                        bind:value={transactionDate}
                    />
                </form>
            </div>

            <!-- Footer -->
            <div class="px-8 py-5 border-t border-light-border dark:border-dark-border flex justify-end gap-4 sticky bottom-0 bg-light-card dark:bg-dark-card rounded-b-xl bg-opacity-90 dark:bg-opacity-90 z-10">
                <Button 
                    type="button" 
                    variant="secondary" 
                    on:click={() => {
                        showDepositModal = false;
                        selectedTransaction = null;
                        transactionAmount = 0;
                        transactionDate = new Date().toISOString().split('T')[0];
                    }}
                >
                    Cancel
                </Button>
                <Button type="submit" variant="primary" on:click={handleDeposit}>
                    Deposit
                </Button>
            </div>
        </div>
    </div>
{/if}

<!-- Withdraw Modal -->
{#if showWithdrawModal}
    <div 
        class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
        on:click={() => {
            showWithdrawModal = false;
            selectedTransaction = null;
            transactionAmount = 0;
            transactionDate = new Date().toISOString().split('T')[0];
        }}
        transition:fade={{ duration: 200 }}
    >
        <div 
            class="card w-full max-w-md mx-auto relative transform ease-out"
            on:click|stopPropagation
            in:fly={{ y: 20, duration: 300, delay: 150 }}
            out:fly={{ y: 20, duration: 200 }}
        >
            <!-- Header -->
            <div class="px-8 py-5 border-b border-light-border dark:border-dark-border flex justify-between items-center sticky top-0 bg-light-card dark:bg-dark-card rounded-t-xl bg-opacity-90 dark:bg-opacity-90 z-10">
                <h2 class="text-2xl font-bold bg-gradient-purple bg-clip-text text-transparent">Withdraw</h2>
                <button 
                    class="p-2 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover transition-all duration-200"
                    on:click={() => {
                        showWithdrawModal = false;
                        selectedTransaction = null;
                        transactionAmount = 0;
                        transactionDate = new Date().toISOString().split('T')[0];
                    }}
                >
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <!-- Content -->
            <div class="px-8 py-6 space-y-4">
                <form on:submit|preventDefault={handleWithdraw}>
                    <Input
                        label="Amount"
                        type="number"
                        bind:value={transactionAmount}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                    />
                    <Input
                        label="Date"
                        type="date"
                        bind:value={transactionDate}
                    />
                </form>
            </div>

            <!-- Footer -->
            <div class="px-8 py-5 border-t border-light-border dark:border-dark-border flex justify-end gap-4 sticky bottom-0 bg-light-card dark:bg-dark-card rounded-b-xl bg-opacity-90 dark:bg-opacity-90 z-10">
                <Button 
                    type="button" 
                    variant="secondary" 
                    on:click={() => {
                        showWithdrawModal = false;
                        selectedTransaction = null;
                        transactionAmount = 0;
                        transactionDate = new Date().toISOString().split('T')[0];
                    }}
                >
                    Cancel
                </Button>
                <Button type="submit" variant="primary" on:click={handleWithdraw}>
                    Withdraw
                </Button>
            </div>
        </div>
    </div>
{/if}

<style>
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-lg transition-colors duration-200;
    }
</style>
