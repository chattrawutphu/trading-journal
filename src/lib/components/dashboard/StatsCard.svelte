<script>
    export let totalPnL;
    export let openTrades;
    export let closedTrades;
    export let winRate;
    export let textSize = 'medium';
    export let isPreview = false;
</script>

<div class="card p-4 h-full {textSize}">
    <!-- Container for all stats -->
    <div class="grid grid-cols-1 md:grid-cols-1 gap-4">
        <!-- Total P&L -->
        <div class="flex md:flex-col items-center md:items-stretch gap-4 md:gap-2">
            <div class="flex items-center justify-between flex-1 md:mb-2">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full {totalPnL >= 0 ? 'bg-green-500' : 'bg-red-500'} bg-opacity-10 flex items-center justify-center">
                        <svg class="w-4 h-4 {totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                    <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted md:hidden">
                        Total P&L
                    </h3>
                </div>
                <p class="text-xl md:text-2xl font-bold {totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}">
                    ${totalPnL.toFixed(2)}
                </p>
            </div>
            <h3 class="hidden md:block text-sm font-medium text-light-text-muted dark:text-dark-text-muted">
                Total P&L
            </h3>
        </div>

        <!-- Open Positions -->
        <div class="flex md:flex-col items-center md:items-stretch gap-4 md:gap-2">
            <div class="flex items-center justify-between flex-1 md:mb-2">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-yellow-500 bg-opacity-10 flex items-center justify-center">
                        <svg class="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                    <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted md:hidden">
                        Open Positions
                    </h3>
                </div>
                <p class="text-xl md:text-2xl font-bold text-light-text dark:text-dark-text">
                    {openTrades.length}
                </p>
            </div>
            <h3 class="hidden md:block text-sm font-medium text-light-text-muted dark:text-dark-text-muted">
                Open Positions
            </h3>
        </div>

        <!-- Total Trades -->
        <div class="flex md:flex-col items-center md:items-stretch gap-4 md:gap-2">
            <div class="flex items-center justify-between flex-1 md:mb-2">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-theme-500 bg-opacity-10 flex items-center justify-center">
                        <svg class="w-4 h-4 text-theme-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                        </svg>
                    </div>
                    <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted md:hidden">
                        Total Trades
                    </h3>
                </div>
                <p class="text-xl md:text-2xl font-bold text-light-text dark:text-dark-text">
                    {openTrades.length + closedTrades.length}
                </p>
            </div>
            <h3 class="hidden md:block text-sm font-medium text-light-text-muted dark:text-dark-text-muted">
                Total Trades
            </h3>
        </div>

        <!-- Win Rate -->
        <div class="flex md:flex-col items-center md:items-stretch gap-4 md:gap-2">
            <div class="flex items-center justify-between flex-1 md:mb-2">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-green-500 bg-opacity-10 flex items-center justify-center">
                        <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                        </svg>
                    </div>
                    <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted md:hidden">
                        Win Rate
                    </h3>
                </div>
                <p class="text-xl md:text-2xl font-bold text-light-text dark:text-dark-text">
                    {winRate}%
                </p>
            </div>
            <h3 class="hidden md:block text-sm font-medium text-light-text-muted dark:text-dark-text-muted">
                Win Rate
            </h3>
        </div>
    </div>
</div>

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-lg;
    }

    /* Adjust text sizes based on the textSize prop */
    .small {
        @apply text-sm;
    }
    .medium {
        @apply text-base;
    }
    .large {
        @apply text-lg;
    }
    .extra-large {
        @apply text-xl;
    }
</style>
