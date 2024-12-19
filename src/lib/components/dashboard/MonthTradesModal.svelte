<script>
    import { createEventDispatcher } from "svelte";
    import Modal from "../common/Modal.svelte";
    import Button from "../common/Button.svelte";
    import { theme } from "$lib/stores/themeStore";
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

    function getStatusClass(status) {
        return status === "OPEN" ? "text-yellow-500" : "";
    }

    function getPnLClass(pnl) {
        if (pnl === 0) return "";
        if ($theme === "dark") {
            return pnl > 0 ? "text-green-300" : "text-red-300";
        }
        return pnl > 0 ? "text-green-600" : "text-red-600";
    }
</script>

<Modal bind:show title="Monthly Summary - {displayDate}">
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
                <div class="text-lg font-medium {getPnLClass(summary.pnl)}">{formatPnL(summary.pnl)}</div>
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

    <!-- Trades Section -->
    {#if trades.length > 0}
        <div class="space-y-4">
            <h3 class="text-lg font-semibold text-light-text dark:text-dark-text">Trades</h3>
            <div class="space-y-2">
                {#each trades as trade}
                    <div class="flex items-center justify-between p-3 bg-light-background dark:bg-dark-background rounded-lg">
                        <div class="flex-1">
                            <div class="flex items-center gap-2">
                                <span class="font-medium text-light-text dark:text-dark-text">
                                    {trade.symbol}
                                </span>
                                <span class="text-sm {getStatusClass(trade.status)}">
                                    {trade.status}
                                </span>
                            </div>
                            {#if trade.status === "CLOSED"}
                                <div class="text-sm font-medium {getPnLClass(trade.pnl)}">
                                    {formatPnL(trade.pnl)}
                                </div>
                            {/if}
                        </div>
                        <div class="flex gap-2">
                            <button
                                class="p-1.5 rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover text-light-text-muted dark:text-dark-text-muted transition-colors"
                                on:click={() => handleView(trade)}
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            </button>
                            <button
                                class="p-1.5 rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover text-light-text-muted dark:text-dark-text-muted transition-colors"
                                on:click={() => handleEdit(trade)}
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                            <button
                                class="p-1.5 rounded-lg hover:bg-red-500 hover:text-white text-light-text-muted dark:text-dark-text-muted transition-colors"
                                on:click={() => handleDelete(trade._id)}
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    {/if}

    <!-- Transactions Section -->
    {#if transactions.length > 0}
        <div class="mt-6 space-y-4">
            <h3 class="text-lg font-semibold text-light-text dark:text-dark-text">Transactions</h3>
            <div class="space-y-2">
                {#each transactions as transaction}
                    <div class="flex items-center justify-between p-3 bg-light-background dark:bg-dark-background rounded-lg">
                        <div class="flex-1">
                            <div class="flex items-center gap-2">
                                <span class="font-medium text-light-text dark:text-dark-text">
                                    {transaction.type === "deposit" ? "Deposit" : "Withdrawal"}
                                </span>
                                <span class="text-sm font-medium {transaction.type === 'deposit' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                                    {formatPnL(transaction.amount)}
                                </span>
                            </div>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">
                                {new Date(transaction.date).toLocaleDateString()}
                            </div>
                        </div>
                        <button
                            class="p-1.5 rounded-lg hover:bg-red-500 hover:text-white text-light-text-muted dark:text-dark-text-muted transition-colors"
                            on:click={() => handleDeleteTransaction(transaction._id)}
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</Modal>
