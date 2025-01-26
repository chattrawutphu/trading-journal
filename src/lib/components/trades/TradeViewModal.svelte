<script>
    import { fade } from 'svelte/transition';
    import { formatCurrency, formatPercentage } from '$lib/utils/formatters';
    
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
        };
        return new Date(dateStr).toLocaleString(undefined, options);
    }

    function getDuration(entryDate, exitDate) {
        if (!entryDate || !exitDate) return '';
        const duration = new Date(exitDate) - new Date(entryDate);
        const days = Math.floor(duration / (1000 * 60 * 60 * 24));
        const hours = Math.floor((duration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
        
        let result = [];
        if (days > 0) result.push(`${days}d`);
        if (hours > 0) result.push(`${hours}h`);
        if (minutes > 0) result.push(`${minutes}m`);
        return result.join(' ');
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

    function getTagColor(tag) {
        const colors = [
            { bg: 'bg-blue-500/10', text: 'text-blue-500' },
            { bg: 'bg-green-500/10', text: 'text-green-500' },
            { bg: 'bg-purple-500/10', text: 'text-purple-500' },
            { bg: 'bg-orange-500/10', text: 'text-orange-500' },
            { bg: 'bg-pink-500/10', text: 'text-pink-500' },
            { bg: 'bg-teal-500/10', text: 'text-teal-500' },
            { bg: 'bg-indigo-500/10', text: 'text-indigo-500' },
        ];
        
        const hash = tag.split('').reduce((acc, char) => {
            return char.charCodeAt(0) + ((acc << 5) - acc);
        }, 0);
        
        return colors[Math.abs(hash) % colors.length];
    }
</script>

{#if show && trade}
<div 
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    transition:fade={{ duration: 150 }}
    on:click|self={close}
>
    <div class="w-full max-w-3xl bg-light-card dark:bg-dark-card rounded-xl shadow-xl overflow-hidden">
        <!-- Header -->
        <div class="relative px-6 py-4 border-b border-light-border dark:border-dark-border">
            <div class="flex items-center gap-3">
                <!-- Symbol & Side -->
                <div class="flex-1 flex items-center gap-3">
                    <div class="flex flex-col">
                        <div class="flex items-center gap-2">
                            <h2 class="text-xl font-bold text-light-text dark:text-dark-text">
                                {trade.symbol}
                            </h2>
                            <span class="px-2 py-0.5 rounded-full text-sm font-bold relative
                                       {trade.side === 'LONG' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}">
                                {trade.side}
                                {#if trade.status === 'OPEN'}
                                    <div class="absolute inset-0 rounded-full animate-ping 
                                               {trade.side === 'LONG' ? 'bg-green-500/10' : 'bg-red-500/10'}">
                                    </div>
                                {/if}
                            </span>
                            {#if trade.favorite}
                                <svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                </svg>
                            {/if}
                        </div>
                        <div class="flex items-center gap-2 text-sm text-light-text-muted dark:text-dark-text-muted">
                            <span>{formatDate(trade.entryDate)}</span>
                            {#if trade.exitDate}
                                <span>•</span>
                                <span>{getDuration(trade.entryDate, trade.exitDate)}</span>
                            {/if}
                        </div>
                    </div>
                </div>

                <!-- P&L Display -->
                {#if trade.pnl !== undefined}
                    <div class="text-right">
                        <div class="text-2xl font-bold {trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}">
                            {formatCurrency(trade.pnl)}
                        </div>
                        <div class="text-sm {trade.pnl >= 0 ? 'text-green-500/70' : 'text-red-500/70'}">
                            {formatPercentage((trade.pnl / trade.amount) * 100)}
                        </div>
                    </div>
                {/if}

                <!-- Close Button -->
                <button 
                    class="ml-4 p-2 rounded-lg text-light-text-muted hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover"
                    on:click={close}
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        </div>

        <!-- Content -->
        <div class="p-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
            <div class="grid gap-4">
                <!-- Trade Info Section -->
                <div class="bg-light-hover/30 dark:bg-dark-hover/30 rounded-xl p-4">
                    <h3 class="text-sm font-semibold text-light-text-muted dark:text-dark-text-muted mb-3">Trade Information</h3>
                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3">
                        <div>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Amount</div>
                            <div class="text-sm font-bold text-light-text dark:text-dark-text">
                                {formatCurrency(trade.amount || 0)}
                            </div>
                        </div>
                        <div>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Quantity</div>
                            <div class="text-sm font-bold text-light-text dark:text-dark-text">
                                {trade.quantity || 0}
                            </div>
                        </div>
                        <div>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Leverage</div>
                            <div class="text-sm font-bold text-light-text dark:text-dark-text">
                                {trade.leverage ? `${trade.leverage}x` : '-'}
                            </div>
                        </div>
                        <div>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Strategy</div>
                            <div class="text-sm font-bold text-light-text dark:text-dark-text">
                                {trade.strategy || '-'}
                            </div>
                        </div>
                    </div>

                    <!-- Psychology Metrics -->
                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3 mt-3">
                        <div>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Confidence Level</div>
                            <div class="flex items-center gap-2">
                                <div class="flex-1 h-1.5 bg-light-hover dark:bg-dark-hover rounded-full overflow-hidden">
                                    <div class="h-full bg-theme-500" style="width: {(trade.confidenceLevel || 0) * 10}%"></div>
                                </div>
                                <span class="text-sm font-medium text-theme-500">{trade.confidenceLevel || 0}/10</span>
                            </div>
                        </div>
                        <div>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Greed Level</div>
                            <div class="flex items-center gap-2">
                                <div class="flex-1 h-1.5 bg-light-hover dark:bg-dark-hover rounded-full overflow-hidden">
                                    <div class="h-full bg-theme-500" style="width: {(trade.greedLevel || 0) * 10}%"></div>
                                </div>
                                <span class="text-sm font-medium text-theme-500">{trade.greedLevel || 0}/10</span>
                            </div>
                        </div>
                        <div class="lg:col-span-2">
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Emotions</div>
                            <div class="text-sm text-light-text dark:text-dark-text">
                                {trade.emotions || '-'}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Price Section -->
                <div class="bg-light-hover/30 dark:bg-dark-hover/30 rounded-xl p-4">
                    <h3 class="text-sm font-semibold text-light-text-muted dark:text-dark-text-muted mb-3">Price Details</h3>
                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3">
                        <div>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Entry Price</div>
                            <div class="text-sm font-bold text-light-text dark:text-dark-text">
                                {formatCurrency(trade.entryPrice || 0)}
                            </div>
                        </div>
                        <div>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Exit Price</div>
                            <div class="text-sm font-bold text-light-text dark:text-dark-text">
                                {trade.exitPrice ? formatCurrency(trade.exitPrice) : '-'}
                            </div>
                        </div>
                        <div>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Stop Loss</div>
                            <div class="text-sm font-bold text-red-500">
                                {trade.stopLoss ? formatCurrency(trade.stopLoss) : '-'}
                            </div>
                        </div>
                        <div>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Take Profit</div>
                            <div class="text-sm font-bold text-green-500">
                                {trade.takeProfit ? formatCurrency(trade.takeProfit) : '-'}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Analysis Section -->
                <div class="grid lg:grid-cols-2 gap-4">
                    <!-- Left Column -->
                    <div class="bg-light-hover/30 dark:bg-dark-hover/30 rounded-xl p-4">
                        <h3 class="text-sm font-semibold text-light-text-muted dark:text-dark-text-muted mb-3">Trade Analysis</h3>
                        <div class="space-y-3">
                            <div>
                                <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Entry Reason</div>
                                <div class="text-sm text-light-text dark:text-dark-text mt-1">
                                    {trade.entryReason || '-'}
                                </div>
                            </div>
                            <div>
                                <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Exit Reason</div>
                                <div class="text-sm text-light-text dark:text-dark-text mt-1">
                                    {trade.exitReason || '-'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Right Column -->
                    <div class="bg-light-hover/30 dark:bg-dark-hover/30 rounded-xl p-4">
                        <h3 class="text-sm font-semibold text-light-text-muted dark:text-dark-text-muted mb-3">Notes</h3>
                        <div class="space-y-3">
                            <div>
                                <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Notes</div>
                                <div class="text-sm text-light-text dark:text-dark-text mt-1 whitespace-pre-line">
                                    {trade.notes || '-'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- URL and Screenshot -->
                {#if trade.url}
                    <div class="bg-light-hover/30 dark:bg-dark-hover/30 rounded-xl p-4">
                        <h3 class="text-sm font-semibold text-light-text-muted dark:text-dark-text-muted mb-3">Reference</h3>
                        <div class="space-y-3">
                            <a href={trade.url} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               class="text-sm text-theme-500 hover:underline break-all">
                                {trade.url}
                            </a>
                            {#if isImageUrl(trade.url)}
                                <div class="mt-2 rounded-lg overflow-hidden">
                                    <img src={trade.url} 
                                         alt="Trade Reference" 
                                         class="w-full max-h-96 object-contain"
                                         on:error={handleImageError} />
                                </div>
                            {/if}
                        </div>
                    </div>
                {/if}

                <!-- Tags -->
                <div class="bg-light-hover/30 dark:bg-dark-hover/30 rounded-xl p-4">
                    <h3 class="text-sm font-semibold text-light-text-muted dark:text-dark-text-muted mb-3">Tags</h3>
                    {#if trade.tags && trade.tags.length > 0}
                        <div class="flex flex-wrap gap-2">
                            {#each trade.tags as tag}
                                {@const tagColor = getTagColor(tag)}
                                <span class="px-2 py-0.5 rounded-full text-xs {tagColor.bg} {tagColor.text}">
                                    {tag}
                                </span>
                            {/each}
                        </div>
                    {:else}
                        <p class="text-sm text-light-text-muted dark:text-dark-text-muted">No tags</p>
                    {/if}
                </div>
            </div>
        </div>
    </div>
</div>
{/if}

<style>
    /* Smooth scrolling */
    .overflow-y-auto {
        scrollbar-width: thin;
        scrollbar-color: var(--theme-500) transparent;
    }

    .overflow-y-auto::-webkit-scrollbar {
        width: 4px;
    }

    .overflow-y-auto::-webkit-scrollbar-track {
        background: transparent;
    }

    .overflow-y-auto::-webkit-scrollbar-thumb {
        background-color: var(--theme-500);
        border-radius: 2px;
    }

    /* Animations */
    @keyframes ping {
        75%, 100% {
            transform: scale(2);
            opacity: 0;
        }
    }

    .animate-ping {
        animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
    }
</style>
