<script>
    import { onMount } from 'svelte';
    export let trades = [];
    export let period = 'daily'; // 'daily', 'weekly', etc.
    export let target = 1000;
    export let height;
    export let textSize;

    let currentPnL = 0;
    let progress = 0;
    let daysLeft = 0;

    onMount(() => {
        calculatePnL();
    });

    $: if (trades || period || target) {
        calculatePnL();
    }

    function calculatePnL() {
        // Filter trades by the chosen period
        const now = new Date();
        let filteredTrades = trades;

        if (period === 'daily') {
            filteredTrades = trades.filter(t => {
                const tradeDate = new Date(t.exitDate || t.entryDate);
                return tradeDate.toDateString() === now.toDateString();
            });
            daysLeft = 1;
        } else if (period === 'weekly') {
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            filteredTrades = trades.filter(t => {
                const tradeDate = new Date(t.exitDate || t.entryDate);
                return tradeDate >= startOfWeek;
            });
            daysLeft = 7 - now.getDay();
        } else if (period === 'monthly') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            filteredTrades = trades.filter(t => {
                const tradeDate = new Date(t.exitDate || t.entryDate);
                return tradeDate >= startOfMonth;
            });
            daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
        } else if (period === 'quarterly') {
            const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth()/3)*3, 1);
            filteredTrades = trades.filter(t => {
                const tradeDate = new Date(t.exitDate || t.entryDate);
                return tradeDate >= quarterStart;
            });
            const nextQuarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth()/3)*3 + 3, 1);
            daysLeft = Math.ceil((nextQuarterStart - now) / (1000 * 60 * 60 * 24));
        } else if (period === 'yearly') {
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            filteredTrades = trades.filter(t => {
                const tradeDate = new Date(t.exitDate || t.entryDate);
                return tradeDate >= startOfYear;
            });
            const nextYearStart = new Date(now.getFullYear() + 1, 0, 1);
            daysLeft = Math.ceil((nextYearStart - now) / (1000 * 60 * 60 * 24));
        }

        currentPnL = filteredTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
        progress = Math.min(currentPnL / target, 1);
    }
</script>

<div class="" style="height: {height || 140}px;">
    <div class="flex justify-between items-center mb-2 text-sm text-light-text dark:text-dark-text">
        <span>Your Goal ({period}):</span>
        <span class="text-xs">{daysLeft} {daysLeft === 1 ? 'day' : 'days'} left</span>
    </div>
    <div class="w-full bg-light-card dark:bg-dark-border rounded-full h-5 relative">
        <div 
            class="bg-theme-300 dark:bg-theme-500 h-5 rounded-full transition-all duration-300" 
            style="width: {progress * 100}%"
        />
        <div class="absolute inset-0 flex justify-between items-center px-2 text-xs text-light-text dark:text-dark-text">
            <span class="font-bold">${currentPnL}</span>
            <span class="absolute inset-0 flex justify-center items-center font-bold">{Math.round(progress * 100)}%</span>
            <span class="font-bold">${target}</span>
        </div>
    </div>
</div>