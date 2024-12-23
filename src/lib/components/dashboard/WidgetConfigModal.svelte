<script>
    import Modal from '../common/Modal.svelte';
    import Button from '../common/Button.svelte';
    
    export let show = false;
    export let selectedWidget;
    export let onClose;
    export let onSave;
    
    let config = selectedWidget?.config || {};
</script>

<Modal 
    bind:show
    title="Configure Widget"
>
    <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
            <div>
                <label class="block mb-1 text-xs text-light-text dark:text-dark-text">Columns</label>
                <input 
                    type="number" 
                    min="1" 
                    max="12" 
                    bind:value={config.cols} 
                    class="w-full border border-light-border dark:border-dark-border bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text rounded p-1.5 text-xs focus:ring-2 focus:ring-theme-500 focus:border-transparent"
                />
            </div>
            <div>
                <label class="block mb-1 text-xs text-light-text dark:text-dark-text">Rows</label>
                <input 
                    type="number" 
                    min="1" 
                    max="12" 
                    bind:value={config.rows} 
                    class="w-full border border-light-border dark:border-dark-border bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text rounded p-1.5 text-xs focus:ring-2 focus:ring-theme-500 focus:border-transparent"
                />
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