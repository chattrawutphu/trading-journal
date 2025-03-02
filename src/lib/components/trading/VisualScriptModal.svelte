<script>
    import { createEventDispatcher } from 'svelte';
    import { fade } from 'svelte/transition';
    import Button from '$lib/components/common/Button.svelte';
    import Modal from '$lib/components/common/Modal.svelte';
    import VisualScriptEditor from './VisualScriptEditor.svelte';
    import VisualScriptPreview from './VisualScriptPreview.svelte';
    
    const dispatch = createEventDispatcher();
    
    // Props
    export let show = false;
    export let strategy = null;
    export let isEdit = false;
    
    // Local state
    let activeTab = 'editor'; // 'editor' or 'preview'
    let scriptData = {
        name: '',
        symbol: '',
        timeframe: '1h',
        description: '',
        conditions: [],
        actions: []
    };
    let isSubmitting = false;
    let error = '';
    
    // Initialize script data when strategy is provided (edit mode)
    $: if (show && strategy && isEdit) {
        scriptData = {
            name: strategy.name || '',
            symbol: strategy.symbol || '',
            timeframe: strategy.timeframe || '1h',
            description: strategy.description || '',
            conditions: strategy.script?.conditions || [],
            actions: strategy.script?.actions || []
        };
    } else if (show && !isEdit) {
        // Reset form for create mode
        scriptData = {
            name: '',
            symbol: '',
            timeframe: '1h',
            description: '',
            conditions: [],
            actions: []
        };
    }
    
    // Available timeframes
    const timeframes = [
        { value: '1m', label: '1 minute' },
        { value: '5m', label: '5 minutes' },
        { value: '15m', label: '15 minutes' },
        { value: '30m', label: '30 minutes' },
        { value: '1h', label: '1 hour' },
        { value: '4h', label: '4 hours' },
        { value: '1d', label: '1 day' }
    ];
    
    // Available symbols (markets)
    const symbols = [
        'BTCUSDT',
        'ETHUSDT',
        'BNBUSDT',
        'ADAUSDT',
        'SOLUSDT',
        'DOGEUSDT',
        'XRPUSDT',
        'DOTUSDT',
        'AVAXUSDT',
        'MATICUSDT'
    ];
    
    // Handle script changes from the editor
    function handleScriptChange(event) {
        const { conditions, actions } = event.detail;
        scriptData = {
            ...scriptData,
            conditions,
            actions
        };
    }
    
    // Handle form submission
    function handleSubmit() {
        // Validate form
        if (!scriptData.name.trim()) {
            error = 'Strategy name is required';
            return;
        }
        
        if (!scriptData.symbol) {
            error = 'Symbol is required';
            return;
        }
        
        if (!scriptData.timeframe) {
            error = 'Timeframe is required';
            return;
        }
        
        if (scriptData.conditions.length === 0) {
            error = 'At least one condition is required';
            return;
        }
        
        if (scriptData.actions.length === 0) {
            error = 'At least one action is required';
            return;
        }
        
        error = '';
        isSubmitting = true;
        
        // Prepare data for submission
        const strategyData = {
            id: strategy?.id || `strategy_${Date.now()}`,
            name: scriptData.name,
            symbol: scriptData.symbol,
            timeframe: scriptData.timeframe,
            description: scriptData.description,
            status: 'inactive',
            script: {
                conditions: scriptData.conditions,
                actions: scriptData.actions
            },
            created: strategy?.created || new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
        
        // Dispatch event with strategy data
        dispatch('save', strategyData);
        
        // Reset and close
        setTimeout(() => {
            isSubmitting = false;
            show = false;
        }, 500);
    }
    
    // Close modal
    function handleClose() {
        show = false;
        dispatch('close');
    }
</script>

<Modal 
    bind:show 
    width="xl" 
    on:close={handleClose}
    title={isEdit ? 'Edit Strategy' : 'Create New Strategy'}
>
    <div slot="body">
        {#if error}
            <div class="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-400">
                {error}
            </div>
        {/if}
        
        <div class="space-y-4">
            <!-- Strategy Details -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-group">
                    <label class="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                        Strategy Name*
                    </label>
                    <input 
                        type="text" 
                        class="w-full p-2 rounded-md bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                        bind:value={scriptData.name}
                        placeholder="EMA Crossover Strategy"
                    />
                </div>
                
                <div class="form-group">
                    <label class="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                        Symbol*
                    </label>
                    <select 
                        class="w-full p-2 rounded-md bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                        bind:value={scriptData.symbol}
                    >
                        <option value="">Select Symbol</option>
                        {#each symbols as symbol}
                            <option value={symbol}>{symbol}</option>
                        {/each}
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                        Timeframe*
                    </label>
                    <select 
                        class="w-full p-2 rounded-md bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                        bind:value={scriptData.timeframe}
                    >
                        {#each timeframes as tf}
                            <option value={tf.value}>{tf.label}</option>
                        {/each}
                    </select>
                </div>
                
                <div class="form-group md:col-span-2">
                    <label class="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                        Description
                    </label>
                    <textarea 
                        class="w-full p-2 rounded-md bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                        bind:value={scriptData.description}
                        rows="2"
                        placeholder="Brief description of your strategy"
                    ></textarea>
                </div>
            </div>
            
            <!-- Tabs -->
            <div class="border-b border-light-border dark:border-dark-border">
                <div class="flex space-x-4">
                    <button 
                        class="py-3 px-4 border-b-2 font-medium text-sm flex items-center gap-2 
                            {activeTab === 'editor' 
                                ? 'border-theme-500 text-theme-500 font-semibold' 
                                : 'border-transparent text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text hover:border-light-border dark:hover:border-dark-border'}"
                        on:click={() => activeTab = 'editor'}
                    >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Visual Editor
                    </button>
                    <button 
                        class="py-3 px-4 border-b-2 font-medium text-sm flex items-center gap-2
                            {activeTab === 'preview' 
                                ? 'border-theme-500 text-theme-500 font-semibold' 
                                : 'border-transparent text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text hover:border-light-border dark:hover:border-dark-border'}"
                        on:click={() => activeTab = 'preview'}
                    >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                        JSON Preview
                    </button>
                </div>
            </div>
            
            <!-- Tab Content -->
            <div class="tab-content mt-4">
                {#if activeTab === 'editor'}
                    <VisualScriptEditor 
                        script={{ conditions: scriptData.conditions, actions: scriptData.actions }}
                        on:change={handleScriptChange}
                    />
                {:else if activeTab === 'preview'}
                    <div class="p-1">
                        <VisualScriptPreview 
                            script={{ 
                                name: scriptData.name, 
                                conditions: scriptData.conditions, 
                                actions: scriptData.actions 
                            }}
                        />
                    </div>
                {/if}
            </div>
        </div>
    </div>
    
    <div slot="footer" class="flex justify-end space-x-2">
        <Button variant="secondary" on:click={handleClose} disabled={isSubmitting}>
            Cancel
        </Button>
        <Button variant="primary" on:click={handleSubmit} loading={isSubmitting}>
            {isEdit ? 'Update Strategy' : 'Create Strategy'}
        </Button>
    </div>
</Modal> 