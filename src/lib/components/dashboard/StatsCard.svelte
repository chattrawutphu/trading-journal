<!-- src/lib/components/dashboard/StatsCard.svelte -->
<script>
    export let title;
    export let pnl = 0;
    export let trades = 0;
    export let winRate = 0;
    export let balanceChange = 0;
  
    $: pnlClass = pnl > 0 ? 'text-green-500' : pnl < 0 ? 'text-red-500' : '';
    $: balanceChangeClass = balanceChange > 0 ? 'text-green-500' : balanceChange < 0 ? 'text-red-500' : '';
    
    function formatPercentage(value) {
        const sign = value > 0 ? '+' : '';
        return `${sign}${value.toFixed(2)}%`;
    }
</script>
  
<div class="card p-6 hover:scale-102 ">
    <h3 class="text-sm text-light-text-muted dark:text-dark-text-muted mb-3">{title}</h3>
    <div class="flex justify-between items-baseline mb-4">
        <div class="flex flex-col">
            <span class="text-2xl font-bold {pnlClass}">${pnl.toFixed(2)}</span>
            {#if balanceChange !== 0}
                <span class="text-sm {balanceChangeClass}">
                    {formatPercentage(balanceChange)}
                </span>
            {/if}
        </div>
        <div class="flex items-center space-x-2">
            <span class="text-sm text-light-text-muted dark:text-dark-text-muted">{trades} trades</span>
            <div class="h-4 w-[1px] bg-light-border dark:bg-dark-border"></div>
            <div class="flex items-center space-x-1">
                <div class="w-2 h-2 rounded-full" class:bg-green-500={winRate >= 50} class:bg-red-500={winRate < 50}></div>
                <span class="text-sm text-light-text-muted dark:text-dark-text-muted">{winRate.toFixed(1)}%</span>
            </div>
        </div>
    </div>
    <div class="space-y-2">
        <div class="flex justify-between text-xs text-light-text dark:text-dark-text">
            <span>Win Rate</span>
            <span class="font-medium">{winRate.toFixed(1)}%</span>
        </div>
        <div class="relative h-2 bg-light-hover dark:bg-dark-hover rounded-full overflow-hidden">
            <div 
                class="absolute top-0 left-0 h-full rounded-full "
                class:bg-gradient-purple={winRate >= 50}
                class:bg-red-500={winRate < 50}
                style="width: {winRate}%"
            ></div>
        </div>
    </div>
</div>

<style lang="postcss">
    .card {
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
        backdrop-filter: blur(10px);
        border: 1px solid;
        border-color: rgba(255, 255, 255, 0.1);
    }

    :global(.light) .card {
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.95) 100%);
        border-color: rgba(0, 0, 0, 0.1);
    }
</style>
