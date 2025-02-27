<script>
    import { onMount } from "svelte";
    
    export let trades = [];
    export let viewMode = 'month'; // 'month' or 'year'
    export let daysPerRow = 12; // รับค่า daysPerRow จาก props
    
    // Calendar logic
    let selectedMonth = new Date().getMonth();
    let selectedYear = new Date().getFullYear();
    let calendarDays = [];
    let dailyPnL = {};
    let firstDayOfYear = new Date(selectedYear, 0, 1).getDay();

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

    // Add reactive statement to watch viewMode changes
    $: {
        // console.log('View mode changed to:', viewMode);
        
        if (viewMode === 'month') {
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
        } else { // year view
            firstDayOfYear = new Date(selectedYear, 0, 1).getDay();
            const daysInYear = (selectedYear % 4 === 0 && (selectedYear % 100 !== 0 || selectedYear % 400 === 0)) ? 366 : 365;
            calendarDays = Array.from({ length: daysInYear }, (_, i) => i + 1);
        }

        // Calculate daily PnL
        dailyPnL = {};
        if (Array.isArray(trades)) {
            trades.forEach(trade => {
                if (trade.status === "CLOSED" && trade.exitDate) {
                    const exitDate = normalizeDate(new Date(trade.exitDate));
                    if (exitDate.getFullYear() === selectedYear) {
                        const day = exitDate.getDate();
                        dailyPnL[day] = (dailyPnL[day] || 0) + (Number(trade.pnl) || 0);
                    }
                }
            });
        }
    }

    function getDayClass(day) {
        if (!day) return "invisible";
        
        const baseClasses = "w-full h-full rounded-sm transition-colors duration-200";
        
        if (isFutureDate(day)) {
            return `${baseClasses} bg-gray-500/10 dark:bg-gray-700/30`;
        }
        
        const pnl = dailyPnL[day] || 0;
        
        if (pnl > 0) {
            return `${baseClasses} bg-green-600/80 dark:bg-green-600/90`;
        }
        if (pnl < 0) {
            return `${baseClasses} bg-red-600/80 dark:bg-red-600/90`;
        }
        return `${baseClasses} bg-gray-300/50 dark:bg-gray-700/50`;
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

<div class="card p-2.5 h-full">
    {#if viewMode === 'month'}
        <div class="grid grid-cols-7 gap-1">
            {#each ["M", "T", "W", "T", "F", "S", "S"] as day}
                <div class="text-center text-[10px] font-medium text-light-text-muted dark:text-dark-text-muted">
                    {day}
                </div>
            {/each}
            
            {#each calendarDays as day}
                <div class="aspect-square relative">
                    <div class={getDayClass(day)} style="min-height: 24px;">
                        {#if day}
                            <span class="absolute inset-0 flex items-center justify-center text-[9px] font-medium {getDayTextClass(day)}">
                                {day}
                            </span>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    {:else}
        <div class="year-view">
            <div class="grid gap-0.5 p-2" style="grid-template-columns: repeat({Math.min(daysPerRow, 28)}, minmax(0, 1fr));">
                {#each calendarDays as day}
                    <div class="year-day">
                        <div class="year-day-content {getDayClass(day)}"></div>
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</div>

<style lang="postcss">
    .aspect-square {
        aspect-ratio: 1;
    }

    .transition-colors {
        transition: all 0.2s ease-in-out;
    }

    .calendar-cell {
        @apply rounded-sm;
        min-height: 24px;
        min-width: 24px;
    }

    /* New styles for year view */
    .year-view {
        @apply w-full h-full overflow-auto;
    }

    .year-day {
        @apply aspect-square relative;
        min-height: 12px;
        min-width: 12px;
    }

    .year-day-content {
        @apply w-full h-full rounded-sm transition-colors duration-200;
    }

    /* Remove tooltip styles */
</style> 