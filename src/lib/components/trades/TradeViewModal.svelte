<script>
    import { fade } from 'svelte/transition';
    import { formatCurrency, formatPercentage } from '$lib/utils/formatters';
    import { binanceExchange } from '$lib/exchanges';
    
    export let show = false;
    export let trade = null;
    
    // Compute position history, supporting backward compatibility
    $: positionHistory = trade ? (trade.positionHistory || convertCloseHistoryToPositionHistory(trade.closeHistory)) : [];

    // Convert old closeHistory format to new positionHistory format
    function convertCloseHistoryToPositionHistory(closeHistory) {
        if (!closeHistory || !Array.isArray(closeHistory)) return [];
        
        return closeHistory.map(close => ({
            ...close,
            action: 'DECREASE' // Assume all closeHistory entries are decreases
        }));
    }
    
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

    // Add unrealized PnL calculation
    $: if (trade && trade.status === 'OPEN' && trade.currentPrice) {
        trade.unrealizedPnL = binanceExchange.calculateUnrealizedPnL(trade, trade.currentPrice);
    }

    // Add debug log to check positionHistory data
    $: if (trade) {
        console.log('Trade data in modal:', trade);
        const hasPositionHistory = !!trade.positionHistory;
        const hasCloseHistory = !!trade.closeHistory;
        console.log('Has position history:', hasPositionHistory, 'Has close history:', hasCloseHistory);
        console.log('Using position history:', positionHistory);
    }

    // ฟังก์ชันสำหรับตรวจสอบว่า field มีข้อมูลหรือไม่
    function hasContent(value) {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string') return value.trim() !== '';
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object') return Object.keys(value).length > 0;
        return true;
    }
</script>

{#if show && trade}
<div 
    class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
    transition:fade={{ duration: 150 }}
    on:click|self={close}
>
    <div class="w-full max-w-3xl bg-light-card dark:bg-dark-card rounded-xl shadow-xl overflow-hidden">
        <!-- Header -->
        <div class="relative px-6 py-4 bg-theme-500/10 border-b border-light-border dark:border-dark-border">
            <div class="flex items-center gap-3">
                <!-- Symbol, Type & Side -->
                <div class="flex-1 flex items-center gap-3">
                    <!-- Trade Type Icon -->
                    {#if trade.type === 'SYNC'}
                        <span class="text-theme-500" title="Synced trade">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </span>
                    {:else}
                        <span class="text-theme-500" title="Manual trade">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </span>
                    {/if}

                    <div class="flex flex-col">
                        <div class="flex items-center gap-2">
                            <h2 class="text-xl font-bold text-light-text dark:text-dark-text">
                                {trade.symbol}
                            </h2>
                            <!-- Status Badge -->
                            <span class="px-2 py-0.5 rounded-full text-xs font-medium
                                {trade.status === 'OPEN' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-theme-500/10 text-theme-500'}">
                                {trade.status}
                            </span>
                            <!-- Side Badge -->
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
                <div class="text-right flex items-center gap-4 justify-end">
                    {#if trade.status === 'OPEN'}
                        <!-- Current Price -->
                        {#if trade.currentPrice}
                            <div class="flex flex-col items-end">
                                <div class="text-sm text-light-text-muted dark:text-dark-text-muted">
                                    Current Price
                                </div>
                                <div class="text-lg font-bold text-light-text dark:text-dark-text">
                                    {formatCurrency(trade.currentPrice)}
                                </div>
                            </div>
                        {/if}
                        <!-- Unrealized P&L -->
                        <div class="flex flex-col items-end">
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">
                                Unrealized P&L
                            </div>
                            <div class="text-xl font-bold text-yellow-500">
                                {#if trade.unrealizedPnL !== undefined}
                                    {formatCurrency(trade.unrealizedPnL)}
                                    <span class="text-sm text-yellow-500/70">
                                        ({formatPercentage((trade.unrealizedPnL / trade.amount) * 100)})
                                    </span>
                                {:else}
                                    Loading...
                                {/if}
                            </div>
                        </div>
                    {:else}
                        <!-- Closed P&L -->
                        <div class="flex flex-col items-end">
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">
                                Realized P&L
                            </div>
                            <div class="text-xl font-bold {trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}">
                                {formatCurrency(trade.pnl)}
                                <span class="text-sm {trade.pnl >= 0 ? 'text-green-500/70' : 'text-red-500/70'}">
                                    ({formatPercentage((trade.pnl / trade.amount) * 100)})
                                </span>
                            </div>
                        </div>
                    {/if}
                </div>

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
                <div class="bg-light-panel dark:bg-dark-panel rounded-xl p-4">
                    <h3 class="text-sm font-semibold text-theme-500 mb-3">Trade Information</h3>
                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3">
                        {#if trade.orderId}
                        <div class="flex items-center gap-2">
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Order ID</div>
                            <div class="text-sm font-mono text-light-text dark:text-dark-text">
                                {trade.orderId}
                            </div>
                        </div>
                        {/if}
                        
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
                        
                        {#if trade.leverage}
                        <div>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Leverage</div>
                            <div class="text-sm font-bold text-light-text dark:text-dark-text">
                                {trade.leverage}x
                            </div>
                        </div>
                        {/if}
                        
                        {#if trade.strategy}
                        <div>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Strategy</div>
                            <div class="text-sm font-bold text-light-text dark:text-dark-text">
                                {trade.strategy}
                            </div>
                        </div>
                        {/if}
                    </div>

                    <!-- Psychology Metrics -->
                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3 mt-3">
                        {#if trade.confidenceLevel}
                        <div>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Confidence Level</div>
                            <div class="flex items-center gap-2">
                                <div class="flex-1 h-1.5 bg-light-hover dark:bg-dark-hover rounded-full overflow-hidden">
                                    <div class="h-full bg-theme-500" style="width: {(trade.confidenceLevel) * 10}%"></div>
                                </div>
                                <span class="text-sm font-medium text-theme-500">{trade.confidenceLevel}/10</span>
                            </div>
                        </div>
                        {/if}
                        
                        {#if trade.greedLevel}
                        <div>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Greed Level</div>
                            <div class="flex items-center gap-2">
                                <div class="flex-1 h-1.5 bg-light-hover dark:bg-dark-hover rounded-full overflow-hidden">
                                    <div class="h-full bg-theme-500" style="width: {(trade.greedLevel) * 10}%"></div>
                                </div>
                                <span class="text-sm font-medium text-theme-500">{trade.greedLevel}/10</span>
                            </div>
                        </div>
                        {/if}
                        
                        {#if trade.emotions}
                        <div class="lg:col-span-2">
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Emotions</div>
                            <div class="text-sm text-light-text dark:text-dark-text">
                                {trade.emotions}
                            </div>
                        </div>
                        {/if}
                    </div>
                </div>

                <!-- Price Section -->
                <div class="bg-light-panel dark:bg-dark-panel rounded-xl p-4">
                    <h3 class="text-sm font-semibold text-theme-500 mb-3">Price Details</h3>
                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3">
                        <div>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Entry Price</div>
                            <div class="text-sm font-bold text-light-text dark:text-dark-text">
                                {formatCurrency(trade.entryPrice || 0)}
                            </div>
                        </div>
                        
                        {#if trade.exitPrice}
                        <div>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Exit Price</div>
                            <div class="text-sm font-bold text-light-text dark:text-dark-text">
                                {formatCurrency(trade.exitPrice)}
                            </div>
                        </div>
                        {/if}
                        
                        {#if trade.stopLoss}
                        <div>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Stop Loss</div>
                            <div class="text-sm font-bold text-red-500">
                                {formatCurrency(trade.stopLoss)}
                            </div>
                        </div>
                        {/if}
                        
                        {#if trade.takeProfit}
                        <div>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Take Profit</div>
                            <div class="text-sm font-bold text-green-500">
                                {formatCurrency(trade.takeProfit)}
                            </div>
                        </div>
                        {/if}
                    </div>
                </div>

                <!-- Position History Section - Show only if exists -->
                {#if positionHistory && positionHistory.length > 0}
                <div class="bg-light-panel dark:bg-dark-panel rounded-xl p-4">
                    <h3 class="text-sm font-semibold text-theme-500 mb-3">Position History</h3>
                    
                    <!-- Visual Timeline of Position Changes -->
                    <div class="mb-4">
                        <div class="relative h-5 flex items-center">
                            <!-- Progress Track -->
                            <div class="absolute inset-0 bg-light-hover dark:bg-dark-hover rounded-md overflow-hidden">
                                {#each positionHistory as entry, i}
                                    {@const percentage = parseFloat(entry.percentage)}
                                    {@const isIncrease = entry.action === 'INCREASE'}
                                    {@const isProfitable = entry.pnl >= 0}
                                    <div 
                                        class="absolute top-0 bottom-0 {isIncrease ? 'bg-blue-500/90' : (isProfitable ? 'bg-green-500/90' : 'bg-red-500/90')}"
                                        style="left: calc({entry.percentage}% - {percentage}%); width: {percentage}%;"
                                    ></div>
                                {/each}
                            </div>
                            
                            <!-- Time markers -->
                            {#each positionHistory as entry, i}
                                {@const date = new Date(entry.date)}
                                {@const position = entry.percentage}
                                <div 
                                    class="absolute top-full mt-1 transform -translate-x-1/2 text-xs text-light-text-muted dark:text-dark-text-muted"
                                    style="left: {position}%;"
                                >
                                    <div class="w-px h-2 bg-light-text-muted/50 dark:bg-dark-text-muted/50 mx-auto mb-1"></div>
                                    <div>{i+1}</div>
                                </div>
                            {/each}
                        </div>
                    </div>
                    
                    <!-- Position History Cards -->
                    <div class="space-y-2">
                        {#each positionHistory as entry, i}
                            {@const isIncrease = entry.action === 'INCREASE'}
                            {@const isProfitable = entry.pnl >= 0}
                            {@const date = new Date(entry.date)}
                            <div class="p-3 rounded-lg {isIncrease ? 'bg-blue-500/10' : (isProfitable ? 'bg-green-500/10' : 'bg-red-500/10')} border border-light-border dark:border-dark-border">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                        <div class="flex items-center justify-center w-5 h-5 rounded-full bg-theme-500/10 text-theme-500 text-xs font-medium">
                                            {i+1}
                                        </div>
                                        <span class="text-sm font-medium text-light-text dark:text-dark-text">
                                            {date.toLocaleDateString()} {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                        <span class="px-2 py-0.5 text-xs rounded-full {isIncrease ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'}">
                                            {isIncrease ? 'INCREASE' : 'DECREASE'}
                                        </span>
                                    </div>
                                    {#if !isIncrease}
                                        <div class="text-sm font-semibold {isProfitable ? 'text-green-500' : 'text-red-500'}">
                                            {formatCurrency(entry.pnl)}
                                        </div>
                                    {/if}
                                </div>
                                <div class="grid grid-cols-3 mt-2 text-xs">
                                    <div>
                                        <span class="text-light-text-muted dark:text-dark-text-muted">Quantity:</span>
                                        <span class="ml-1 text-light-text dark:text-dark-text">{entry.quantity}</span>
                                    </div>
                                    <div>
                                        <span class="text-light-text-muted dark:text-dark-text-muted">Percentage:</span>
                                        <span class="ml-1 text-light-text dark:text-dark-text">{entry.percentage}%</span>
                                    </div>
                                    <div>
                                        <span class="text-light-text-muted dark:text-dark-text-muted">Price:</span>
                                        <span class="ml-1 text-light-text dark:text-dark-text">{formatCurrency(entry.price)}</span>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                    
                    <!-- Summary Stats -->
                    {#if positionHistory.length > 1}
                        {@const increases = positionHistory.filter(entry => entry.action === 'INCREASE')}
                        {@const decreases = positionHistory.filter(entry => entry.action === 'DECREASE')}
                        {@const totalPnl = decreases.reduce((sum, entry) => sum + entry.pnl, 0)}
                        {@const profitCloses = decreases.filter(entry => entry.pnl > 0)}
                        {@const lossCloses = decreases.filter(entry => entry.pnl < 0)}
                        
                        <div class="mt-4 p-3 bg-theme-500/5 rounded-lg border border-theme-500/10">
                            <div class="flex justify-between items-center">
                                <h4 class="text-sm font-medium text-theme-500">Summary</h4>
                                <div class="text-sm font-semibold {totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}">
                                    {formatCurrency(totalPnl)}
                                </div>
                            </div>
                            <div class="grid grid-cols-4 gap-2 mt-2 text-xs">
                                <div>
                                    <div class="text-light-text-muted dark:text-dark-text-muted">Increases</div>
                                    <div class="text-blue-500">{increases.length}</div>
                                </div>
                                <div>
                                    <div class="text-light-text-muted dark:text-dark-text-muted">Decreases</div>
                                    <div class="text-orange-500">{decreases.length}</div>
                                </div>
                                <div>
                                    <div class="text-light-text-muted dark:text-dark-text-muted">Profitable</div>
                                    <div class="text-green-500">{profitCloses.length}</div>
                                </div>
                                <div>
                                    <div class="text-light-text-muted dark:text-dark-text-muted">Losing</div>
                                    <div class="text-red-500">{lossCloses.length}</div>
                                </div>
                            </div>
                        </div>
                    {/if}
                </div>
                {/if}

                <!-- Analysis Section -->
                <div class="grid lg:grid-cols-2 gap-4">
                    <!-- Left Column - Only show if has entry or exit reason -->
                    {#if trade.entryReason || trade.exitReason}
                    <div class="bg-light-panel dark:bg-dark-panel rounded-xl p-4">
                        <h3 class="text-sm font-semibold text-theme-500 mb-3">Trade Analysis</h3>
                        <div class="space-y-3">
                            {#if trade.entryReason}
                            <div>
                                <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Entry Reason</div>
                                <div class="text-sm text-light-text dark:text-dark-text mt-1">
                                    {trade.entryReason}
                                </div>
                            </div>
                            {/if}
                            
                            {#if trade.exitReason}
                            <div>
                                <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Exit Reason</div>
                                <div class="text-sm text-light-text dark:text-dark-text mt-1">
                                    {trade.exitReason}
                                </div>
                            </div>
                            {/if}
                        </div>
                    </div>
                    {/if}

                    <!-- Right Column - Only show if has notes -->
                    {#if trade.notes}
                    <div class="bg-light-panel dark:bg-dark-panel rounded-xl p-4">
                        <h3 class="text-sm font-semibold text-theme-500 mb-3">Notes</h3>
                        <div class="space-y-3">
                            <div>
                                <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Notes</div>
                                <div class="text-sm text-light-text dark:text-dark-text mt-1 rich-text-content">
                                    {@html trade.notes}
                                </div>
                            </div>
                        </div>
                    </div>
                    {/if}
                </div>

                <!-- URL and Screenshot - Only show if has URL -->
                {#if trade.url}
                <div class="bg-light-panel dark:bg-dark-panel rounded-xl p-4">
                    <h3 class="text-sm font-semibold text-theme-500 mb-3">Reference</h3>
                    <div class="space-y-3">
                        <a 
                            href={trade.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            class="text-sm text-theme-500 hover:underline break-all inline-flex items-center gap-1"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                            </svg>
                            {trade.url}
                        </a>
                        {#if isImageUrl(trade.url)}
                            <div class="mt-2 rounded-lg overflow-hidden border border-light-border dark:border-dark-hover">
                                <a 
                                    href={trade.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    class="block hover:opacity-90 transition-opacity"
                                >
                                    <img 
                                        src={trade.url} 
                                        alt="Trade Reference" 
                                        class="w-full max-h-96 object-contain bg-light-hover dark:bg-dark-hover"
                                        on:error={handleImageError}
                                    />
                                </a>
                            </div>
                        {/if}
                    </div>
                </div>
                {/if}

                <!-- Tags - Only show if has tags -->
                {#if trade.tags && trade.tags.length > 0}
                <div class="bg-light-panel dark:bg-dark-panel rounded-xl p-4">
                    <h3 class="text-sm font-semibold text-theme-500 mb-3">Tags</h3>
                    <div class="flex flex-wrap gap-2">
                        {#each trade.tags as tag}
                            {@const tagColor = getTagColor(tag)}
                            <span class="px-2 py-0.5 rounded-full text-xs {tagColor.bg} {tagColor.text}">
                                {tag}
                            </span>
                        {/each}
                    </div>
                </div>
                {/if}
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

    /* Rich text content styles */
    :global(.rich-text-content p) {
        @apply mb-2;
    }
    
    :global(.rich-text-content ul) {
        @apply list-disc pl-5 mb-2;
    }
    
    :global(.rich-text-content ol) {
        @apply list-decimal pl-5 mb-2;
    }
    
    :global(.rich-text-content a) {
        @apply text-theme-500 hover:underline;
    }
    
    :global(.rich-text-content strong) {
        @apply font-bold;
    }
    
    :global(.rich-text-content em) {
        @apply italic;
    }
    
    :global(.rich-text-content u) {
        @apply underline;
    }
    
    :global(.rich-text-content mark) {
        @apply bg-yellow-200 dark:bg-yellow-500/30;
    }
    
    :global(.rich-text-content .text-left) {
        text-align: left;
    }
    
    :global(.rich-text-content .text-center) {
        text-align: center;
    }
    
    :global(.rich-text-content .text-right) {
        text-align: right;
    }
</style>
