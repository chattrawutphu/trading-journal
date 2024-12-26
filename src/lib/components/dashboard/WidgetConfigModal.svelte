<script>
    import Modal from '../common/Modal.svelte';
    import Button from '../common/Button.svelte';
    import { calculateHeight } from '$lib/utils/widgetUtils';
    
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
    <div class="space-y-6 p-2">
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
        <div class="space-y-6">
            <!-- Size Settings -->
            <div class="space-y-4">
                <h4 class="text-sm font-medium text-light-text dark:text-dark-text">Size Settings</h4>
                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <label class="block text-xs font-medium text-light-text-muted dark:text-dark-text-muted">
                            Width
                        </label>
                        <select 
                            value={config?.cols}
                            on:change={(e) => handleSizeChange(e, 'cols')}
                            disabled={disabledConfig.cols}
                            class="w-full border border-light-border dark:border-dark-border bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text rounded-lg p-2 text-sm focus:ring-2 focus:ring-theme-500 focus:border-transparent transition-colors
                                   {disabledConfig.cols ? 'opacity-50 cursor-not-allowed' : 'hover:border-theme-500'}"
                        >
                            <option value="auto">Auto</option>
                            {#each Array(12) as _, i}
                                <option value={i + 1}>{i + 1}</option>
                            {/each}
                        </select>
                    </div>
                    <div class="space-y-2">
                        <label class="block text-xs font-medium text-light-text-muted dark:text-dark-text-muted">
                            Height
                        </label>
                        <select 
                            value={config?.rows}
                            on:change={(e) => handleSizeChange(e, 'rows')}
                            disabled={disabledConfig.rows}
                            class="w-full border border-light-border dark:border-dark-border bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text rounded-lg p-2 text-sm focus:ring-2 focus:ring-theme-500 focus:border-transparent transition-colors
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

            <!-- Text Settings -->
            <div class="space-y-4">
                <h4 class="text-sm font-medium text-light-text dark:text-dark-text">Text Settings</h4>
                <div class="space-y-2">
                    <label class="block text-xs font-medium text-light-text-muted dark:text-dark-text-muted">
                        Text Size
                    </label>
                    <select 
                        bind:value={config.textSize} 
                        class="w-full border border-light-border dark:border-dark-border bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text rounded-lg p-2 text-sm focus:ring-2 focus:ring-theme-500 focus:border-transparent transition-colors hover:border-theme-500"
                    >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                        <option value="extra-large">Extra Large</option>
                    </select>
                </div>
            </div>

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
                                class="w-full border border-light-border dark:border-dark-border bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text rounded-lg p-2 text-sm focus:ring-2 focus:ring-theme-500 focus:border-transparent transition-colors hover:border-theme-500"
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
                                class="w-full border border-light-border dark:border-dark-border bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text rounded-lg p-2 text-sm focus:ring-2 focus:ring-theme-500 focus:border-transparent transition-colors hover:border-theme-500"
                            />
                        </div>
                    </div>
                </div>
            {/if}
        </div>
        
        <!-- Action Buttons -->
        <div class="flex justify-end gap-3 pt-4 border-t border-light-border dark:border-dark-border">
            <Button 
                variant="secondary" 
                size="sm"
                on:click={handleClose}
            >
                Cancel
            </Button>
            <Button 
                variant="primary" 
                size="sm"
                on:click={() => onSave(config)}
            >
                Save Changes
            </Button>
        </div>
    </div>
</Modal>

<style>
    /* Optional: Add smooth transitions */
    :global(.modal-content) {
        transition: all 0.2s ease-in-out;
    }

    select, input {
        transition: all 0.2s ease-in-out;
    }

    select:hover, input:hover {
        transform: translateY(-1px);
    }
</style> 