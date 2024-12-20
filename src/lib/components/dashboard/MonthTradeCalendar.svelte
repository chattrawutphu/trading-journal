<script>
    import { createEventDispatcher, onMount } from "svelte";
    import { theme } from "$lib/stores/themeStore";
    import { accountStore } from "$lib/stores/accountStore";
    import { transactionStore } from "$lib/stores/transactionStore";
    import { api } from '$lib/utils/api';
    import MonthTradesModal from './MonthTradesModal.svelte';

    const dispatch = createEventDispatcher();

    export let trades = [];
    export let textSize = 'medium';
    let currentAccountId = null;
    let monthlyTrades = {};
    let showMonthModal = false;
    let selectedMonthTrades = [];
    let selectedMonthTransactions = [];
    let selectedDisplayDate = "";
    let selectedMonthSummary = {};

    onMount(async () => {
        try {
            await transactionStore.fetchTransactions($accountStore.currentAccount._id);
            trades = await api.getTrades($accountStore.currentAccount._id);
        } catch (err) {
            console.error('Error initializing page:', err);
        }
    });

    // Watch for account changes
    $: if ($accountStore.currentAccount?._id !== currentAccountId) {
        currentAccountId = $accountStore.currentAccount?._id;
        if (currentAccountId) {
            selectedYear = new Date().getFullYear();
        }
    }

    const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 6 }, (_, i) => currentYear - 5 + i);

    let selectedYear = new Date().getFullYear();

    // Helper function to normalize date to noon
    function normalizeDate(date) {
        const d = new Date(date);
        d.setHours(12, 0, 0, 0);
        return d;
    }

    // Process trades into monthly summaries
    $: monthlyTrades = trades.reduce((acc, trade) => {
        let tradeDate;
        if (trade.status === "CLOSED") {
            tradeDate = new Date(trade.exitDate);
        } else {
            tradeDate = new Date(trade.entryDate);
        }

        try {
            if (isNaN(tradeDate.getTime())) return acc;

            const monthKey = `${tradeDate.getFullYear()}-${String(tradeDate.getMonth() + 1).padStart(2, '0')}`;
            
            if (!acc[monthKey]) {
                acc[monthKey] = {
                    trades: [],
                    pnl: 0,
                    symbols: new Set(),
                    wins: 0,
                    losses: 0,
                    openTrades: 0,
                    transactions: [],
                    totalTrades: 0,
                    winRate: 0
                };
            }

            acc[monthKey].trades.push(trade);
            acc[monthKey].totalTrades++;
            
            if (trade.status === "CLOSED") {
                acc[monthKey].pnl += trade.pnl || 0;
                if (trade.pnl > 0) acc[monthKey].wins++;
                else if (trade.pnl < 0) acc[monthKey].losses++;
            } else {
                acc[monthKey].openTrades++;
            }
            acc[monthKey].symbols.add(trade.symbol);
            
            // Calculate win rate
            const totalClosedTrades = acc[monthKey].wins + acc[monthKey].losses;
            acc[monthKey].winRate = totalClosedTrades > 0 
                ? Math.round((acc[monthKey].wins / totalClosedTrades) * 100) 
                : 0;

        } catch (err) {
            console.error("Error processing trade date:", err);
        }
        return acc;
    }, {});

    // Process transactions into monthlyTrades
    $: {
        const transactions = $transactionStore.transactions;
        if (Array.isArray(transactions)) {
            transactions.forEach((transaction) => {
                const transDate = new Date(transaction.date);
                const monthKey = `${transDate.getFullYear()}-${String(transDate.getMonth() + 1).padStart(2, '0')}`;

                if (!monthlyTrades[monthKey]) {
                    monthlyTrades[monthKey] = {
                        trades: [],
                        pnl: 0,
                        symbols: new Set(),
                        wins: 0,
                        losses: 0,
                        openTrades: 0,
                        transactions: [],
                        totalTrades: 0,
                        winRate: 0
                    };
                }

                monthlyTrades[monthKey].transactions.push(transaction);
            });
        }
    }

    function getMonthStats(month) {
        const monthKey = `${selectedYear}-${String(month + 1).padStart(2, '0')}`;
        return monthlyTrades[monthKey] || null;
    }

    function isFutureMonth(month) {
        const today = new Date();
        return selectedYear > today.getFullYear() || 
               (selectedYear === today.getFullYear() && month > today.getMonth());
    }

    function getCardClass(stats, month) {
        if (isFutureMonth(month))
            return "opacity-50 bg-light-hover/10 dark:bg-dark-hover/10";
        if (!stats || (!stats.pnl && !stats.openTrades && !stats.transactions?.length))
            return "cursor-pointer";

        // Check for closed trades first
        const hasClosedTrades = stats.wins > 0 || stats.losses > 0;
        if (hasClosedTrades) {
            return `cursor-pointer ${stats.pnl > 0 ? "bg-green-100 dark:bg-green-900/20" : "bg-red-100 dark:bg-red-900/20"}`;
        }

        // If no closed trades but has open trades or transactions
        if (stats.openTrades > 0 || stats.transactions?.length > 0) {
            return `cursor-pointer bg-yellow-50 dark:bg-yellow-900/10`;
        }

        return "cursor-pointer";
    }

    function getTextClass(stats) {
        if (!stats || (!stats.pnl && !stats.openTrades && !stats.transactions?.length))
            return "";

        // Check for closed trades first
        const hasClosedTrades = stats.wins > 0 || stats.losses > 0;
        if (hasClosedTrades) {
            if ($theme === "dark") {
                return stats.pnl > 0 ? "text-green-300" : "text-red-300";
            }
            return stats.pnl > 0 ? "text-green-600" : "text-red-600";
        }

        // If no closed trades but has open trades or transactions
        if (stats.openTrades > 0 || stats.transactions?.length > 0) {
            return $theme === "dark" ? "text-yellow-300" : "text-yellow-600";
        }

        return "";
    }

    function formatPnL(pnl) {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(pnl);
    }

    function handleMonthClick(month, stats) {
        if (isFutureMonth(month)) return;

        const monthName = months[month];
        if (!stats?.trades.length && !stats?.transactions?.length) return;

        selectedMonthTrades = [...(stats.trades || [])].map((trade, index) => ({
            ...trade,
            uniqueKey: `${trade._id}-${index}`
        }));
        selectedMonthTransactions = stats.transactions || [];
        selectedDisplayDate = `${monthName} ${selectedYear}`;
        selectedMonthSummary = {
            totalTrades: stats.totalTrades,
            wins: stats.wins,
            losses: stats.losses,
            winRate: stats.winRate,
            pnl: stats.pnl,
            openTrades: stats.openTrades
        };
        showMonthModal = true; // Ensure modal is shown
    }

    function previousYear() {
        selectedYear--;
    }

    function nextYear() {
        selectedYear++;
    }
    function handleView(event) {
        dispatch("view", event.detail);
    }

    function handleEdit(event) {
        dispatch("edit", event.detail);
    }

    function handleDelete(event) {
        dispatch("delete", event.detail);
    }

    function handleDeleteTransaction(event) {
        dispatch("deleteTransaction", event.detail);
    }
</script>

<div class="card h-full flex flex-col {textSize}">
    <div class="p-4 border-b border-light-border dark:border-dark-border">
        <div class="flex justify-between items-center relative">
            <div class="flex items-center justify-between w-full gap-2">
                <span class="text-xl font-semibold text-light-text-muted dark:text-dark-text">
                    {selectedYear}
                </span>
                <div class="flex items-center">
                    <button
                        class="p-1 hover:bg-light-hover/10 dark:hover:bg-dark-hover/10 rounded-full transition-colors"
                        on:click={previousYear}
                        aria-label="Previous year"
                    >
                        <svg class="h-6 w-6 text-purple-500" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <path stroke="none" d="M0 0h24v24H0z"/>
                            <polyline points="11 7 6 12 11 17" />
                            <polyline points="17 7 12 12 17 17" />
                        </svg>
                    </button>
                    <button
                        class="p-1 hover:bg-light-hover/10 dark:hover:bg-dark-hover/10 rounded-full transition-colors"
                        on:click={nextYear}
                        aria-label="Next year"
                    >
                        <svg class="h-6 w-6 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="13 17 18 12 13 7" />
                            <polyline points="6 17 11 12 6 7" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Month Grid -->
    <div class="flex-1 p-4">
        <div class="grid grid-cols-3 gap-4 h-full">
            {#each months as month, i (i)}
                {@const stats = getMonthStats(i)}
                <div class="relative">
                    <div
                        class="h-full border border-light-border dark:border-dark-border rounded-md p-4
                               {getCardClass(stats, i)} hover:shadow {!isFutureMonth(i) && 'hover:scale-[1.02]'}"
                        on:click={() => handleMonthClick(i, stats)}
                    >
                        <!-- Month name -->
                        <div class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-2">
                            {month}
                        </div>

                        {#if stats}
                            <div class="space-y-2">
                                <!-- Trade stats -->
                                {#if stats.totalTrades > 0}
                                    <div class="space-y-1">
                                        <div class="text-xs text-light-text-muted dark:text-dark-text-muted">
                                            {stats.totalTrades} trade{stats.totalTrades !== 1 ? "s" : ""}
                                        </div>
                                        <div class="flex gap-2 text-xs">
                                            {#if stats.wins > 0}
                                                <span class="text-green-600 dark:text-green-400">
                                                    {stats.wins} wins
                                                </span>
                                            {/if}
                                            {#if stats.losses > 0}
                                                <span class="text-red-600 dark:text-red-400">
                                                    {stats.losses} losses
                                                </span>
                                            {/if}
                                        </div>
                                        {#if stats.winRate > 0}
                                            <div class="text-xs text-light-text-muted dark:text-dark-text-muted">
                                                Win Rate: {stats.winRate}%
                                            </div>
                                        {/if}
                                    </div>
                                {/if}

                                <!-- P&L -->
                                {#if stats.pnl !== 0}
                                    <div class="text-sm font-medium {getTextClass(stats)}">
                                        {formatPnL(stats.pnl)}
                                    </div>
                                {/if}

                                <!-- Open Trades -->
                                {#if stats.openTrades > 0}
                                    <div class="text-xs text-yellow-600 dark:text-yellow-400">
                                        {stats.openTrades} open trade{stats.openTrades !== 1 ? "s" : ""}
                                    </div>
                                {/if}

                                <!-- Transaction Icons -->
                                {#if stats.transactions?.length > 0}
                                    <div class="flex gap-0.5 items-center opacity-60 dark:opacity-80 mt-2">
                                        {#if stats.transactions.some((t) => t.type === "deposit")}
                                            <div class="flex items-center">
                                                <svg
                                                    class="w-[14px] h-[14px] text-green-600 dark:text-green-400"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                        stroke-width="2"
                                                        d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                                                    />
                                                </svg>
                                            </div>
                                        {/if}
                                        {#if stats.transactions.some((t) => t.type === "withdrawal")}
                                            <div class="flex items-center">
                                                <svg
                                                    class="w-[14px] h-[14px] text-red-600 dark:text-red-400"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                        stroke-width="2"
                                                        d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                                                    />
                                                </svg>
                                            </div>
                                        {/if}
                                    </div>
                                {/if}
                            </div>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    </div>
</div>

<MonthTradesModal
    bind:show={showMonthModal}
    trades={selectedMonthTrades}
    transactions={selectedMonthTransactions}
    displayDate={selectedDisplayDate}
    summary={selectedMonthSummary}
    on:view={handleView}
    on:edit={handleEdit}
    on:delete={handleDelete}
    on:deleteTransaction={handleDeleteTransaction}
/>

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-lg;
    }
</style>
