<script>
    import { formatCurrency, formatPercentage } from '$lib/utils/formatters';
    import TradeViewModal from '../trades/TradeViewModal.svelte';
    import { theme } from '$lib/stores/themeStore';
    import { onMount } from 'svelte';
    import { accountStore } from '$lib/stores/accountStore';
    import { api } from '$lib/utils/api';
    
    export let trades = [];
    export let period = 'all';
    export let metric = 'pnl';
    export let limit = 5;
    export let textSize = 'medium';
    export let isPreview = false;

    let selectedTrade = null;
    let showViewModal = false;
    let currentAccountId = null;

    $: filteredTrades = filterTradesByPeriod(trades, period);
    $: topTrades = getTopTrades(filteredTrades, metric, limit);

    async function loadTrades() {
        if (!$accountStore.currentAccount) return;
        
        try {
            trades = await api.getTrades($accountStore.currentAccount._id);
        } catch (err) {
            console.error('Error loading trades:', err);
        }
    }

    onMount(() => {
        if (isPreview) return;
        loadTrades();

        const handleUpdate = async () => {
            console.log('TopTrades: Received update event');
            await loadTrades();
        };
        
        window.addEventListener('tradeupdated', handleUpdate);
        window.addEventListener('tradesynced', handleUpdate);
        
        return () => {
            window.removeEventListener('tradeupdated', handleUpdate);
            window.removeEventListener('tradesynced', handleUpdate);
        };
    });

    $: if ($accountStore.currentAccount?._id !== currentAccountId && !isPreview) {
        currentAccountId = $accountStore.currentAccount?._id;
        loadTrades();
    }

    function filterTradesByPeriod(trades, period) {
        const now = new Date();
        const startOfDay = new Date(now.setHours(0,0,0,0));
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const startOfMonth = new Date(now.setDate(1));
        const startOfYear = new Date(now.setMonth(0));

        return trades.filter(trade => {
            if (!trade.exitDate || trade.status !== 'CLOSED') return false;
            const tradeDate = new Date(trade.exitDate);
            
            switch(period) {
                case 'today': return tradeDate >= startOfDay;
                case 'week': return tradeDate >= startOfWeek;
                case 'month': return tradeDate >= startOfMonth;
                case 'year': return tradeDate >= startOfYear;
                default: return true;
            }
        });
    }

    function getTopTrades(trades, metric, limit) {
        const sortedTrades = [...trades].sort((a, b) => {
            switch(metric) {
                case 'pnl':
                    return b.pnl - a.pnl;
                case 'pnlPercentage':
                    return (b.pnl / b.amount) - (a.pnl / a.amount);
                case 'amount':
                    return b.amount - a.amount;
                case 'riskRewardRatio':
                    const getRR = (trade) => {
                        const risk = trade.stopLoss ? Math.abs(trade.entryPrice - trade.stopLoss) : 0;
                        const reward = trade.takeProfit ? Math.abs(trade.takeProfit - trade.entryPrice) : 0;
                        return risk ? reward / risk : 0;
                    };
                    return getRR(b) - getRR(a);
                case 'duration':
                    return (new Date(b.exitDate) - new Date(b.entryDate)) - 
                           (new Date(a.exitDate) - new Date(a.entryDate));
                case 'quickest':
                    return (new Date(a.exitDate) - new Date(a.entryDate)) - 
                           (new Date(b.exitDate) - new Date(b.entryDate));
                default:
                    return b.pnl - a.pnl;
            }
        });

        return sortedTrades.slice(0, limit);
    }

    function getMetricValue(trade, metric) {
        switch(metric) {
            case 'pnl':
                return formatCurrency(trade.pnl);
            case 'pnlPercentage':
                return formatPercentage((trade.pnl / trade.amount) * 100);
            case 'amount':
                return formatCurrency(trade.amount);
            case 'riskRewardRatio':
                const risk = trade.stopLoss ? Math.abs(trade.entryPrice - trade.stopLoss) : 0;
                const reward = trade.takeProfit ? Math.abs(trade.takeProfit - trade.entryPrice) : 0;
                return risk ? (reward / risk).toFixed(2) : 'N/A';
            case 'duration':
            case 'quickest':
                const duration = new Date(trade.exitDate) - new Date(trade.entryDate);
                const hours = Math.floor(duration / (1000 * 60 * 60));
                const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
                return `${hours}h ${minutes}m`;
            default:
                return formatCurrency(trade.pnl);
        }
    }

    function handleTradeClick(trade) {
        // Reset modal state before showing new trade
        showViewModal = false;
        selectedTrade = null;
        
        // Wait for previous modal to fully close
        setTimeout(() => {
            selectedTrade = { ...trade };
            showViewModal = true;
        }, 100);
    }

    function handleModalClose() {
        showViewModal = false;
        // Reset selectedTrade after modal animation
        setTimeout(() => {
            selectedTrade = null;
        }, 300);
    }

    function getMetricLabel() {
        switch(metric) {
            case 'pnl': return 'Top Profitable Trades';
            case 'pnlPercentage': return 'Best % Return Trades';
            case 'amount': return 'Largest Position Trades';
            case 'riskRewardRatio': return 'Best Risk/Reward Trades';
            case 'duration': return 'Longest Duration Trades';
            case 'quickest': return 'Quickest Trades';
            default: return 'Top Trades';
        }
    }

    function getPeriodLabel() {
        switch(period) {
            case 'today': return 'Today';
            case 'week': return 'This Week';
            case 'month': return 'This Month';
            case 'year': return 'This Year';
            default: return 'All Time';
        }
    }

    function getMetricIcon() {
        switch(metric) {
            case 'pnl': return 'M20 12a8 8 0 01-8 8v-8h8zM12 4v8H4a8 8 0 018-8z';
            case 'pnlPercentage': return 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z';
            case 'amount': return 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
            case 'riskRewardRatio': return 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6';
            case 'duration': return 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z';
            case 'quickest': return 'M13 10V3L4 14h7v7l9-11h-7z';
            default: return 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z';
        }
    }
</script>

<div class="h-full flex flex-col bg-light-card dark:bg-dark-card rounded-lg overflow-hidden shadow-sm {textSize}">
    <!-- Header -->
    <div class="p-4 border-b border-light-border dark:border-dark-border bg-gradient-to-r from-theme-500/5 to-transparent dark:from-theme-500/10">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-theme-500/10 flex items-center justify-center">
                <svg class="w-6 h-6 text-theme-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d={getMetricIcon()} />
                </svg>
            </div>
            <div class="flex-1">
                <h2 class="text-lg font-semibold text-light-text dark:text-dark-text">
                    {getMetricLabel()}
                </h2>
                <p class="text-sm text-light-text-muted dark:text-dark-text-muted">
                    {getPeriodLabel()}
                </p>
            </div>
        </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-3">
        {#if topTrades.length === 0}
            <div class="h-full flex items-center justify-center text-center p-4">
                <div class="space-y-3">
                    <div class="w-16 h-16 rounded-full bg-theme-500/5 flex items-center justify-center mx-auto">
                        <svg class="w-8 h-8 text-theme-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>
                    <div>
                        <p class="font-medium text-light-text dark:text-dark-text">
                            No trades found
                        </p>
                        <p class="text-sm text-light-text-muted dark:text-dark-text-muted">
                            Try adjusting your filters
                        </p>
                    </div>
                </div>
            </div>
        {:else}
            <div class="space-y-2">
                {#each topTrades as trade, i}
                    <button
                        class="group w-full p-1.5 rounded-lg bg-light-background/50 dark:bg-dark-background/50 hover:bg-theme-500/5 dark:hover:bg-theme-500/10 
                               transition-all duration-200 flex items-center gap-3 relative border border-transparent hover:border-theme-500/20"
                        on:click={() => handleTradeClick(trade)}
                    >
                        <!-- Rank Badge -->
                        <div class="relative z-10 w-8 h-8 rounded-lg bg-theme-500/10 flex items-center justify-center">
                            <span class="text-sm font-semibold text-theme-500">
                                #{i + 1}
                            </span>
                        </div>

                        <!-- Trade Info -->
                        <div class="flex-1 flex items-center justify-between relative z-10">
                            <div class="flex flex-col">
                                <div class="flex items-center gap-2">
                                    <span class="font-medium text-light-text dark:text-dark-text">
                                        {trade.symbol}
                                    </span>
                                    <span class="text-xs relative px-2 py-0.5 rounded-full font-bold
                                               {trade.side === 'LONG' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}">
                                        {trade.side}
                                        {#if trade.status === 'OPEN'}
                                            <div class="absolute inset-0 rounded-full animate-ping 
                                                       {trade.side === 'LONG' ? 'bg-green-500/10' : 'bg-red-500/10'}">
                                            </div>
                                        {/if}
                                    </span>
                                </div>
                                <div class="flex items-center gap-2 text-sm text-light-text-muted dark:text-dark-text-muted">
                                    <span>{new Date(trade.exitDate).toLocaleDateString()}</span>
                                    <span class="text-theme-500/50">•</span>
                                    <span>{getMetricValue(trade, metric)}</span>
                                </div>
                            </div>
                            <div class="text-right flex flex-col items-end">
                                <span class="text-lg font-bold {trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}">
                                    {formatCurrency(trade.pnl)}
                                </span>
                                <span class="text-xs text-light-text-muted dark:text-dark-text-muted">
                                    {formatPercentage((trade.pnl / trade.amount) * 100)}
                                </span>
                            </div>
                        </div>
                    </button>
                {/each}
            </div>
        {/if}
    </div>
</div>

{#if showViewModal && selectedTrade}
    <TradeViewModal
        show={showViewModal}
        trade={selectedTrade}
        on:close={handleModalClose}
    />
{/if}

<style>
    .small { font-size: 0.875rem; }
    .medium { font-size: 1rem; }
    .large { font-size: 1.125rem; }
    .extra-large { font-size: 1.25rem; }

    /* Smooth scrolling */
    .overflow-y-auto {
        scrollbar-width: thin;
        scrollbar-color: var(--theme-500) transparent;
    }

    .overflow-y-auto::-webkit-scrollbar {
        width: 4px;
    }

    .overflow-y-auto::-webkit-scrollbar-track {
        background: transparent;
    }

    .overflow-y-auto::-webkit-scrollbar-thumb {
        background-color: var(--theme-500);
        border-radius: 2px;
    }

    /* Prevent text selection on buttons */
    button {
        user-select: none;
    }

    /* Improved hover effects */
    button {
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
    }

    button:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
</style> 