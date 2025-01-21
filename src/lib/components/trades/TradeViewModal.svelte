<script>
    import { fade, fly } from 'svelte/transition';
    import { formatCurrency } from '$lib/utils/formatters';
    
    export let show = false;
    export let trade = null;
    
    function close() {
        show = false;
    }

    function formatDate(dateStr) {
    const options = { 
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
      // timeZoneName: 'short' // Remove timezone display
    };
    return new Date(dateStr).toLocaleString(undefined, options); // Use user's locale
  }

    function getSideClass(side) {
        return side === 'LONG' ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10';
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
<div 
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 md:p-4"
    transition:fade={{ duration: 150 }}
>
    <div class="card w-full max-w-4xl mx-auto relative transform ease-out">
        <!-- Header -->
        <div class="px-4 md:px-6 py-3 border-b border-light-border dark:border-0 flex justify-between items-center sticky top-0 bg-light-card dark:bg-dark-card rounded-t-xl bg-opacity-90 dark:bg-opacity-90 z-10">
            <div class="flex items-center gap-2">
                <h2 class="text-xl font-bold text-light-text dark:text-dark-text">{trade.symbol}</h2>
                <span class={`px-2 py-0.5 rounded-lg text-sm font-medium ${getSideClass(trade.side)}`}>
                    {trade.side}
                </span>
                {#if trade.favorite}
                    <svg class="w-4 h-4 text-theme-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                {/if}
            </div>
            <button 
                class="p-1.5 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover"
                on:click={close}
            >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        <!-- Content -->
        <div class="p-4 md:p-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
            <div class="grid md:grid-cols-2 gap-4 md:gap-6">
                <!-- Trade Details -->
                <div class="bg-light-hover/5 dark:bg-dark-hover/5 rounded-xl p-4">
                    <h3 class="text-base font-semibold text-light-text dark:text-dark-text mb-3">Trade Details</h3>
                    <div class="grid grid-cols-2 gap-x-4 gap-y-3">
                        <div>
                            <h4 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">Entry Date</h4>
                            <p class="text-sm text-light-text dark:text-dark-text">{formatDate(trade.entryDate)}</p>
                        </div>
                        {#if trade.exitDate}
                            <div>
                                <h4 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">Exit Date</h4>
                                <p class="text-sm text-light-text dark:text-dark-text">{formatDate(trade.exitDate)}</p>
                            </div>
                        {/if}
                        <div>
                            <h4 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">Entry Price</h4>
                            <p class="text-sm text-light-text dark:text-dark-text">{formatCurrency(trade.entryPrice)}</p>
                        </div>
                        {#if trade.exitPrice}
                            <div>
                                <h4 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">Exit Price</h4>
                                <p class="text-sm text-light-text dark:text-dark-text">{formatCurrency(trade.exitPrice)}</p>
                            </div>
                        {/if}
                        <div>
                            <h4 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">Amount</h4>
                            <p class="text-sm text-light-text dark:text-dark-text">{formatCurrency(trade.amount)}</p>
                        </div>
                        <div>
                            <h4 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">Quantity</h4>
                            <p class="text-sm text-light-text dark:text-dark-text">{trade.quantity}</p>
                        </div>
                        {#if trade.pnl !== undefined}
                            <div>
                                <h4 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">P&L</h4>
                                <p class={`font-medium ${trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {formatCurrency(trade.pnl)}
                                </p>
                            </div>
                        {/if}
                    </div>
                </div>

                <!-- Trade Settings -->
                <div class="bg-light-hover/5 dark:bg-dark-hover/5 rounded-xl p-4">
                    <h3 class="text-base font-semibold text-light-text dark:text-dark-text mb-3">Settings</h3>
                    <div class="grid grid-cols-2 gap-x-4 gap-y-3">
                        <div>
                            <h4 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">Strategy</h4>
                            <p class="text-sm text-light-text dark:text-dark-text">{trade.strategy || '-'}</p>
                        </div>
                        <div>
                            <h4 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">Status</h4>
                            <p class={`font-medium ${trade.status === 'OPEN' ? 'text-green-500' : 'text-blue-500'}`}>
                                {trade.status}
                            </p>
                        </div>
                        <div>
                            <h4 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">Confidence Level</h4>
                            <p class="text-sm text-light-text dark:text-dark-text">{trade.confidenceLevel}/10</p>
                        </div>
                        <div>
                            <h4 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">Greed Level</h4>
                            <p class="text-sm text-light-text dark:text-dark-text">{trade.greedLevel}/10</p>
                        </div>
                    </div>
                </div>

                <!-- Trade Analysis -->
                <div class="bg-light-hover/5 dark:bg-dark-hover/5 rounded-xl p-4 md:col-span-2">
                    <h3 class="text-base font-semibold text-light-text dark:text-dark-text mb-3">Analysis</h3>
                    <div class="grid md:grid-cols-2 gap-4">
                        <!-- Entry/Exit Reasons -->
                        <div class="space-y-3">
                            {#if trade.entryReason}
                                <div>
                                    <h4 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">Entry Reason</h4>
                                    <p class="text-sm text-light-text dark:text-dark-text">{trade.entryReason}</p>
                                </div>
                            {/if}
                            {#if trade.exitReason}
                                <div>
                                    <h4 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">Exit Reason</h4>
                                    <p class="text-sm text-light-text dark:text-dark-text">{trade.exitReason}</p>
                                </div>
                            {/if}
                        </div>

                        <!-- Emotions and Notes -->
                        <div class="space-y-3">
                            {#if trade.emotions}
                                <div>
                                    <h4 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">Emotions</h4>
                                    <p class="text-sm text-light-text dark:text-dark-text">{trade.emotions}</p>
                                </div>
                            {/if}
                            {#if trade.notes}
                                <div>
                                    <h4 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">Notes</h4>
                                    <p class="text-sm text-light-text dark:text-dark-text">{trade.notes}</p>
                                </div>
                            {/if}
                        </div>
                    </div>

                    <!-- URL and Image -->
                    {#if trade.url}
                        <div class="mt-4">
                            <h4 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">URL</h4>
                            <a 
                                href={trade.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                class="text-sm text-theme-500 hover:text-theme-600 hover:underline"
                            >
                                {trade.url}
                            </a>
                            {#if isImageUrl(trade.url)}
                                <div class="mt-2">
                                    <img 
                                        src={trade.url} 
                                        alt="Trade URL" 
                                        class="rounded-lg max-h-64 w-full object-cover"
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

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-0 rounded-xl shadow-xl;
    }

    /* Add smooth transitions */
    .card {
        @apply transition-all duration-200;
    }

    /* Improve scrollbar styling */
    .overflow-y-auto {
        scrollbar-width: thin;
        scrollbar-color: theme('colors.theme.500') transparent;
    }

    .overflow-y-auto::-webkit-scrollbar {
        width: 6px;
    }

    .overflow-y-auto::-webkit-scrollbar-track {
        @apply bg-transparent;
    }

    .overflow-y-auto::-webkit-scrollbar-thumb {
        @apply bg-theme-500/50 rounded-full;
    }
</style>
