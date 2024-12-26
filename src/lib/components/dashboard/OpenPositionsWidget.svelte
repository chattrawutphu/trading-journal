<script>
    import { onMount, afterUpdate } from 'svelte';
    import { fade, slide } from 'svelte/transition';

    export let trades = [];
    export let height;
    export let textSize;
    export let isPreview = false;

    let openPositions = [];
    let totalValue = 0;
    let totalPnL = 0;
    let pnlPercentage = 0;
    let showAllPositions = false;

    $: if (trades) {
        calculatePositions();
    }

    function calculatePositions() {
        openPositions = trades.filter(t => t.status === 'OPEN')
            .map(position => {
                const currentPrice = position.lastPrice || position.entryPrice || 0;
                const size = position.size || 0;
                const entryPrice = position.entryPrice || 0;
                
                const positionValue = currentPrice * size;
                const unrealizedPnL = (currentPrice - entryPrice) * size;
                const pnlPercentage = entryPrice ? (unrealizedPnL / (entryPrice * size)) * 100 : 0;
                
                return {
                    ...position,
                    currentPrice,
                    positionValue,
                    unrealizedPnL,
                    pnlPercentage,
                    size,
                    entryPrice
                };
            })
            .sort((a, b) => Math.abs(b.unrealizedPnL) - Math.abs(a.unrealizedPnL));

        totalValue = openPositions.reduce((sum, pos) => sum + (pos.positionValue || 0), 0);
        totalPnL = openPositions.reduce((sum, pos) => sum + (pos.unrealizedPnL || 0), 0);
        pnlPercentage = totalValue ? (totalPnL / totalValue) * 100 : 0;
    }

    function formatCurrency(value) {
        if (value === undefined || value === null) return '$0';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    }

    function formatPercentage(value) {
        if (value === undefined || value === null) return '0%';
        return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
    }

    function formatCompactNumber(value) {
        if (value === undefined || value === null) return '0';
        if (Math.abs(value) >= 1000000) {
            return (value / 1000000).toFixed(1) + 'M';
        } else if (Math.abs(value) >= 1000) {
            return (value / 1000).toFixed(1) + 'K';
        }
        return value.toFixed(0);
    }
</script>

<div class="h-full flex flex-col bg-light-card dark:bg-dark-card rounded-lg shadow-sm">
    <!-- Header -->
    <div class="p-4 border-b border-light-border dark:border-dark-border">
        <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
                <div class="w-10 h-10 rounded-full bg-theme-500 bg-opacity-10 flex items-center justify-center">
                    <svg class="w-5 h-5 text-theme-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                    </svg>
                </div>
                <div>
                    <h3 class="text-base font-medium text-light-text dark:text-dark-text">
                        Open Positions
                    </h3>
                    <p class="text-xs text-light-text-muted dark:text-dark-text-muted">
                        {openPositions.length} active {openPositions.length === 1 ? 'position' : 'positions'}
                    </p>
                </div>
            </div>
            {#if openPositions.length > 3}
                <button 
                    class="text-xs text-theme-500 hover:text-theme-600 dark:hover:text-theme-400"
                    on:click={() => showAllPositions = !showAllPositions}
                >
                    {showAllPositions ? 'Show Less' : 'View All'}
                </button>
            {/if}
        </div>

        <!-- Summary Stats -->
        <div class="grid grid-cols-3 gap-3">
            <div class="p-3 rounded-lg bg-light-hover/30 dark:bg-dark-hover/30">
                <p class="text-xs text-light-text-muted dark:text-dark-text-muted mb-1">Total Value</p>
                <p class="text-base font-bold text-light-text dark:text-dark-text">
                    {formatCurrency(totalValue)}
                </p>
            </div>
            <div class="p-3 rounded-lg bg-light-hover/30 dark:bg-dark-hover/30">
                <p class="text-xs text-light-text-muted dark:text-dark-text-muted mb-1">Unrealized P&L</p>
                <p class="text-base font-bold {totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}">
                    {formatCurrency(totalPnL)}
                </p>
            </div>
            <div class="p-3 rounded-lg bg-light-hover/30 dark:bg-dark-hover/30">
                <p class="text-xs text-light-text-muted dark:text-dark-text-muted mb-1">Return</p>
                <p class="text-base font-bold {pnlPercentage >= 0 ? 'text-green-500' : 'text-red-500'}">
                    {formatPercentage(pnlPercentage)}
                </p>
            </div>
        </div>
    </div>

    <!-- Positions List -->
    <div class="flex-1 p-4 overflow-y-auto">
        {#if openPositions.length > 0}
            <div class="space-y-3">
                {#each openPositions.slice(0, showAllPositions ? undefined : 3) as position}
                    <div 
                        class="p-3 rounded-lg border border-light-border dark:border-dark-border hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
                        transition:slide
                    >
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center gap-2">
                                <span class="text-base font-medium text-light-text dark:text-dark-text">
                                    {position.symbol}
                                </span>
                                <span class="text-xs px-2 py-0.5 rounded-full {position.side === 'BUY' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}">
                                    {position.side}
                                </span>
                            </div>
                            <div class="text-right">
                                <p class="text-sm font-medium {position.unrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}">
                                    {formatCurrency(position.unrealizedPnL)}
                                </p>
                                <p class="text-xs {position.pnlPercentage >= 0 ? 'text-green-500' : 'text-red-500'}">
                                    {formatPercentage(position.pnlPercentage)}
                                </p>
                            </div>
                        </div>
                        <div class="grid grid-cols-3 gap-2 text-xs text-light-text-muted dark:text-dark-text-muted">
                            <div>
                                <p class="mb-0.5">Size</p>
                                <p class="font-medium text-light-text dark:text-dark-text">
                                    {formatCompactNumber(position.size || 0)}
                                </p>
                            </div>
                            <div>
                                <p class="mb-0.5">Entry</p>
                                <p class="font-medium text-light-text dark:text-dark-text">
                                    ${(position.entryPrice || 0).toFixed(2)}
                                </p>
                            </div>
                            <div>
                                <p class="mb-0.5">Current</p>
                                <p class="font-medium text-light-text dark:text-dark-text">
                                    ${(position.currentPrice || 0).toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        {:else}
            <div class="flex flex-col items-center justify-center h-full text-light-text-muted dark:text-dark-text-muted">
                <svg class="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                </svg>
                <p class="text-sm">No open positions</p>
            </div>
        {/if}
    </div>
</div>

<style>
    /* Smooth scrolling for position list */
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
</style>
