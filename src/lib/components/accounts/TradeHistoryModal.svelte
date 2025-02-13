<script>
    import { createEventDispatcher } from 'svelte';
    import Modal from '../common/Modal.svelte';
    import Button from '../common/Button.svelte';
    import { format } from 'date-fns';

    const dispatch = createEventDispatcher();

    export let show = false;
    export let tradeHistory = null;
    export let loading = false;
    export let accountType = 'BINANCE_FUTURES';
    export let excludeZeroPnL = true;

    // Exchange theme configuration
    const exchangeThemes = {
        'BINANCE_FUTURES': {
            name: 'Binance Futures',
            description: 'Trade crypto futures with up to 125x leverage',
            color: '#F3BA2F',
            icon: `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0L7.272 4.728L12 9.456L16.728 4.728L12 0Z"/>
                    <path d="M2.544 9.456L7.272 14.184L12 9.456L7.272 4.728L2.544 9.456Z"/>
                    <path d="M12 9.456L16.728 14.184L21.456 9.456L16.728 4.728L12 9.456Z"/>
                    <path d="M12 18.912L16.728 14.184L12 9.456L7.272 14.184L12 18.912Z"/>
                   </svg>`
        }
    };

    $: theme = exchangeThemes[accountType];

    $: console.log('TradeHistoryModal show:', show);
    $: console.log('TradeHistoryModal tradeHistory:', tradeHistory);

    function handleClose() {
        console.log('TradeHistoryModal handleClose called');
        show = false;
        dispatch('close');
    }

    async function handleImport() {
        console.log('TradeHistoryModal handleImport called');
        loading = true;
        try {
            await dispatch('import', {
                ...tradeHistory,
                excludeZeroPnL
            });
        } catch (error) {
            console.error('Error in handleImport:', error);
        }
    }

    // Format date helper
    function formatDate(dateString) {
        return format(new Date(dateString), 'MMM d, yyyy HH:mm');
    }
</script>

<Modal bind:show on:close={handleClose} showDefaultHeader={false}>
    <div class="w-full max-w-3xl mx-auto bg-gradient-to-br from-light-card/95 to-light-card dark:from-dark-card/95 dark:to-dark-card backdrop-blur-xl rounded-2xl overflow-hidden border border-light-border/10 dark:border-dark-border/10 shadow-2xl">
        <!-- Header with Exchange Theme -->
        <div class="px-6 py-6 border-b border-light-border/10 dark:border-dark-border/10"
             style="background: linear-gradient(to bottom right, {theme.color}0D, {theme.color}1A);">
            <div class="flex justify-between items-center">
                <div class="flex items-center gap-4">
                    <div class="p-3 rounded-xl" style="background-color: {theme.color}">
                        <div class="text-white">
                            {@html theme.icon}
                        </div>
                    </div>
                    <div>
                        <h2 class="text-2xl font-bold text-light-text dark:text-dark-text">
                            Import {theme.name} Trades
                        </h2>
                        <p class="text-sm text-light-text-muted dark:text-dark-text-muted mt-1">
                            {theme.description}
                        </p>
                    </div>
                </div>
                <button 
                    class="p-2 hover:bg-light-hover/80 dark:hover:bg-dark-hover/80 rounded-full transition-all duration-200"
                    on:click={handleClose}
                >
                    <svg class="w-5 h-5 text-light-text-muted dark:text-dark-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>

        <!-- Content -->
        <div class="p-6">
            {#if tradeHistory}
                <div class="space-y-6">
                    <!-- Summary Stats -->
                    <div class="grid grid-cols-3 gap-4">
                        <div class="p-4 rounded-xl bg-light-hover/30 dark:bg-dark-hover/30 border border-light-border/10 dark:border-dark-border/10">
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Total Trades</div>
                            <div class="text-2xl font-bold text-light-text dark:text-dark-text mt-1">
                                {tradeHistory.totalTrades}
                            </div>
                        </div>
                        <div class="p-4 rounded-xl bg-light-hover/30 dark:bg-dark-hover/30 border border-light-border/10 dark:border-dark-border/10">
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Trading Pairs</div>
                            <div class="text-2xl font-bold text-light-text dark:text-dark-text mt-1">
                                {tradeHistory.symbols.length}
                            </div>
                        </div>
                        <div class="p-4 rounded-xl bg-light-hover/30 dark:bg-dark-hover/30 border border-light-border/10 dark:border-dark-border/10">
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Date Range</div>
                            <div class="text-sm font-medium text-light-text dark:text-dark-text mt-1">
                                {formatDate(tradeHistory.startDate)} - {formatDate(tradeHistory.endDate)}
                            </div>
                        </div>
                    </div>

                    <!-- Trading Pairs -->
                    <div class="p-4 rounded-xl" 
                         style="background: linear-gradient(to bottom right, {theme.color}0D, {theme.color}1A); 
                                border: 1px solid {theme.color}33;">
                        <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-3">Trading Pairs</h3>
                        <div class="flex flex-wrap gap-2">
                            {#each tradeHistory.symbols as symbol}
                                <span class="px-3 py-1 rounded-full text-sm"
                                      style="background-color: {theme.color}20; 
                                             color: {theme.color}; 
                                             border: 1px solid {theme.color}40">
                                    {symbol}
                                </span>
                            {/each}
                        </div>
                    </div>

                    <!-- Exclude Zero PnL -->
                    <div class="p-4 rounded-xl bg-light-hover/30 dark:bg-dark-hover/30 border border-light-border/10 dark:border-dark-border/10">
                        <label class="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                bind:checked={excludeZeroPnL}
                                class="mt-1 rounded border-light-border dark:border-dark-border text-theme-500 focus:ring-theme-500"
                            />
                            <div class="text-sm">
                                <div class="font-medium text-light-text dark:text-dark-text">Exclude Zero PnL Trades</div>
                                <div class="text-light-text-muted dark:text-dark-text-muted mt-0.5">
                                    Skip importing trades with 0% profit/loss. This can help clean up your trade history.
                                </div>
                            </div>
                        </label>
                    </div>

                    <!-- Import Notice -->
                    <div class="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <div class="flex items-start gap-3">
                            <svg class="w-5 h-5 text-blue-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                            </svg>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">
                                <p class="font-medium text-light-text dark:text-dark-text mb-1">Trade History Limit</p>
                                <p>
                                    Binance Futures API allows importing trades up to 90 days back. 
                                    If you need to import older trades, please use the manual import feature.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            {/if}
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 bg-gradient-to-t from-light-card/90 to-light-card/0 dark:from-dark-card/90 dark:to-dark-card/0 border-t border-light-border/10 dark:border-dark-border/10">
            <div class="flex justify-end gap-3">
                <Button 
                    variant="secondary"
                    size="sm"
                    disabled={loading}
                    on:click={handleClose}
                >
                    Cancel
                </Button>
                <Button 
                    variant="primary"
                    size="sm"
                    {loading}
                    on:click={handleImport}
                    style="background: linear-gradient(to right, {theme.color}, {theme.color}DD)"
                >
                    {#if loading}
                        <div class="flex items-center gap-2">
                            <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Importing...
                        </div>
                    {:else}
                        Import {tradeHistory?.totalTrades || 0} Trades
                    {/if}
                </Button>
            </div>
        </div>
    </div>
</Modal> 