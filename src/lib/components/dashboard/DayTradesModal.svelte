<script>
    import { createEventDispatcher } from 'svelte';
    import Button from '../common/Button.svelte';
    import TradeTable from '../trades/TradeTable.svelte';
    
    const dispatch = createEventDispatcher();
    
    export let show = false;
    export let trades = [];
    export let date = '';

    function close() {
        show = false;
    }

    function handleNewTrade() {
        // Convert date string to ISO format for the trade form
        const selectedDate = new Date(date).toISOString().slice(0, 16);
        dispatch('newTrade', selectedDate);
        close();
    }

    $: openTrades = trades.filter(trade => trade.status === 'OPEN');
    $: closedTrades = trades.filter(trade => trade.status === 'CLOSED');
</script>

{#if show}
<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" on:click={close}>
    <div class="bg-light-card dark:bg-dark-card rounded-lg shadow-xl max-w-4xl w-full" on:click|stopPropagation>
        <!-- Header -->
        <div class="p-4 border-b border-light-border dark:border-dark-border">
            <div class="flex justify-between items-center">
                <h2 class="text-2xl font-bold bg-gradient-purple bg-clip-text text-transparent">
                    {new Date(date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </h2>
                <div class="flex items-center gap-4">
                    <Button variant="primary" on:click={handleNewTrade}>
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                        </svg>
                        New Trade
                    </Button>
                    <button class="text-light-text-muted dark:text-dark-text-muted hover:text-theme-500" on:click={close}>
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>

        <!-- Content -->
        <div class="p-4 space-y-6">
            {#if openTrades.length > 0}
                <div>
                    <h3 class="text-lg font-semibold mb-3 text-light-text dark:text-dark-text">Open Trades</h3>
                    <TradeTable 
                        trades={openTrades} 
                        type="open"
                        on:view
                        on:edit
                        on:delete
                        on:favorite
                        on:disable
                    />
                </div>
            {/if}

            {#if closedTrades.length > 0}
                <div>
                    <h3 class="text-lg font-semibold mb-3 text-light-text dark:text-dark-text">Closed Trades</h3>
                    <TradeTable 
                        trades={closedTrades} 
                        type="closed"
                        on:view
                        on:edit
                        on:delete
                        on:favorite
                        on:disable
                    />
                </div>
            {/if}

            {#if trades.length === 0}
                <div class="text-center py-8 text-light-text-muted dark:text-dark-text-muted">
                    No trades found for this day
                </div>
            {/if}
        </div>
    </div>
</div>
{/if}
