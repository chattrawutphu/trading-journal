<script>
    import Modal from '../common/Modal.svelte';
    import Button from '../common/Button.svelte';
    import { calculateHeight, disabledConfigWidgets } from '$lib/utils/widgetUtils';
    
    export let show = false;
    export let selectedWidget;
    export let onClose;
    export let onSave;
    
    let config;

    // เช็คว่า widget นี้ต้อง disable อะไรบ้าง
    $: widgetType = selectedWidget?.id?.split('_')[0];
    $: disabledConfig = disabledConfigWidgets[widgetType] || { cols: false, rows: false };

    $: if (show || selectedWidget) {
        if (widgetType === 'TradingStats') {
            config = {
                ...selectedWidget?.config,
                cols: 'auto',
                rows: 'auto'
            };
        } else {
            config = {
                ...selectedWidget?.config,
                cols: selectedWidget?.config?.cols || 1,
                rows: selectedWidget?.config?.rows || 1,
                textSize: selectedWidget?.config?.textSize || 'medium'
            };
        }
    }

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
</script>

<Modal 
    bind:show
    title="Configure Widget"
>
    <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
            <div>
                <label class="block mb-1 text-xs text-light-text dark:text-dark-text">Columns</label>
                <select 
                    value={config?.cols}
                    on:change={(e) => handleSizeChange(e, 'cols')}
                    disabled={disabledConfig.cols}
                    class="w-full border border-light-border dark:border-dark-border bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text rounded p-1.5 text-xs focus:ring-2 focus:ring-theme-500 focus:border-transparent
                           {disabledConfig.cols ? 'opacity-50 cursor-not-allowed' : ''}"
                >
                    <option value="auto">Auto</option>
                    {#each Array(12) as _, i}
                        <option value={i + 1}>{i + 1}</option>
                    {/each}
                </select>
            </div>
            <div>
                <label class="block mb-1 text-xs text-light-text dark:text-dark-text">Rows</label>
                <select 
                    value={config?.rows}
                    on:change={(e) => handleSizeChange(e, 'rows')}
                    disabled={disabledConfig.rows}
                    class="w-full border border-light-border dark:border-dark-border bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text rounded p-1.5 text-xs focus:ring-2 focus:ring-theme-500 focus:border-transparent
                           {disabledConfig.rows ? 'opacity-50 cursor-not-allowed' : ''}"
                >
                    <option value="auto">Auto</option>
                    {#each Array(12) as _, i}
                        <option value={i + 1}>{i + 1}</option>
                    {/each}
                </select>
            </div>
            <div>
                <label class="block mb-1 text-xs text-light-text dark:text-dark-text">Text Size</label>
                <select 
                    bind:value={config.textSize} 
                    class="w-full border border-light-border dark:border-dark-border bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text rounded p-1.5 text-xs focus:ring-2 focus:ring-theme-500 focus:border-transparent"
                >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                    <option value="extra-large">Extra Large</option>
                </select>
            </div>
            
            {#if selectedWidget?.id.startsWith('ProfitTargetWidget')}
                <div>
                    <label class="block mb-1 text-xs text-light-text dark:text-dark-text">Goal Type</label>
                    <select 
                        bind:value={config.period} 
                        class="w-full border border-light-border dark:border-dark-border bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text rounded p-1.5 text-xs focus:ring-2 focus:ring-theme-500 focus:border-transparent"
                    >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                    </select>
                </div>
                <div>
                    <label class="block mb-1 text-xs text-light-text dark:text-dark-text">Goal Amount</label>
                    <input
                        type="number"
                        bind:value={config.target}
                        class="w-full border border-light-border dark:border-dark-border bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text rounded p-1.5 text-xs focus:ring-2 focus:ring-theme-500 focus:border-transparent"
                    />
                </div>
            {/if}
        </div>
        
        <div class="flex justify-end space-x-2 mt-3">
            <Button 
                variant="secondary" 
                size="xs"
                on:click={onClose}
            >
                Cancel
            </Button>
            <Button 
                variant="primary" 
                size="xs"
                on:click={() => onSave(config)}
            >
                Save
            </Button>
        </div>
    </div>
</Modal> 