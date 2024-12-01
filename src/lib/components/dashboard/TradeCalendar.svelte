<script>
    import { theme } from '$lib/stores/themeStore';
    import Select from '$lib/components/common/Select.svelte';
    
    export let trades = [];

    let selectedMonth = new Date().getMonth();
    let selectedYear = new Date().getFullYear();

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
            return stats.pnl > 0 ? 'bg-green-50' : 'bg-red-50';
        }
        return '';
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
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(pnl);
    }
</script>

<div class="card p-6 space-y-4">
    <div class="flex justify-between items-center">
        <h2 class="text-xl font-semibold">Trading Calendar</h2>
        <div class="flex gap-4">
            <Select 
                options={months.map((month, i) => ({ value: i, label: month }))}
                bind:value={selectedMonth}
                className="w-40"
            />
            <Select 
                options={years.map(year => ({ value: year, label: year.toString() }))}
                bind:value={selectedYear}
                className="w-32"
            />
        </div>
    </div>

    <!-- Calendar Grid -->
    <div class="grid grid-cols-7 gap-2">
        <!-- Day headers -->
        {#each ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as day}
            <div class="text-center py-2 text-sm font-medium text-light-text-muted dark:text-dark-text-muted">
                {day}
            </div>
        {/each}

        <!-- Calendar days -->
        {#each calendarDays as day}
            {@const stats = getDayStats(day)}
            <div class="aspect-square">
                {#if day !== null}
                    <div class="h-full p-2 border border-light-border dark:border-dark-border rounded-lg {getCardClass(stats)} hover:shadow-lg transition-all duration-200 cursor-pointer">
                        <div class="flex flex-col h-full">
                            <!-- Date -->
                            <div class="flex justify-between items-center mb-1">
                                <span class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">
                                    {day}
                                </span>
                                {#if stats?.trades.length > 0}
                                    <span class="text-xs px-1.5 py-0.5 rounded-full bg-light-card dark:bg-dark-card">
                                        {stats.trades.length}
                                    </span>
                                {/if}
                            </div>
                            
                            {#if stats?.trades.length > 0}
                                <!-- Win/Loss -->
                                <div class="flex gap-1 text-xs mb-1">
                                    {#if stats.wins > 0}
                                        <span class="text-green-600 dark:text-green-400">W{stats.wins}</span>
                                    {/if}
                                    {#if stats.losses > 0}
                                        <span class="text-red-600 dark:text-red-400">L{stats.losses}</span>
                                    {/if}
                                </div>
                                
                                <!-- Symbols -->
                                <div class="flex flex-wrap gap-1 mb-1">
                                    {#each [...stats.symbols].slice(0, 2) as symbol}
                                        <span class="text-[10px] px-1 bg-light-card dark:bg-dark-card rounded">
                                            {symbol}
                                        </span>
                                    {/each}
                                    {#if stats.symbols.size > 2}
                                        <span class="text-[10px] px-1">+{stats.symbols.size - 2}</span>
                                    {/if}
                                </div>

                                <!-- P&L -->
                                <span class="mt-auto text-sm font-medium {getTextClass(stats.pnl)}">
                                    {formatPnL(stats.pnl)}
                                </span>
                            {/if}
                        </div>
                    </div>
                {/if}
            </div>
        {/each}
    </div>
</div>

<style>
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-lg transition-colors duration-200;
    }
</style>
