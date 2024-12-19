<script>
    import { createEventDispatcher } from "svelte";
    import { fade } from "svelte/transition";
    import Button from "../common/Button.svelte";
    import TradeTable from "../trades/TradeTable.svelte";
    import TransactionTable from "../transactions/TransactionTable.svelte";
    import TransactionModal from "../transactions/TransactionModal.svelte";
    import { transactionStore } from "$lib/stores/transactionStore";
    import Loading from "$lib/components/common/Loading.svelte";
    import { formatPnL } from "$lib/utils/formatters";

    const dispatch = createEventDispatcher();

    export let show = false;
    export let trades = [];
    export let transactions = [];
    export let displayDate = "";
    export let summary = {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        pnl: 0,
        openTrades: 0
    };
    export let loading = false;

    let showTransactionModal = false;
    let selectedTransaction = null;
    let error = null;

    function handleView(trade) {
        dispatch("view", trade);
    }

    function handleEdit(trade) {
        dispatch("edit", trade);
    }

    function handleDelete(tradeId) {
        if (confirm("Are you sure you want to delete this trade?")) {
            dispatch("delete", tradeId);
        }
    }

    function handleDeleteTransaction(transactionId) {
        if (confirm("Are you sure you want to delete this transaction?")) {
            dispatch("deleteTransaction", transactionId);
        }
    }

    function close() {
        show = false;
        dispatch("close");
    }

    function handleEditTransaction(event) {
        selectedTransaction = event.detail;
        showTransactionModal = true;
    }

    function handleTransactionSubmit(event) {
        dispatch("editTransaction", event.detail);
        showTransactionModal = false;
    }

    $: openTrades = trades.filter((trade) => trade.status === "OPEN").map((trade, index) => ({ ...trade, uniqueKey: `${trade._id}-${index}` })); // Ensure unique keys
    $: closedTrades = trades.filter((trade) => trade.status === "CLOSED").map((trade, index) => ({ ...trade, uniqueKey: `${trade._id}-${index}` })); // Ensure unique keys
    $: processedTransactions = transactions.map((transaction, index) => ({
        ...transaction,
        uniqueKey: `${transaction._id}-${index}`
    })); // Ensure unique keys
</script>

{#if loading}
    <Loading message="Loading..." overlay={true} />
{:else if error}
    <div class="text-red-500">{error}</div>
{:else if show}
    <div
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        transition:fade={{ duration: 150 }}
    >
        <div class="card w-full max-w-4xl mx-auto relative transform ease-out">
            <!-- Header -->
            <div
                class="px-8 py-5 border-b border-light-border dark:border-dark-border flex justify-between items-center sticky top-0 bg-light-card dark:bg-dark-card rounded-t-xl backdrop-blur-lg bg-opacity-90 dark:bg-opacity-90 z-10"
            >
                <h2
                    class="text-2xl font-bold bg-gradient-purple bg-clip-text text-transparent"
                >
                    {displayDate}
                </h2>
                <button
                    class="p-2 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover "
                    on:click={close}
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
            <div class="px-8 py-6 max-h-[calc(100vh-16rem)] overflow-y-auto">
                            <!-- Summary Section -->
            <div class="mb-6 p-4 bg-light-hover/10 dark:bg-dark-hover/10 rounded-lg">
                <h3 class="text-lg font-semibold mb-3 text-light-text dark:text-dark-text">Monthly Statistics</h3>
                <div class="grid grid-cols-3 gap-4">
                    <div>
                        <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Total Trades</div>
                        <div class="text-lg font-medium text-light-text dark:text-dark-text">{summary.totalTrades}</div>
                    </div>
                    <div>
                        <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Win Rate</div>
                        <div class="text-lg font-medium text-light-text dark:text-dark-text">{summary.winRate}%</div>
                    </div>
                    <div>
                        <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Total P&L</div>
                        <div class="text-lg font-medium {summary.pnl > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">{formatPnL(summary.pnl)}</div>
                    </div>
                    <div>
                        <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Wins</div>
                        <div class="text-lg font-medium text-green-600 dark:text-green-400">{summary.wins}</div>
                    </div>
                    <div>
                        <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Losses</div>
                        <div class="text-lg font-medium text-red-600 dark:text-red-400">{summary.losses}</div>
                    </div>
                    <div>
                        <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Open Trades</div>
                        <div class="text-lg font-medium text-yellow-600 dark:text-yellow-400">{summary.openTrades}</div>
                    </div>
                </div>
            </div>
                {#if openTrades.length > 0}
                    <div class="mb-6">
                        <h3
                            class="text-lg font-semibold mb-3 text-light-text dark:text-dark-text"
                        >
                            Open Trades
                        </h3>
                        <TradeTable
                            trades={openTrades}
                            type="open"
                            on:view
                            on:edit
                            on:delete
                        />
                    </div>
                {/if}

                {#if closedTrades.length > 0}
                    <div class="mb-6">
                        <h3
                            class="text-lg font-semibold mb-3 text-light-text dark:text-dark-text"
                        >
                            Closed Trades
                        </h3>
                        <TradeTable
                            trades={closedTrades}
                            type="closed"
                            on:view
                            on:edit
                            on:delete
                        />
                    </div>
                {/if}

                <div class="mb-6"></div>
                    <h3
                        class="text-lg font-semibold mb-3 text-light-text dark:text-dark-text"
                    >
                        Transactions
                    </h3>
                    <TransactionTable
                        transactions={processedTransactions}
                        readOnly={false}
                        on:edit={handleEditTransaction}
                        on:delete={handleDeleteTransaction}
                    />
                {#if trades.length === 0 && transactions?.length === 0}
                    <div
                        class="text-center py-8 text-light-text-muted dark:text-dark-text-muted"
                    >
                        No trades or transactions found for this month
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}

<TransactionModal
    show={showTransactionModal}
    transaction={selectedTransaction}
    on:submit={handleTransactionSubmit}
    on:close={() => (showTransactionModal = false)}
/>

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl shadow-xl;
    }
</style>
