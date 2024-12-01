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
</script>

{#if show}
<div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" on:click={close}>
    <div class="bg-light-card dark:bg-dark-card rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden" on:click|stopPropagation>
        <!-- Header -->
        <div class="p-4 border-b border-light-border dark:border-dark-border">
            <div class="flex justify-between items-center">
                <h2 class="text-xl font-semibold">Trades for {date}</h2>
                <button class="text-light-text-muted dark:text-dark-text-muted hover:text-theme-500" on:click={close}>
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div class="mt-2 flex gap-4 text-sm">
                <span class="text-light-text-muted dark:text-dark-text-muted">
                    Total Trades: {trades.length}
                </span>
                <span class="text-green-600 dark:text-green-400">
                    Wins: {winCount}
                </span>
                <span class="text-red-600 dark:text-red-400">
                    Losses: {lossCount}
                </span>
                <span class={totalPnL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                    Net P&L: {formatCurrency(totalPnL)}
                </span>
            </div>
        </div>

        <!-- Trade List -->
        <div class="overflow-y-auto max-h-[calc(80vh-8rem)]">
            <div class="divide-y divide-light-border dark:divide-dark-border">
                {#each trades as trade}
                    <div class="p-4 hover:bg-light-hover dark:hover:bg-dark-hover transition-colors">
                        <div class="flex justify-between items-start mb-2">
                            <div class="flex items-center gap-2">
                                <span class="font-medium">{trade.symbol}</span>
                                <span class="px-2 py-0.5 text-xs rounded-full 
                                    {trade.side === 'LONG' ? 
                                        'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 
                                        'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'}">
                                    {trade.side}
                                </span>
                            </div>
                            <span class={`font-medium ${trade.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {formatCurrency(trade.pnl)}
                            </span>
                        </div>
                        <div class="grid grid-cols-2 gap-4 text-sm text-light-text-muted dark:text-dark-text-muted">
                            <div>
                                <span class="block">Entry: {formatCurrency(trade.entryPrice)}</span>
                                <span class="block">Exit: {formatCurrency(trade.exitPrice)}</span>
                            </div>
                            <div>
                                <span class="block">Amount: {formatCurrency(trade.amount)}</span>
                                <span class="block">Quantity: {trade.quantity}</span>
                            </div>
                        </div>
                        {#if trade.notes}
                            <p class="mt-2 text-sm">{trade.notes}</p>
                        {/if}
                    </div>
                {/each}
            </div>
        </div>
    </div>
</div>
{/if}
