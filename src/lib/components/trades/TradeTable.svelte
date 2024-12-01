<!-- src/lib/components/trades/TradeTable.svelte -->
<script>
    import { createEventDispatcher } from 'svelte';
    import { formatDate, formatMoney } from '$lib/utils/formatters';
    
    const dispatch = createEventDispatcher();
  
    export let trades = [];
    export let type = 'closed'; // 'open' or 'closed'
  
    function handleAction(action, tradeId) {
      dispatch('action', { action, tradeId });
    }

    // Action button configurations
    const actionButtons = {
        view: {
            icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>`,
            class: 'text-theme-500 hover:text-theme-400'
        },
        edit: {
            icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>`,
            class: 'text-theme-500 hover:text-theme-400'
        },
        duplicate: {
            icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                </svg>`,
            class: 'text-theme-500 hover:text-theme-400'
        },
        delete: {
            icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>`,
            class: 'text-red-500 hover:text-red-400'
        }
    };
</script>
  
<div class="card overflow-hidden">
    <div class="overflow-x-auto">
        <table class="w-full">
            <thead>
                <tr class="border-b border-light-border dark:border-dark-border">
                    <th class="p-4 text-left text-sm font-medium text-light-text-muted dark:text-dark-text-muted">
                        {type === 'open' ? 'Entry Date' : 'Exit Date'}
                    </th>
                    <th class="p-4 text-left text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Symbol</th>
                    <th class="p-4 text-left text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Side</th>
                    <th class="p-4 text-left text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Entry Price</th>
                    {#if type === 'closed'}
                        <th class="p-4 text-left text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Exit Price</th>
                    {/if}
                    <th class="p-4 text-left text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Quantity</th>
                    <th class="p-4 text-left text-sm font-medium text-light-text-muted dark:text-dark-text-muted">P/L</th>
                    <th class="p-4 text-left text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Actions</th>
                </tr>
            </thead>
            <tbody>
                {#each trades as trade (trade._id)}
                    <tr class="border-b border-light-border dark:border-dark-border hover:bg-light-hover dark:hover:bg-dark-hover transition-colors duration-200 {trade.disabled ? 'opacity-50' : ''}">
                        <td class="p-4 text-light-text dark:text-dark-text">
                            {formatDate(type === 'open' ? trade.entryDate : trade.exitDate)}
                        </td>
                        <td class="p-4 text-light-text dark:text-dark-text font-medium">{trade.symbol}</td>
                        <td class="p-4">
                            <span class="px-2 py-1 text-xs font-medium rounded-full {trade.side === 'BUY' ? 'bg-green-500 bg-opacity-10 text-green-500' : 'bg-red-500 bg-opacity-10 text-red-500'}">
                                {trade.side}
                            </span>
                        </td>
                        <td class="p-4 text-light-text dark:text-dark-text">{formatMoney(trade.entryPrice)}</td>
                        {#if type === 'closed'}
                            <td class="p-4 text-light-text dark:text-dark-text">{formatMoney(trade.exitPrice)}</td>
                        {/if}
                        <td class="p-4 text-light-text dark:text-dark-text">{trade.quantity}</td>
                        <td class="p-4 font-medium {trade.pnl > 0 ? 'text-green-500' : trade.pnl < 0 ? 'text-red-500' : 'text-light-text dark:text-dark-text'}">
                            {formatMoney(trade.pnl)}
                        </td>
                        <td class="p-4">
                            <div class="flex items-center space-x-2">
                                <button 
                                    class="text-light-text-muted dark:text-dark-text-muted hover:text-yellow-400 transition-colors duration-200"
                                    on:click={() => handleAction('favorite', trade._id)}
                                >
                                    <svg class="w-4 h-4" fill="{trade.favorite ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                    </svg>
                                </button>
                                {#each ['view', 'edit', 'duplicate', 'delete'] as action}
                                    <button 
                                        class="{actionButtons[action].class} transition-colors duration-200"
                                        on:click={() => handleAction(action, trade._id)}
                                    >
                                        {@html actionButtons[action].icon}
                                    </button>
                                {/each}
                            </div>
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>

<style>
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-lg transition-colors duration-200;
    }
</style>
