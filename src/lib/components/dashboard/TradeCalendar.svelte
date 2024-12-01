<script>
    import { theme } from '$lib/stores/themeStore';
    import Select from '../common/Select.svelte';
    import DayTradesModal from './DayTradesModal.svelte';
    
    export let trades = [];

    let selectedMonth = new Date().getMonth();
    let selectedYear = new Date().getFullYear();
    let showModal = false;
    let selectedDayTrades = [];
    let selectedDate = '';

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({length: 6}, (_, i) => currentYear - 5 + i);

    $: daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    $: firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay();
    
    $: calendarDays = Array.from({length: 42}, (_, i) => {
        const dayNumber = i - firstDayOfMonth + 1;
        if (dayNumber < 1 || dayNumber > daysInMonth) return null;
        return dayNumber;
    });

    $: dailyTrades = trades.reduce((acc, trade) => {
        if (!trade.exitDate) return acc;
        
        try {
            const tradeDate = new Date(trade.exitDate);
            if (isNaN(tradeDate.getTime())) return acc;
            
            const dateKey = tradeDate.toISOString().split('T')[0];
            if (!acc[dateKey]) {
                acc[dateKey] = {
                    trades: [],
                    pnl: 0,
                    symbols: new Set(),
                    wins: 0,
                    losses: 0
                };
            }
            
            acc[dateKey].trades.push(trade);
            acc[dateKey].pnl += trade.pnl || 0;
            acc[dateKey].symbols.add(trade.symbol);
            if (trade.pnl > 0) acc[dateKey].wins++;
            else if (trade.pnl < 0) acc[dateKey].losses++;
            
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

    function getCardClass(stats) {
        if (!stats || stats.pnl === 0) return '';
        if ($theme === 'light') {
            return stats.pnl > 0 ? 'bg-green-50/50' : 'bg-red-50/50';
        }
        return stats.pnl > 0 ? 'bg-green-900/10' : 'bg-red-900/10';
    }

    function getTextClass(pnl) {
        if (pnl === 0) return '';
        if ($theme === 'dark') {
            return pnl > 0 ? 'text-green-400' : 'text-red-400';
        }
        return pnl > 0 ? 'text-green-700' : 'text-red-700';
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
        if (!stats?.trades.length) return;
        
        const date = new Date(selectedYear, selectedMonth, day);
        selectedDate = date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        selectedDayTrades = [...stats.trades].sort((a, b) => b.pnl - a.pnl);
        showModal = true;
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
                                   {getCardClass(stats)} hover:shadow transition-all duration-200 
                                   {stats?.trades.length ? 'cursor-pointer hover:scale-[1.02]' : ''}"
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
                                                {stats.trades.length}t
                                            </span>
                                            <div class="flex gap-1 text-[10px]">
                                                {#if stats.wins > 0}
                                                    <span class="text-green-600 dark:text-green-400">
                                                        {stats.wins}w
                                                    </span>
                                                {/if}
                                                {#if stats.losses > 0}
                                                    <span class="text-red-600 dark:text-red-400">
                                                        {stats.losses}l
                                                    </span>
                                                {/if}
                                            </div>
                                        </div>
                                    </div>

                                    <!-- P&L -->
                                    <div class="mt-auto">
                                        <span class="text-xs font-medium {getTextClass(stats.pnl)}">
                                            {formatPnL(stats.pnl)}
                                        </span>
                                    </div>
                                </div>
                            {/if}
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    </div>
</div>

<DayTradesModal 
    bind:show={showModal}
    trades={selectedDayTrades}
    date={selectedDate}
/>

<style>
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-lg transition-colors duration-200;
    }
</style>
