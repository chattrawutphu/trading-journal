<script>
    import { createEventDispatcher, onMount } from "svelte";
    import { theme } from "$lib/stores/themeStore";
    import { accountStore } from "$lib/stores/accountStore";
    import { transactionStore } from "$lib/stores/transactionStore";
    import { dailyBalancesStore } from '$lib/stores/dailyBalancesStore';
    import { api } from '$lib/utils/api';
    import MonthTradesModal from './MonthTradesModal.svelte';
    import { fade } from 'svelte/transition';
    import Select from '../common/Select.svelte';
    import DatePicker from '../common/DatePicker.svelte';

    const dispatch = createEventDispatcher();

    export let trades = [];
    export let isPreview = false;
    export let textSize = 'medium';
    export let accountId = null;

    let currentAccountId = null;
    let monthlyTrades = {};
    let showMonthModal = false;
    let selectedMonthTrades = [];
    let selectedMonthTransactions = [];
    let selectedDisplayDate = "";
    let selectedMonthSummary = {};
    let selectedYear = new Date().getFullYear();
    let showYearPicker = false;
    let loading = false;

    const years = Array.from({ length: 6 }, (_, i) => selectedYear - 3 + i);
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

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

    // Calculate monthly stats when trades change
    $: {
        monthlyTrades = {};
        trades.forEach(trade => {
            if (trade.status === "CLOSED") {
                const date = new Date(trade.exitDate);
                const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
                
                if (!monthlyTrades[monthKey]) {
                    monthlyTrades[monthKey] = {
                        trades: [],
                        pnl: 0,
                        wins: 0,
                        losses: 0,
                        volume: 0,
                        tradeCount: 0,
                        transactions: [],
                        startBalance: 0,
                        endBalance: 0,
                        maxDrawdown: 0,
                        bestTrade: null,
                        worstTrade: null
                    };
                }
                
                monthlyTrades[monthKey].trades.push(trade);
                monthlyTrades[monthKey].pnl += trade.pnl || 0;
                monthlyTrades[monthKey].volume += trade.amount || 0;
                monthlyTrades[monthKey].tradeCount += 1;
                
                if (trade.pnl > 0) {
                    monthlyTrades[monthKey].wins += 1;
                    if (!monthlyTrades[monthKey].bestTrade || trade.pnl > monthlyTrades[monthKey].bestTrade.pnl) {
                        monthlyTrades[monthKey].bestTrade = trade;
                    }
                } else if (trade.pnl < 0) {
                    monthlyTrades[monthKey].losses += 1;
                    if (!monthlyTrades[monthKey].worstTrade || trade.pnl < monthlyTrades[monthKey].worstTrade.pnl) {
                        monthlyTrades[monthKey].worstTrade = trade;
                    }
                }
            }
        });

        // Add transactions to monthly stats
        if ($transactionStore.transactions) {
            $transactionStore.transactions.forEach(transaction => {
                const date = new Date(transaction.date);
                const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
                
                if (!monthlyTrades[monthKey]) {
                    monthlyTrades[monthKey] = {
                        trades: [],
                        pnl: 0,
                        wins: 0,
                        losses: 0,
                        volume: 0,
                        tradeCount: 0,
                        transactions: [],
                        startBalance: 0,
                        endBalance: 0
                    };
                }
                
                monthlyTrades[monthKey].transactions.push(transaction);
            });
        }
    }

    function getMonthStats(year, month) {
        const monthKey = `${year}-${month}`;
        return monthlyTrades[monthKey] || {
            trades: [],
            pnl: 0,
            wins: 0,
            losses: 0,
            volume: 0,
            tradeCount: 0,
            transactions: [],
            startBalance: 0,
            endBalance: 0
        };
    }

    function getMonthClass(stats) {
        if (!stats.tradeCount) return 'bg-light-card dark:bg-dark-card';
        if (stats.pnl > 0) return 'bg-green-500/10 dark:bg-green-400/10 hover:bg-green-500/20 dark:hover:bg-green-400/20';
        if (stats.pnl < 0) return 'bg-red-500/10 dark:bg-red-400/10 hover:bg-red-500/20 dark:hover:bg-red-400/20';
        return 'bg-light-card dark:bg-dark-card hover:bg-light-hover dark:hover:bg-dark-hover';
    }

    function formatAmount(amount) {
        if (amount >= 1000000) {
            return (amount / 1000000).toFixed(1) + 'M';
        }
        if (amount >= 1000) {
            return (amount / 1000).toFixed(1) + 'K';
        }
        return amount.toFixed(0);
    }

    function formatPnL(value) {
        if (!value) return '$0';
        const prefix = value >= 0 ? '+$' : '-$';
        return `${prefix}${formatAmount(Math.abs(value))}`;
    }

    function formatPercentage(value) {
        if (!value || isNaN(value)) return '0%';
        return `${value.toFixed(1)}%`;
    }

    function getWinRate(stats) {
        if (!stats.tradeCount) return 0;
        return (stats.wins / stats.tradeCount) * 100;
    }

    function getROI(stats) {
        if (!stats.volume || stats.volume === 0) return 0;
        return (stats.pnl / stats.volume) * 100;
    }

    function isCurrentMonth(year, month) {
        const now = new Date();
        return year === now.getFullYear() && month === now.getMonth();
    }

    function isFutureMonth(year, month) {
        const now = new Date();
        return (year > now.getFullYear()) || 
               (year === now.getFullYear() && month > now.getMonth());
    }

    function handleMonthClick(month, stats) {
        if (isFutureMonth(selectedYear, month)) return;
        if (!stats?.trades.length && !stats?.transactions?.length) return;

        selectedMonthTrades = stats.trades;
        selectedMonthTransactions = stats.transactions;
        selectedDisplayDate = `${months[month]} ${selectedYear}`;
        selectedMonthSummary = {
            totalTrades: stats.tradeCount,
            wins: stats.wins,
            losses: stats.losses,
            winRate: getWinRate(stats),
            roi: getROI(stats),
            pnl: stats.pnl,
            volume: stats.volume,
            bestTrade: stats.bestTrade,
            worstTrade: stats.worstTrade,
            maxDrawdown: stats.maxDrawdown
        };
        showMonthModal = true;
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
    <!-- Header -->
    <div class="p-4 border-b border-light-border dark:border-0">
        <div class="flex items-center justify-between">
            <div class="relative">
                <button
                    class="px-3 py-1.5 text-sm font-medium rounded-lg
                           bg-light-card dark:bg-dark-card
                           hover:bg-light-hover dark:hover:bg-dark-hover
                           text-light-text dark:text-dark-text
                           border border-light-border dark:border-0
                           transition-colors duration-200"
                    on:click={() => showYearPicker = !showYearPicker}
                >
                    {selectedYear}
                    <svg class="w-4 h-4 ml-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                </button>

                {#if showYearPicker}
                    <div 
                        class="absolute top-full mt-1 w-48 bg-light-card dark:bg-dark-card rounded-lg shadow-lg border border-light-border dark:border-0 z-50"
                        transition:fade
                    >
                        <div class="p-2">
                            {#each years as year}
                                <button
                                    class="w-full text-left px-3 py-1.5 rounded-lg text-sm
                                           {year === selectedYear ? 
                                           'bg-theme-500 text-white' : 
                                           'text-light-text dark:text-dark-text hover:bg-light-hover dark:hover:bg-dark-hover'}"
                                    on:click={() => {
                                        selectedYear = year;
                                        showYearPicker = false;
                                    }}
                                >
                                    {year}
                                </button>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    </div>

    <!-- Month Grid -->
    <div class="flex-1 p-4">
        <div class="grid grid-cols-3 gap-4">
            {#each months as month, i (i)}
                {@const stats = getMonthStats(selectedYear, i)}
                {@const isCurrentMonthFlag = isCurrentMonth(selectedYear, i)}
                {@const isFutureMonthFlag = isFutureMonth(selectedYear, i)}
                
                <div class="relative">
                    <button 
                        class="w-full h-full text-left transition-all duration-200 
                               {getMonthClass(stats)} rounded-lg overflow-hidden
                               {isFutureMonthFlag ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg'}"
                        on:click={() => handleMonthClick(i, stats)}
                        disabled={isFutureMonthFlag}
                    >
                        <div class="p-4 flex flex-col h-full">
                            <!-- Month Header -->
                            <div class="flex justify-between items-start mb-2">
                                <span class="text-sm font-medium text-light-text dark:text-dark-text">
                                    {month}
                                </span>
                                {#if isCurrentMonthFlag}
                                    <div class="w-2 h-2 rounded-full bg-theme-500 animate-pulse"></div>
                                {/if}
                            </div>

                            <!-- Stats -->
                            {#if stats.tradeCount > 0}
                                <div class="mt-auto space-y-2">
                                    <!-- P&L -->
                                    <div class="flex justify-between items-center">
                                        <span class="text-xs text-light-text-muted dark:text-dark-text-muted">P&L</span>
                                        <span class="text-sm font-medium {stats.pnl >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}">
                                            {formatPnL(stats.pnl)}
                                        </span>
                                    </div>

                                    <!-- Win Rate -->
                                    <div class="flex justify-between items-center">
                                        <span class="text-xs text-light-text-muted dark:text-dark-text-muted">Win Rate</span>
                                        <span class="text-sm font-medium text-light-text dark:text-dark-text">
                                            {formatPercentage(getWinRate(stats))}
                                        </span>
                                    </div>

                                    <!-- ROI -->
                                    <div class="flex justify-between items-center">
                                        <span class="text-xs text-light-text-muted dark:text-dark-text-muted">ROI</span>
                                        <span class="text-sm font-medium text-light-text dark:text-dark-text">
                                            {formatPercentage(getROI(stats))}
                                        </span>
                                    </div>

                                    <!-- Trade Count -->
                                    <div class="flex justify-between items-center">
                                        <span class="text-xs text-light-text-muted dark:text-dark-text-muted">Trades</span>
                                        <span class="text-sm font-medium text-light-text dark:text-dark-text">
                                            {stats.tradeCount}
                                        </span>
                                    </div>
                                </div>
                            {/if}

                            <!-- Transaction Indicators -->
                            {#if stats.transactions?.length > 0}
                                <div class="mt-2 flex gap-1 justify-end">
                                    {#if stats.transactions.some(t => t.type === 'deposit')}
                                        <div class="w-2 h-2 rounded-full bg-green-500"></div>
                                    {/if}
                                    {#if stats.transactions.some(t => t.type === 'withdrawal')}
                                        <div class="w-2 h-2 rounded-full bg-red-500"></div>
                                    {/if}
                                </div>
                            {/if}
                        </div>
                    </button>
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
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-0 rounded-lg shadow-lg;
    }
</style>
