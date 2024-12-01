<script>
    import { formatCurrency } from '$lib/utils/formatters';
    
    export let show = false;
    export let trades = [];
    export let date = '';
    
    function close() {
        show = false;
    }

    $: totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    $: winCount = trades.filter(t => t.pnl > 0).length;
    $: lossCount = trades.filter(t => t.pnl < 0).length;
    $: winRate = trades.length > 0 ? Math.round((winCount / trades.length) * 100) : 0;
</script>

{#if show}
<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" on:click={close}>
    <div class="bg-light-card dark:bg-dark-card rounded-lg shadow-xl max-w-xl w-full" on:click|stopPropagation>
        <!-- Header -->
        <div class="p-3 border-b border-light-border dark:border-dark-border">
            <div class="flex justify-between items-center">
                <div>
                    <h2 class="text-lg font-semibold">{date}</h2>
                    <div class="flex gap-3 mt-1 text-sm">
                        <span class="text-light-text-muted dark:text-dark-text-muted">
                            {trades.length} trades
                        </span>
                        <span class="text-green-600 dark:text-green-400">
                            {winCount}W ({winRate}%)
                        </span>
                        <span class="text-red-600 dark:text-red-400">
                            {lossCount}L
                        </span>
                        <span class={totalPnL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                            {formatCurrency(totalPnL)}
                        </span>
                    </div>
                </div>
                <button class="text-light-text-muted dark:text-dark-text-muted hover:text-theme-500" on:click={close}>
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>

        <!-- Trade List -->
        <div class="overflow-y-auto max-h-[60vh] divide-y divide-light-border dark:divide-dark-border">
            {#each trades as trade}
                <div class="p-3 hover:bg-light-hover dark:hover:bg-dark-hover transition-colors">
                    <div class="flex justify-between items-start gap-4">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="font-medium truncate">{trade.symbol}</span>
                                <span class="px-1.5 py-0.5 text-xs rounded-full 
                                    {trade.side === 'LONG' ? 
                                        'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 
                                        'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'}">
                                    {trade.side}
                                </span>
                            </div>
                            <div class="grid grid-cols-2 gap-x-4 text-xs text-light-text-muted dark:text-dark-text-muted">
                                <div class="flex justify-between">
                                    <span>Entry</span>
                                    <span>{formatCurrency(trade.entryPrice)}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Exit</span>
                                    <span>{formatCurrency(trade.exitPrice)}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Amount</span>
                                    <span>{formatCurrency(trade.amount)}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Qty</span>
                                    <span>{trade.quantity}</span>
                                </div>
                            </div>
                            {#if trade.notes}
                                <p class="mt-1 text-xs text-light-text-muted dark:text-dark-text-muted truncate">
                                    {trade.notes}
                                </p>
                            {/if}
                        </div>
                        <div class="text-right">
                            <span class={`text-sm font-medium ${trade.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {formatCurrency(trade.pnl)}
                            </span>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    </div>
</div>
{/if}
