<script>
    import Modal from '../common/Modal.svelte';
    import Button from '../common/Button.svelte';
    import { calculateHeight } from '$lib/utils/widgetUtils';
    import { tradingStatsConfig, PERIOD_OPTIONS } from '$lib/utils/widgetUtils';
    
    export let show = false;
    export let selectedWidget;
    export let onClose;
    export let onSave;
    
    let config;
    let originalConfig;

    function initializeConfig(widget) {
        if (!widget) return null;
        
        const widgetType = widget.id?.split('_')[0];
        if (widgetType === 'TradingStats') {
            return {
                ...widget?.config,
                cols: 'auto',
                rows: 'auto',
                disabled: { cols: true, rows: true }
            };
        } else if (widgetType === 'ProfitTargetWidget') {
            return {
                ...widget?.config,
                cols: widget?.config?.cols || 4,
                rows: 'auto',
                textSize: widget?.config?.textSize || 'medium',
                period: widget?.config?.period || 'daily',
                target: widget?.config?.target || 1000,
                disabled: { cols: false, rows: true }
            };
        } else {
            return {
                ...widget?.config,
                cols: widget?.config?.cols || 1,
                rows: widget?.config?.rows || 1,
                textSize: widget?.config?.textSize || 'medium',
                disabled: { cols: false, rows: false }
            };
        }
    }

    $: if (show && selectedWidget && !originalConfig) {
        config = initializeConfig(selectedWidget);
        originalConfig = { ...config };
    }

    $: if (!show) {
        originalConfig = null;
    }

    $: widgetType = selectedWidget?.id?.split('_')[0];
    $: disabledConfig = config?.disabled || { cols: false, rows: false };

    function handleSizeChange(event, field) {
        const value = event.target.value;
        if (value === 'auto') {
            config = {
                ...config,
                [field]: 'auto'
            };
        } else {
            const numValue = parseInt(value);
            config = {
                ...config,
                [field]: numValue
            };
        }
    }

    function handleClose() {
        config = { ...originalConfig };
        originalConfig = null;
        onClose();
    }
</script>

<Modal 
    bind:show
    title="Configure Widget"
    on:close={handleClose}
>
    <div class="space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto p-4">
        <!-- Widget Type Header -->
        <div class="flex items-center gap-3 p-3 bg-light-hover/30 dark:bg-dark-hover/30 rounded-lg">
            <div class="p-2 bg-theme-500/10 rounded-lg">
                <svg class="w-5 h-5 text-theme-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                </svg>
            </div>
            <div>
                <h3 class="font-medium text-light-text dark:text-dark-text">{widgetType}</h3>
                <p class="text-xs text-light-text-muted dark:text-dark-text-muted">Configure widget display settings</p>
            </div>
        </div>

        <!-- Settings Sections -->
        <div class="space-y-4">
            <!-- Size Settings -->
            {#if !disabledConfig.cols && !disabledConfig.rows}
                <div class="space-y-2">
                    <h4 class="text-sm font-medium text-light-text dark:text-dark-text">Size Settings</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-1">
                            <label class="block text-xs font-medium text-light-text-muted dark:text-dark-text-muted">
                                Width
                            </label>
                            <select 
                                value={config?.cols}
                                on:change={(e) => handleSizeChange(e, 'cols')}
                                disabled={disabledConfig.cols}
                                class="w-full px-2.5 py-1.5 text-sm rounded-lg border border-light-border dark:border-0 bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text focus:ring-2 focus:ring-theme-500 focus:border-transparent transition-colors
                                       {disabledConfig.cols ? 'opacity-50 cursor-not-allowed' : 'hover:border-theme-500'}"
                            >
                                <option value="auto">Auto</option>
                                {#each Array(12) as _, i}
                                    <option value={i + 1}>{i + 1}</option>
                                {/each}
                            </select>
                        </div>
                        <div class="space-y-1">
                            <label class="block text-xs font-medium text-light-text-muted dark:text-dark-text-muted">
                                Height
                            </label>
                            <select 
                                value={config?.rows}
                                on:change={(e) => handleSizeChange(e, 'rows')}
                                disabled={disabledConfig.rows}
                                class="w-full px-2.5 py-1.5 text-sm rounded-lg border border-light-border dark:border-0 bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text focus:ring-2 focus:ring-theme-500 focus:border-transparent transition-colors
                                       {disabledConfig.rows ? 'opacity-50 cursor-not-allowed' : 'hover:border-theme-500'}"
                            >
                                <option value="auto">Auto</option>
                                {#each Array(12) as _, i}
                                    <option value={i + 1}>{i + 1}</option>
                                {/each}
                            </select>
                        </div>
                    </div>
                </div>
            {/if}

            <!-- Text Settings -->
            <div class="space-y-2">
                <h4 class="text-sm font-medium text-light-text dark:text-dark-text">Text Settings</h4>
                <div class="space-y-1">
                    <label class="block text-xs font-medium text-light-text-muted dark:text-dark-text-muted">
                        Text Size
                    </label>
                    <select 
                        bind:value={config.textSize} 
                        class="w-full px-2.5 py-1.5 text-sm rounded-lg border border-light-border dark:border-0 bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text focus:ring-2 focus:ring-theme-500 focus:border-transparent transition-colors hover:border-theme-500"
                    >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                        <option value="extra-large">Extra Large</option>
                    </select>
                </div>
            </div>

            <!-- Trading Stats Specific Settings -->
            {#if selectedWidget?.id.startsWith('TradingStats')}
                <div class="space-y-2">
                    <h4 class="text-sm font-medium text-light-text dark:text-dark-text">Period Settings</h4>
                    <div class="space-y-3 bg-light-hover/20 dark:bg-dark-hover/20 p-3 rounded-lg">
                        <!-- Selected Periods -->
                        <div class="flex items-center justify-between">
                            <span class="text-xs text-light-text-muted dark:text-dark-text-muted">
                                Selected Periods ({$tradingStatsConfig.selectedPeriods.length}/{$tradingStatsConfig.maxPeriods})
                            </span>
                        </div>
                        <div class="space-y-2">
                            {#each $tradingStatsConfig.selectedPeriods as periodId, index (periodId)}
                                <div class="flex items-center justify-between p-2 rounded-lg bg-light-hover/30 dark:bg-dark-hover/30 hover:bg-light-hover/50 dark:hover:bg-dark-hover/50 transition-colors">
                                    <div class="flex items-center gap-2">
                                        <div class="w-6 h-6 rounded-full bg-theme-500/10 flex items-center justify-center">
                                            <svg class="w-3 h-3 text-theme-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={PERIOD_OPTIONS[periodId].icon}/>
                                            </svg>
                                        </div>
                                        <span class="text-sm text-light-text dark:text-dark-text">
                                            {PERIOD_OPTIONS[periodId].label}
                                        </span>
                                    </div>
                                    <div class="flex items-center gap-1">
                                        <button
                                            class="p-1.5 rounded-lg text-light-text-muted hover:text-theme-500 hover:bg-light-card dark:hover:bg-dark-card disabled:opacity-30 transition-colors"
                                            on:click={() => tradingStatsConfig.reorderPeriods([
                                                ...$tradingStatsConfig.selectedPeriods.slice(0, index - 1),
                                                $tradingStatsConfig.selectedPeriods[index],
                                                $tradingStatsConfig.selectedPeriods[index - 1],
                                                ...$tradingStatsConfig.selectedPeriods.slice(index + 1)
                                            ])}
                                            disabled={index === 0}
                                        >
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
                                            </svg>
                                        </button>
                                        <button
                                            class="p-1.5 rounded-lg text-light-text-muted hover:text-theme-500 hover:bg-light-card dark:hover:bg-dark-card disabled:opacity-30 transition-colors"
                                            on:click={() => tradingStatsConfig.reorderPeriods([
                                                ...$tradingStatsConfig.selectedPeriods.slice(0, index),
                                                $tradingStatsConfig.selectedPeriods[index + 1],
                                                $tradingStatsConfig.selectedPeriods[index],
                                                ...$tradingStatsConfig.selectedPeriods.slice(index + 2)
                                            ])}
                                            disabled={index === $tradingStatsConfig.selectedPeriods.length - 1}
                                        >
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                            </svg>
                                        </button>
                                        {#if $tradingStatsConfig.selectedPeriods.length > 1}
                                            <button
                                                class="p-1.5 rounded-lg text-light-text-muted hover:text-red-500 hover:bg-light-card dark:hover:bg-dark-card transition-colors"
                                                on:click={() => tradingStatsConfig.removePeriod(periodId)}
                                            >
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                                </svg>
                                            </button>
                                        {/if}
                                    </div>
                                </div>
                            {/each}
                        </div>

                        <!-- Available Periods -->
                        <div class="space-y-2">
                            <label class="block text-xs font-medium text-light-text-muted dark:text-dark-text-muted">
                                Add Period
                            </label>
                            <div class="grid grid-cols-2 gap-2">
                                {#each Object.entries(PERIOD_OPTIONS) as [periodId, period]}
                                    {#if !$tradingStatsConfig.selectedPeriods.includes(periodId)}
                                        <button
                                            class="flex items-center gap-2 p-2 rounded-lg bg-light-card dark:bg-dark-card hover:bg-light-hover dark:hover:bg-dark-hover disabled:opacity-50 transition-colors"
                                            on:click={() => tradingStatsConfig.addPeriod(periodId)}
                                            disabled={$tradingStatsConfig.selectedPeriods.length >= $tradingStatsConfig.maxPeriods}
                                        >
                                            <div class="w-6 h-6 rounded-full bg-theme-500/10 flex items-center justify-center">
                                                <svg class="w-3 h-3 text-theme-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={period.icon}/>
                                                </svg>
                                            </div>
                                            <span class="text-sm text-light-text dark:text-dark-text">
                                                {period.label}
                                            </span>
                                        </button>
                                    {/if}
                                {/each}
                            </div>
                        </div>
                    </div>
                </div>
            {/if}

            <!-- Widget Specific Settings -->
            {#if selectedWidget?.id.startsWith('ProfitTargetWidget')}
                <div class="space-y-4">
                    <h4 class="text-sm font-medium text-light-text dark:text-dark-text">Goal Settings</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-2">
                            <label class="block text-xs font-medium text-light-text-muted dark:text-dark-text-muted">
                                Goal Type
                            </label>
                            <select 
                                bind:value={config.period} 
                                class="w-full border border-light-border dark:border-0 bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text rounded-lg p-2 text-sm focus:ring-2 focus:ring-theme-500 focus:border-transparent transition-colors hover:border-theme-500"
                            >
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="quarterly">Quarterly</option>
                                <option value="yearly">Yearly</option>
                            </select>
                        </div>
                        <div class="space-y-2">
                            <label class="block text-xs font-medium text-light-text-muted dark:text-dark-text-muted">
                                Goal Amount
                            </label>
                            <input
                                type="number"
                                bind:value={config.target}
                                class="w-full border border-light-border dark:border-0 bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text rounded-lg p-2 text-sm focus:ring-2 focus:ring-theme-500 focus:border-transparent transition-colors hover:border-theme-500"
                            />
                        </div>
                    </div>
                </div>
            {/if}

            {#if selectedWidget?.id.startsWith('TopTradesWidget')}
                <div class="space-y-4">
                    <h4 class="text-sm font-medium text-light-text dark:text-dark-text">Top Trades Settings</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-2">
                            <label class="block text-xs font-medium text-light-text-muted dark:text-dark-text-muted">
                                Metric
                            </label>
                            <select 
                                bind:value={config.metric}
                                class="w-full border border-light-border dark:border-0 bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text rounded-lg p-2 text-sm"
                            >
                                <option value="pnl">Highest P&L</option>
                                <option value="pnlPercentage">Highest P&L %</option>
                                <option value="amount">Largest Position Size</option>
                                <option value="riskRewardRatio">Best Risk/Reward</option>
                                <option value="duration">Longest Duration</option>
                                <option value="quickest">Quickest Trades</option>
                            </select>
                        </div>
                        <div class="space-y-2">
                            <label class="block text-xs font-medium text-light-text-muted dark:text-dark-text-muted">
                                Period
                            </label>
                            <select 
                                bind:value={config.period}
                                class="w-full border border-light-border dark:border-0 bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text rounded-lg p-2 text-sm"
                            >
                                <option value="all">All Time</option>
                                <option value="today">Today</option>
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                                <option value="year">This Year</option>
                            </select>
                        </div>
                        <div class="space-y-2">
                            <label class="block text-xs font-medium text-light-text-muted dark:text-dark-text-muted">
                                Number of Trades
                            </label>
                            <input
                                type="number"
                                bind:value={config.limit}
                                min="1"
                                max="10"
                                class="w-full border border-light-border dark:border-0 bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text rounded-lg p-2 text-sm"
                            />
                        </div>
                        <div class="space-y-2">
                            <label class="block text-xs font-medium text-light-text-muted dark:text-dark-text-muted">
                                Show Chart
                            </label>
                            <select 
                                bind:value={config.showChart}
                                class="w-full border border-light-border dark:border-0 bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text rounded-lg p-2 text-sm"
                            >
                                <option value={true}>Yes</option>
                                <option value={false}>No</option>
                            </select>
                        </div>
                    </div>
                </div>
            {/if}
        </div>
    </div>

    <!-- Footer -->
    <div class="px-4 py-3 border-t border-light-border dark:border-0 flex justify-end gap-3 sticky bottom-0 bg-light-card dark:bg-dark-card rounded-b-xl bg-opacity-90 dark:bg-opacity-90">
        <Button variant="secondary" size="sm" on:click={handleClose}>
            Cancel
        </Button>
        <Button variant="primary" size="sm" on:click={() => onSave(config)}>
            Save Changes
        </Button>
    </div>
</Modal>

<style lang="postcss">
    /* Add smooth scrolling */
    .overflow-y-auto {
        scrollbar-width: thin;
        scrollbar-color: var(--theme-500) transparent;
    }

    .overflow-y-auto::-webkit-scrollbar {
        width: 6px;
    }

    .overflow-y-auto::-webkit-scrollbar-track {
        background: transparent;
    }

    .overflow-y-auto::-webkit-scrollbar-thumb {
        background-color: var(--theme-500);
        border-radius: 3px;
    }

    /* Consistent form controls */
    select, input {
        @apply h-9;
    }

    /* Smooth transitions */
    .transition-all {
        transition: all 0.2s ease-in-out;
    }
</style> 