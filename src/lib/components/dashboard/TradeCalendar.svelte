<script>
    import { createEventDispatcher } from 'svelte';
    import { theme } from '$lib/stores/themeStore';
    import Select from '../common/Select.svelte';
    import EmptyDayModal from './EmptyDayModal.svelte';
    
    const dispatch = createEventDispatcher();
    
    export let trades = [];

    let selectedMonth = new Date().getMonth();
    let selectedYear = new Date().getFullYear();
    let showEmptyDayModal = false;
    let selectedDate = '';

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({length: 6}, (_, i) => currentYear - 5 + i);

    $: daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    $: firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay();
    $: lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0).getDay();
    
    $: calendarDays = Array.from(
        { length: daysInMonth + firstDayOfMonth + (6 - lastDayOfMonth) }, 
        (_, i) => {
            const dayNumber = i - firstDayOfMonth + 1;
            if (dayNumber < 1 || dayNumber > daysInMonth) return null;
            return dayNumber;
        }
    );

    function isFutureDate(day) {
        const date = new Date(selectedYear, selectedMonth, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date > today;
    }

    function formatDateForInput(date) {
        // Set time to noon to avoid timezone issues
        const d = new Date(date);
        d.setHours(12, 0, 0, 0);
        return d.toISOString().slice(0, 16);
    }

    $: dailyTrades = trades.reduce((acc, trade) => {
        let tradeDate;
        if (trade.status === 'CLOSED') {
            tradeDate = new Date(trade.exitDate);
        } else {
            tradeDate = new Date(trade.entryDate);
        }
        
        try {
            if (isNaN(tradeDate.getTime())) return acc;
            
            const dateKey = tradeDate.toISOString().split('T')[0];
            if (!acc[dateKey]) {
                acc[dateKey] = {
                    trades: [],
                    pnl: 0,
                    symbols: new Set(),
                    wins: 0,
                    losses: 0,
                    openTrades: 0
                };
            }
            
            acc[dateKey].trades.push(trade);
            if (trade.status === 'CLOSED') {
                acc[dateKey].pnl += trade.pnl || 0;
                if (trade.pnl > 0) acc[dateKey].wins++;
                else if (trade.pnl < 0) acc[dateKey].losses++;
            } else {
                acc[dateKey].openTrades++;
            }
            acc[dateKey].symbols.add(trade.symbol);
            
        } catch (err) {
            console.error('Error processing trade date:', err);
        }
        return acc;
    }, {});

    function getDayStats(day) {
        if (!day) return null;
        try {
            const date = new Date(selectedYear, selectedMonth, day);
            if (isNaN(date.getTime())) return null;
            
            const dateKey = date.toISOString().split('T')[0];
            return dailyTrades[dateKey] || null;
        } catch (err) {
            console.error('Error getting day stats:', err);
            return null;
        }
    }

    function getCardClass(stats, day) {
        if (isFutureDate(day)) return 'opacity-50 bg-light-hover/10 dark:bg-dark-hover/10';
        if (!stats || (!stats.pnl && !stats.openTrades)) return 'cursor-pointer';
        
        // Check for closed trades first
        const hasClosedTrades = stats.wins > 0 || stats.losses > 0;
        if (hasClosedTrades) {
            if ($theme === 'light') {
                return `cursor-pointer ${stats.pnl > 0 ? 'bg-green-100' : 'bg-red-100'}`;
            }
            return `cursor-pointer ${stats.pnl > 0 ? 'bg-green-900/20' : 'bg-red-900/20'}`;
        }
        
        // If no closed trades but has open trades
        if (stats.openTrades > 0) {
            return `cursor-pointer ${$theme === 'light' ? 'bg-yellow-50' : 'bg-yellow-900/10'}`;
        }
        
        return 'cursor-pointer';
    }

    function getTextClass(stats) {
        if (!stats || (!stats.pnl && !stats.openTrades)) return '';
        
        // Check for closed trades first
        const hasClosedTrades = stats.wins > 0 || stats.losses > 0;
        if (hasClosedTrades) {
            if ($theme === 'dark') {
                return stats.pnl > 0 ? 'text-green-300' : 'text-red-300';
            }
            return stats.pnl > 0 ? 'text-green-600' : 'text-red-600';
        }
        
        // If no closed trades but has open trades
        if (stats.openTrades > 0) {
            return $theme === 'dark' ? 'text-yellow-300' : 'text-yellow-600';
        }
        
        return '';
    }

    function formatPnL(pnl) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(pnl);
    }

    function handleDayClick(day, stats) {
        if (isFutureDate(day)) return;

        const date = new Date(selectedYear, selectedMonth, day);
        const formattedDate = formatDateForInput(date);
        const displayDate = date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        if (!stats?.trades.length) {
            selectedDate = formattedDate;
            showEmptyDayModal = true;
            return;
        }

        dispatch('dayClick', {
            date: formattedDate,
            displayDate,
            trades: [...stats.trades].sort((a, b) => {
                if (a.status !== b.status) {
                    return a.status === 'OPEN' ? -1 : 1;
                }
                return (b.pnl || 0) - (a.pnl || 0);
            })
        });
    }

    function handleNewTrade() {
        dispatch('newTrade', selectedDate);
    }
</script>

<div class="card h-full flex flex-col">
    <div class="p-4 border-b border-light-border dark:border-dark-border">
        <div class="flex justify-between items-center">
            <h2 class="text-xl font-semibold">Trading Calendar</h2>
            <div class="flex gap-2">
                <Select 
                    options={months.map((month, i) => ({ value: i, label: month }))}
                    bind:value={selectedMonth}
                    className="w-36"
                />
                <Select 
                    options={years.map(year => ({ value: year, label: year.toString() }))}
                    bind:value={selectedYear}
                    className="w-24"
                />
            </div>
        </div>
    </div>

    <!-- Calendar Grid -->
    <div class="flex-1 p-4 grid grid-rows-[auto_1fr]">
        <!-- Day headers -->
        <div class="grid grid-cols-7 gap-1">
            {#each ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as day}
                <div class="text-center py-1 text-xs font-medium text-light-text-muted dark:text-dark-text-muted">
                    {day}
                </div>
            {/each}
        </div>

        <!-- Calendar days -->
        <div class="grid grid-cols-7 gap-1">
            {#each calendarDays as day}
                {@const stats = getDayStats(day)}
                <div class="relative aspect-square">
                    {#if day !== null}
                        <div 
                            class="absolute inset-0 border border-light-border dark:border-dark-border rounded-md 
                                   {getCardClass(stats, day)} hover:shadow transition-all duration-200 {!isFutureDate(day) && 'hover:scale-[1.02]'}"
                            on:click={() => handleDayClick(day, stats)}
                        >
                            <!-- Date in top right -->
                            <div class="absolute top-1 right-1.5 text-xs font-medium">
                                {day}
                            </div>

                            {#if stats?.trades.length > 0}
                                <div class="absolute inset-0 p-1.5 pt-5 flex flex-col">
                                    <!-- Trade count & Win/Loss -->
                                    <div class="space-y-0.5">
                                        <div class="flex items-center gap-1">
                                            <span class="text-[10px] text-light-text-muted dark:text-dark-text-muted">
                                                {stats.trades.length} trade{stats.trades.length !== 1 ? 's' : ''}
                                            </span>
                                            <div class="flex gap-1 text-[10px]">
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
                                        </div>
                                    </div>

                                    <!-- P&L -->
                                    {#if stats.pnl !== 0}
                                        <div class="mt-auto">
                                            <span class="text-xs font-medium {getTextClass(stats)}">
                                                {formatPnL(stats.pnl)}
                                            </span>
                                        </div>
                                    {/if}
                                </div>
                            {/if}
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    </div>
</div>

<EmptyDayModal
    bind:show={showEmptyDayModal}
    date={selectedDate}
    on:newTrade={handleNewTrade}
/>

<style>
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-lg transition-colors duration-200;
    }
</style>
