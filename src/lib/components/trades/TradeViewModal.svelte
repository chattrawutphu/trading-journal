<script>
    import { formatCurrency } from '$lib/utils/formatters';
    
    export let show = false;
    export let trade = null;
    
    function close() {
        show = false;
    }

    function formatDate(dateStr) {
        return new Date(dateStr).toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function getSideClass(side) {
        return side === 'LONG' ? 'text-green-500' : 'text-red-500';
    }

    function isImageUrl(url) {
        if (!url) return false;
        return url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null;
    }

    function handleImageError(event) {
        event.target.style.display = 'none';
    }
</script>

{#if show && trade}
<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" on:click={close}>
    <div class="bg-light-card dark:bg-dark-card rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] flex flex-col" on:click|stopPropagation>
        <!-- Header -->
        <div class="p-4 border-b border-light-border dark:border-dark-border sticky top-0 bg-light-card dark:bg-dark-card rounded-t-lg z-10">
            <div class="flex justify-between items-center">
                <div class="flex items-center gap-3">
                    <h2 class="text-xl font-semibold text-light-text-muted dark:text-dark-text">{trade.symbol}</h2>
                    <span class={`px-2 py-1 rounded text-sm font-medium ${getSideClass(trade.side)}`}>
                        {trade.side}
                    </span>
                    {#if trade.favorite}
                        <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                    {/if}
                </div>
                <button class="text-light-text-muted dark:text-dark-text-muted hover:text-theme-500" on:click={close}>
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>

        <!-- Scrollable Content -->
        <div class="flex-1 overflow-y-auto">
            <div class="p-6 space-y-6">
                <!-- Trade Details -->
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">Entry Date</h3>
                        <p class="text-light-text-muted dark:text-dark-text">{formatDate(trade.entryDate)}</p>
                    </div>
                    {#if trade.exitDate}
                        <div>
                            <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">Exit Date</h3>
                            <p class="text-light-text-muted dark:text-dark-text">{formatDate(trade.exitDate)}</p>
                        </div>
                    {/if}
                    <div>
                        <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">Entry Price</h3>
                        <p class="text-light-text-muted dark:text-dark-text">{formatCurrency(trade.entryPrice)}</p>
                    </div>
                    {#if trade.exitPrice}
                        <div>
                            <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">Exit Price</h3>
                            <p class="text-light-text-muted dark:text-dark-text">{formatCurrency(trade.exitPrice)}</p>
                        </div>
                    {/if}
                    <div>
                        <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">Amount</h3>
                        <p class="text-light-text-muted dark:text-dark-text">{formatCurrency(trade.amount)}</p>
                    </div>
                    <div>
                        <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">Quantity</h3>
                        <p class="text-light-text-muted dark:text-dark-text">{trade.quantity}</p>
                    </div>
                    {#if trade.pnl !== undefined}
                        <div>
                            <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">P&L</h3>
                            <p class={trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                                {formatCurrency(trade.pnl)}
                            </p>
                        </div>
                    {/if}
                </div>

                <!-- Trade Settings -->
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">Strategy</h3>
                        <p class="text-light-text-muted dark:text-dark-text">{trade.strategy || '-'}</p>
                    </div>
                    <div>
                        <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">Status</h3>
                        <p class="text-light-text-muted dark:text-dark-text">{trade.status}</p>
                    </div>
                    <div>
                        <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">Confidence Level</h3>
                        <p class="text-light-text-muted dark:text-dark-text">{trade.confidenceLevel}/10</p>
                    </div>
                    <div>
                        <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">Greed Level</h3>
                        <p class="text-light-text-muted dark:text-dark-text">{trade.greedLevel}/10</p>
                    </div>
                </div>

                <!-- Trade Analysis -->
                <div class="space-y-4">
                    {#if trade.entryReason}
                        <div>
                            <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">Entry Reason</h3>
                            <p class="text-light-text-muted dark:text-dark-text">{trade.entryReason}</p>
                        </div>
                    {/if}
                    {#if trade.exitReason}
                        <div>
                            <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">Exit Reason</h3>
                            <p class="text-light-text-muted dark:text-dark-text">{trade.exitReason}</p>
                        </div>
                    {/if}
                    {#if trade.emotions}
                        <div>
                            <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">Emotions</h3>
                            <p class="text-light-text-muted dark:text-dark-text">{trade.emotions}</p>
                        </div>
                    {/if}
                    {#if trade.notes}
                        <div>
                            <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">Notes</h3>
                            <p class="text-light-text-muted dark:text-dark-text">{trade.notes}</p>
                        </div>
                    {/if}
                    {#if trade.url}
                        <div>
                            <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">URL</h3>
                            <a 
                                href={trade.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                class="text-theme-500 hover:text-theme-600 dark:hover:text-theme-400 transition-colors duration-200"
                            >
                                {trade.url}
                            </a>
                            {#if isImageUrl(trade.url)}
                                <div class="mt-2">
                                    <img 
                                        src={trade.url} 
                                        alt="Trade URL" 
                                        class="rounded-lg max-h-96 mx-auto"
                                        on:error={handleImageError}
                                    />
                                </div>
                            {/if}
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </div>
</div>
{/if}
