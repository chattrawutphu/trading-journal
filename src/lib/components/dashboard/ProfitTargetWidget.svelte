<script>
    import { onMount } from 'svelte';
    export let trades = [];
    export let period = 'daily'; // 'daily', 'weekly', etc.
    export let target = 1000;
    export let height;
    export let textSize;

    let currentPnL = 0;
    let progress = 0;

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
        } else if (period === 'weekly') {
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            filteredTrades = trades.filter(t => {
                const tradeDate = new Date(t.exitDate || t.entryDate);
                return tradeDate >= startOfWeek;
            });
        } else if (period === 'monthly') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            filteredTrades = trades.filter(t => {
                const tradeDate = new Date(t.exitDate || t.entryDate);
                return tradeDate >= startOfMonth;
            });
        } else if (period === 'quarterly') {
            const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth()/3)*3, 1);
            filteredTrades = trades.filter(t => {
                const tradeDate = new Date(t.exitDate || t.entryDate);
                return tradeDate >= quarterStart;
            });
        } else if (period === 'yearly') {
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            filteredTrades = trades.filter(t => {
                const tradeDate = new Date(t.exitDate || t.entryDate);
                return tradeDate >= startOfYear;
            });
        }

        currentPnL = filteredTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
        progress = Math.min(currentPnL / target, 1);
    }
</script>

<div class="p-4" style="height: {height || 140}px;">
    <!-- Simple progress bar -->
    <div class="mb-2 {textSize} text-light-text dark:text-dark-text">
        Profit Target ({period}): {target} THB
    </div>
    <div class="w-full bg-light-border dark:bg-dark-border rounded-full h-4">
        <div 
            class="bg-theme-500 h-4 rounded-full" 
            style="width: {progress * 100}%"
        />
    </div>
    <div class="mt-2 text-sm text-light-text dark:text-dark-text">
        Current PnL: {currentPnL} THB
    </div>
</div>