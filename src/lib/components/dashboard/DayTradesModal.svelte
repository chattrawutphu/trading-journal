<script>
    import { createEventDispatcher } from "svelte";
    import { fade } from "svelte/transition";
    import Button from "../common/Button.svelte";
    import TradeTable from "../trades/TradeTable.svelte";
    import TransactionTable from "../transactions/TransactionTable.svelte";
    import TransactionModal from "../transactions/TransactionModal.svelte";
    import { transactionStore } from "$lib/stores/transactionStore";
    import { accountStore } from '$lib/stores/accountStore';
    import Loading from "$lib/components/common/Loading.svelte";
    import { transactionDate } from '$lib/stores/transactionDateStore';
    import { tradeDate } from '$lib/stores/tradeDateStore';
    import Modal from '../common/Modal.svelte';
    import { api } from '$lib/utils/api';
    import TradeViewModal from "$lib/components/trades/TradeViewModal.svelte";
    import TradeModal from "$lib/components/trades/TradeModal.svelte";

    const dispatch = createEventDispatcher();

    export let show = false;
    export let trades = [];
    export let transactions = [];
    export let date = "";
    export let displayDate = "";
    export let accountId;
    export let loading = false;
    export let dailyBalance;

    let showTransactionModal = false;
    let selectedTransaction = null;
    let error = null;

    let showDepositModal = false;
    let showWithdrawModal = false;

    let showDeleteConfirmModal = false;
    let deleteContext = null;

    let showViewModal = false;
    let showEditModal = false;
    let selectedTrade = null;

    $: if (show && accountId) {
        loadTransactions();
    }

    async function loadTransactions() {
        loading = true;
        error = null;

        try {
            await transactionStore.fetchTransactions(accountId);
            transactions = filterTransactionsByDate($transactionStore.transactions, date);
        } catch (err) {
            error = err.message;
        } finally {
            loading = false;
        }
    }

    function filterTransactionsByDate(transactionList, date) {
        if (!Array.isArray(transactionList)) {
            console.error('transactionList is not an array:', transactionList);
            return [];
        
        }
        return transactionList.filter(transaction => {
            const transactionDate = new Date(transaction.date).toISOString().split('T')[0];
            return transactionDate === date;
        });
    }

    function close() {
        dispatch('close');
    }

    function handleNewTrade() {
        const formattedDate = new Date(date);
        formattedDate.setHours(7, 0, 0, 0);
        tradeDate.set(formattedDate.toISOString());
        selectedTrade = null;
        showEditModal = true;
    }

    function formatDate(dateStr) {
        const options = {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        };
        return new Date(dateStr).toLocaleString(undefined, options);
    }

    function handleEditTransaction(event) {
        selectedTransaction = event.detail;
        showTransactionModal = true;
    }

    function handleTransactionSubmit(event) {
        dispatch("editTransaction", event.detail);
        showTransactionModal = false;
    }

    function handleEdit(trade) {
        dispatch("edit", trade);
    }

    function handleDeposit() {
        showDepositModal = true;
    }

    function handleWithdraw() {
        showWithdrawModal = true;
    }

    function handleDeleteConfirm(event) {
        showDeleteConfirmModal = true;
        deleteContext = event.detail;
    }

    async function confirmDelete() {
        if (deleteContext) {
            try {
                await handleDelete(deleteContext);
            } catch (err) {
                console.error('Error in confirmDelete:', err);
            }
        }
        showDeleteConfirmModal = false;
        deleteContext = null;
    }

    async function handleDelete(event) {
        const { type, items, context } = event.detail;
        try {
            if (context === 'trades') {
                for (const tradeId of items) {
                    const result = await api.deleteTrade(tradeId);
                    if (!result.success) {
                        console.error(`Failed to delete trade ${tradeId}:`, result.error);
                        continue;
                    }
                }
                await loadTrades();
                dispatch('refresh');
            } else if (context === 'transactions') {
                for (const transactionId of items) {
                    try {
                        await api.deleteTransaction(transactionId);
                    } catch (err) {
                        console.error(`Failed to delete transaction ${transactionId}:`, err);
                        continue;
                    }
                }
                await loadTransactions();
            }
        } catch (err) {
            console.error('Error deleting items:', err);
        }
    }

    $: dailySummary = {
        totalPnL: trades.reduce((sum, trade) => sum + (trade.status === "CLOSED" ? (trade.pnl || 0) : 0), 0),
        winCount: trades.filter(t => t.status === "CLOSED" && t.pnl > 0).length,
        lossCount: trades.filter(t => t.status === "CLOSED" && t.pnl < 0).length,
        totalDeposits: transactions.reduce((sum, t) => sum + (t.type === "deposit" ? t.amount : 0), 0),
        totalWithdrawals: transactions.reduce((sum, t) => sum + (t.type === "withdrawal" ? t.amount : 0), 0),
        openTradesCount: trades.filter(t => t.status === "OPEN").length,
        closedTradesCount: trades.filter(t => t.status === "CLOSED").length,
    };

    $: winRate = dailySummary.winCount + dailySummary.lossCount > 0 
        ? ((dailySummary.winCount / (dailySummary.winCount + dailySummary.lossCount)) * 100).toFixed(1)
        : 0;

    function formatCurrency(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    }

    function handleTradeView(event) {
        selectedTrade = event.detail;
        showViewModal = true;
    }

    function handleTradeEdit(event) {
        selectedTrade = event.detail;
        showEditModal = true;
    }

    async function handleTradeFavorite(event) {
        try {
            await loadTrades();
        } catch (error) {
            console.error('Error updating favorite:', error);
        }
    }

    function closeViewModal() {
        showViewModal = false;
        selectedTrade = null;
    }

    async function handleTradeUpdated() {
        console.log('DayTradesModal: Trade updated, reloading trades...');
        await loadTrades();
        showEditModal = false;
        selectedTrade = null;
        console.log('DayTradesModal: Dispatching refresh event');
        dispatch('refresh');
    }

    async function loadTrades() {
        try {
            const response = await api.getTrades(accountId);
            // Filter trades by date
            const filteredTrades = response.filter(trade => {
                const tradeDate = trade.status === "CLOSED" 
                    ? new Date(trade.exitDate).toISOString().split('T')[0]
                    : new Date(trade.entryDate).toISOString().split('T')[0];
                return tradeDate === date;
            });
            
            trades = filteredTrades;
        } catch (error) {
            console.error('Error loading trades:', error);
        }
    }

    async function handleTransactionUpdated() {
        await loadTransactions();
        showTransactionModal = false;
        selectedTransaction = null;
        dispatch('refresh');
    }
</script>

{#if loading}
    <Loading message="Loading..." overlay={true} />
{:else if error}
    <div class="text-red-500">{error}</div>
{:else if show}
    <div class="fixed modal inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
         transition:fade={{ duration: 150 }}>
        <div class="card w-full max-w-4xl mx-auto relative transform ease-out max-h-[90vh] flex flex-col">
            <!-- Header -->
            <div class="px-8 py-5 border-b border-light-border dark:border-0 flex justify-between items-center bg-light-card dark:bg-dark-card rounded-t-xl backdrop-blur-lg bg-opacity-90 dark:bg-opacity-90 z-10">
                <h2 class="text-xl font-bold bg-gradient-purple bg-clip-text text-transparent">
                    {displayDate || formatDate(date)}
                </h2>
                <div class="flex items-center gap-4">
                    <div class="flex items-center gap-4 md:gap-1">
                        <Button variant="secondary" size="xs" on:click={handleDeposit}>
                            <svg class="w-5 h-5 md:w-3 md:h-3 mr-0 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                            </svg>
                            <span class="hidden md:flex">Deposit</span>
                        </Button>
                        <Button variant="secondary" size="xs" on:click={handleWithdraw}>
                            <svg class="w-5 h-5 md:w-3 md:h-3 mr-0 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
                            </svg>
                            <span class="hidden md:flex">Withdraw</span>
                        </Button>
                    </div>
                    <Button variant="primary" size="sm" on:click={handleNewTrade}>
                        <svg class="w-5 h-5 mr-0 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                        </svg>
                        <span class="hidden md:flex">New Trade</span>
                    </Button>
                    <button class="p-2 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover"
                            on:click={close}>
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Scrollable Content -->
            <div class="flex-1 overflow-y-auto">
                <!-- Summary Section -->
                <div class="px-8 py-4 border-b border-light-border dark:border-0 bg-light-hover/30 dark:bg-dark-hover/30">
                    <div class="grid grid-cols-4 gap-4">
                        <!-- Balance Summary - Always show -->
                        <div class="space-y-1">
                            <h4 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">End of Day Balance</h4>
                            <p class="text-lg font-bold text-light-text dark:text-dark-text">
                                {formatCurrency(dailyBalance?.endBalance || 0)}
                            </p>
                        </div>

                        {#if trades.length > 0 || transactions.length > 0}
                            <!-- P&L Summary -->
                            <div class="space-y-1">
                                <h4 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Day P&L</h4>
                                <p class="text-lg font-bold {dailySummary.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}">
                                    {formatCurrency(dailySummary.totalPnL)}
                                    {#if dailyBalance?.endBalance && dailyBalance.endBalance !== 0}
                                        <span class="text-sm">
                                            ({((dailySummary.totalPnL / Math.abs(dailyBalance.endBalance)) * 100).toFixed(1)}%)
                                        </span>
                                    {/if}
                                </p>
                            </div>

                            <!-- Transactions Summary - Only show if there are transactions -->
                            {#if transactions.length > 0}
                                <div class="space-y-1">
                                    <h4 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Transactions</h4>
                                    <div class="flex flex-col">
                                        {#if dailySummary.totalDeposits > 0}
                                            <span class="text-sm text-green-500">+{formatCurrency(dailySummary.totalDeposits)}</span>
                                        {/if}
                                        {#if dailySummary.totalWithdrawals > 0}
                                            <span class="text-sm text-red-500">-{formatCurrency(dailySummary.totalWithdrawals)}</span>
                                        {/if}
                                    </div>
                                </div>
                            {/if}

                            <!-- Trade Stats - Only show if there are trades -->
                            {#if trades.length > 0}
                                <div class="space-y-1">
                                    <h4 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Trade Stats</h4>
                                    <div class="flex gap-3 flex-col md:flex-row items-center">
                                        <div class="flex items-center gap-1.5">
                                            <div class="text-base font-bold {winRate > 50 ? 'text-green-500' : winRate < 50 ? 'text-red-500' : 'text-light-text dark:text-dark-text'}">
                                                {winRate}%
                                            </div>
                                            <div class="text-xs text-light-text-muted dark:text-dark-text-muted">
                                                Win Rate
                                            </div>
                                        </div>
                                        <div class="h-6 hidden md:flex w-px bg-light-border dark:bg-dark-border"></div>
                                        <div class="flex items-center gap-2">
                                            <div class="flex items-center gap-1">
                                                <span class="text-sm font-bold text-green-500">{dailySummary.winCount}</span>
                                                <span class="text-xs text-light-text-muted dark:text-dark-text-muted">Wins</span>
                                            </div>
                                            <div class="flex items-center gap-1">
                                                <span class="text-sm font-bold text-red-500">{dailySummary.lossCount}</span>
                                                <span class="text-xs text-light-text-muted dark:text-dark-text-muted">Losses</span>
                                            </div>
                                            {#if dailySummary.openTradesCount > 0}
                                                <div class="flex items-center gap-1">
                                                    <span class="text-sm font-bold text-yellow-500">{dailySummary.openTradesCount}</span>
                                                    <span class="text-xs text-light-text-muted dark:text-dark-text-muted">Open</span>
                                                </div>
                                            {/if}
                                        </div>
                                    </div>
                                </div>
                            {/if}
                        {/if}
                    </div>
                </div>

                <!-- Tables Content -->
                <div class="px-8 py-6">
                    {#if trades.length === 0 && (!transactions || transactions.length === 0)}
                        <!-- Empty State -->
                        <div class="text-center py-8">
                            <svg on:click={handleNewTrade} 
                                 class="w-16 h-16 mx-auto mb-4 text-light-text-muted dark:text-dark-text-muted cursor-pointer" 
                                 fill="none" 
                                 stroke="currentColor" 
                                 viewBox="0 0 24 24">
                                <path stroke-linecap="round" 
                                      stroke-linejoin="round" 
                                      stroke-width="2" 
                                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                            </svg>
                            <p class="text-light-text-muted dark:text-dark-text-muted">
                                No trades recorded for this day. Would you like to add one?
                            </p>
                        </div>
                    {:else}
                        <!-- Tables -->
                        {#if trades.filter(t => t.status === "OPEN").length > 0}
                            <div class="mb-6">
                                <h3 class="text-sm font-medium mb-2 text-light-text-muted dark:text-dark-text-muted">
                                    Open Trades
                                </h3>
                                <TradeTable
                                    trades={trades.filter(t => t.status === "OPEN")}
                                    type="open"
                                    isInModal={true}
                                    on:view={handleTradeView}
                                    on:edit={handleTradeEdit}
                                    on:favorite={handleTradeFavorite}
                                    on:disable
                                    on:delete={handleDelete}
                                    on:deleted={() => dispatch('refresh')}
                                />
                            </div>
                        {/if}

                        {#if trades.filter(t => t.status === "CLOSED").length > 0}
                            <div class="mb-6">
                                <h3 class="text-sm font-medium mb-2 text-light-text-muted dark:text-dark-text-muted">
                                    Closed Trades
                                </h3>
                                <TradeTable
                                    trades={trades.filter(t => t.status === "CLOSED")}
                                    type="closed"
                                    isInModal={true}
                                    dailyBalance={dailyBalance}
                                    on:view={handleTradeView}
                                    on:edit={handleTradeEdit}
                                    on:favorite={handleTradeFavorite}
                                    on:disable
                                    on:delete={handleDelete}
                                    on:deleted={() => dispatch('refresh')}
                                />
                            </div>
                        {/if}

                        {#if transactions && transactions.length > 0}
                            <div class="">
                                <h3 class="text-sm font-medium mb-2 text-light-text-muted dark:text-dark-text-muted">
                                    Transactions
                                </h3>
                                <TransactionTable
                                    {accountId}
                                    {transactions}
                                    isInModal={true}
                                    readOnly={false}
                                    hideEmptyState={true}
                                    on:edit={handleEditTransaction}
                                    on:delete={handleDelete}
                                    on:deleted={loadTransactions}
                                />
                            </div>
                        {/if}
                    {/if}
                </div>
            </div>
        </div>
    </div>
{/if}

<!-- Transaction Modals -->
<TransactionModal
    show={showTransactionModal || showDepositModal || showWithdrawModal}
    transaction={selectedTransaction}
    {accountId}
    type={showDepositModal ? 'deposit' : showWithdrawModal ? 'withdraw' : selectedTransaction?.type || 'deposit'}
    initialDate={date ? new Date(date) : null}
    on:close={() => {
        showTransactionModal = false;
        showDepositModal = false;
        showWithdrawModal = false;
        selectedTransaction = null;
    }}
    on:transactionUpdated={handleTransactionUpdated}
/>

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirmModal}
    <Modal
        show={showDeleteConfirmModal}
        title="Confirm Delete"
        on:close={() => showDeleteConfirmModal = false}
    >
        <div class="p-6">
            <p class="text-light-text dark:text-dark-text">
                {#if deleteContext?.type === 'selected'}
                    Are you sure you want to delete {deleteContext.items.length} selected trades?
                {:else if deleteContext?.type === 'single'}
                    Are you sure you want to delete this trade?
                {:else}
                    Are you sure you want to delete all trades?
                {/if}
            </p>
            <div class="flex justify-end gap-4 mt-6">
                <Button
                    variant="secondary"
                    size="sm"
                    on:click={() => showDeleteConfirmModal = false}
                >
                    Cancel
                </Button>
                <Button
                    variant="danger"
                    size="sm"
                    on:click={confirmDelete}
                >
                    Delete
                </Button>
            </div>
        </div>
    </Modal>
{/if}

<!-- เพิ่ม Modals -->
{#if selectedTrade}
    <TradeViewModal
        bind:show={showViewModal}
        trade={selectedTrade}
        on:close={closeViewModal}
    />
{/if}

<TradeModal
    bind:show={showEditModal}
    trade={selectedTrade}
    accountId={accountId}
    on:tradeUpdated={async () => {
        await loadTrades();
        showEditModal = false;
        selectedTrade = null;
        dispatch('refresh');
    }}
/>

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-0 rounded-xl shadow-xl;
    }

    /* Add these styles if needed */
    :global(.modal) {
        overscroll-behavior: contain;
    }
</style>
