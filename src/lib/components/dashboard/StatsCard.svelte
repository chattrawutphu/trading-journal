<script>
    import { onMount } from "svelte";
    
    export let totalPnL;
    export let openTrades;
    export let closedTrades;
    export let winRate;
    export let textSize = 'medium';
    export let isPreview = false;
    export let trades = [];

    // Calendar logic
    let selectedMonth = new Date().getMonth();
    let selectedYear = new Date().getFullYear();
    let calendarDays = [];
    let dailyPnL = {};

    // Add logging
    $: console.log('StatsCard trades:', trades);
    $: console.log('StatsCard dailyPnL:', dailyPnL);

    // Helper function to normalize date
    function normalizeDate(date) {
        const d = new Date(date);
        d.setHours(12, 0, 0, 0);
        return d;
    }

    function isFutureDate(day) {
        const date = normalizeDate(new Date(selectedYear, selectedMonth, day));
        const today = normalizeDate(new Date());
        return date > today;
    }

    // Calculate calendar days and daily PnL
    $: {
        // Calculate days in month
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const firstDayOfWeek = (new Date(selectedYear, selectedMonth, 1).getDay() + 6) % 7;

        calendarDays = Array.from(
            { length: 42 },
            (_, i) => {
                const dayNumber = i - firstDayOfWeek + 1;
                if (dayNumber < 1 || dayNumber > daysInMonth) return null;
                return dayNumber;
            }
        );

        // Reset and recalculate dailyPnL
        dailyPnL = {};
        if (Array.isArray(trades)) {
            trades.forEach(trade => {
                if (trade.status === "CLOSED" && trade.exitDate) {
                    const exitDate = normalizeDate(new Date(trade.exitDate));
                    if (exitDate.getMonth() === selectedMonth && exitDate.getFullYear() === selectedYear) {
                        const day = exitDate.getDate();
                        dailyPnL[day] = (dailyPnL[day] || 0) + (Number(trade.pnl) || 0);
                    }
                }
            });
        }
        console.log('Updated dailyPnL:', dailyPnL);
    }

    function getDayClass(day) {
        if (!day) return "invisible";
        
        const baseClasses = "w-full h-full rounded-sm transition-colors duration-200";
        
        if (isFutureDate(day)) {
            return `${baseClasses} bg-gray-500/5 dark:bg-gray-700/20`;
        }
        
        const pnl = dailyPnL[day] || 0;
        console.log(`Day ${day} PnL:`, pnl);
        
        if (pnl > 0) {
            return `${baseClasses} bg-green-500/50 dark:bg-green-500/40`;
        }
        if (pnl < 0) {
            return `${baseClasses} bg-red-500/50 dark:bg-red-500/40`;
        }
        return `${baseClasses} bg-gray-200/50 dark:bg-gray-600/30`;
    }

    function getDayTextClass(day) {
        if (!day || isFutureDate(day)) {
            return "text-light-text-muted/50 dark:text-dark-text-muted/50";
        }
        const pnl = dailyPnL[day] || 0;
        if (pnl > 0) return "text-green-800 dark:text-green-200 font-semibold";
        if (pnl < 0) return "text-red-800 dark:text-red-200 font-semibold";
        return "text-light-text-muted dark:text-dark-text-muted";
    }
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
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-0 rounded-lg shadow-lg;
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

    .aspect-square {
        aspect-ratio: 1;
    }

    /* Add smooth transitions */
    .transition-colors {
        transition: all 0.2s ease-in-out;
    }

    /* Add styles for calendar cell */
    .calendar-cell {
        @apply rounded-sm;
        min-height: 24px;
        min-width: 24px;
    }
</style>
