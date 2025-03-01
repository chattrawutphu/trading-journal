<script>
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import Button from "$lib/components/common/Button.svelte";
    
    // State variables
    let strategyName = "";
    let symbol = "";
    let timeframe = "1h";
    let description = "";
    let error = "";
    let strategy = null;
    let strategyId = "";
    
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
    
    onMount(() => {
        // Get strategy ID from URL
        strategyId = $page.params.id;
        
        // Load strategy from localStorage
        const storedStrategies = localStorage.getItem('draftStrategies') 
            ? JSON.parse(localStorage.getItem('draftStrategies')) 
            : {};
        
        if (storedStrategies[strategyId]) {
            strategy = storedStrategies[strategyId];
            strategyName = strategy.name;
            symbol = strategy.symbol;
            timeframe = strategy.timeframe;
            description = strategy.description || "";
        } else {
            error = "Strategy not found";
        }
    });
    
    // Handle form submission
    function handleSubmit() {
        // Validate form
        if (!strategyName.trim()) {
            error = 'Strategy name is required';
            return;
        }
        
        if (!symbol) {
            error = 'Symbol is required';
            return;
        }
        
        if (!timeframe) {
            error = 'Timeframe is required';
            return;
        }
        
        error = '';
        
        // Update strategy object
        strategy.name = strategyName;
        strategy.symbol = symbol;
        strategy.timeframe = timeframe;
        strategy.description = description;
        strategy.lastUpdated = new Date().toISOString();
        
        // Store updated strategy in localStorage
        const storedStrategies = localStorage.getItem('draftStrategies') 
            ? JSON.parse(localStorage.getItem('draftStrategies')) 
            : {};
        
        storedStrategies[strategyId] = strategy;
        localStorage.setItem('draftStrategies', JSON.stringify(storedStrategies));
        
        // Navigate to visual script editor
        goto(`/trading-bot/visual-editor/${strategyId}`);
    }
    
    // Cancel and go back
    function handleCancel() {
        goto('/trading-bot');
    }
</script>

<div class="container mx-auto p-4 max-w-4xl">
    <div class="mb-6 flex items-center justify-between">
        <h1 class="text-2xl font-bold text-light-text dark:text-dark-text">Edit Strategy</h1>
        <Button variant="secondary" size="sm" on:click={handleCancel}>
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
        </Button>
    </div>
    
    {#if error}
        <div class="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-400">
            {error}
        </div>
    {/if}
    
    {#if strategy}
        <div class="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-sm p-6">
            <div class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="form-group">
                        <label class="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                            Strategy Name*
                        </label>
                        <input 
                            type="text" 
                            class="w-full p-3 rounded-md bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                            bind:value={strategyName}
                            placeholder="EMA Crossover Strategy"
                        />
                    </div>
                    
                    <div class="form-group">
                        <label class="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                            Symbol*
                        </label>
                        <select 
                            class="w-full p-3 rounded-md bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                            bind:value={symbol}
                        >
                            <option value="">Select Symbol</option>
                            {#each symbols as sym}
                                <option value={sym}>{sym}</option>
                            {/each}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                            Timeframe*
                        </label>
                        <select 
                            class="w-full p-3 rounded-md bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                            bind:value={timeframe}
                        >
                            {#each timeframes as tf}
                                <option value={tf.value}>{tf.label}</option>
                            {/each}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                            Status
                        </label>
                        <div class="flex items-center space-x-4">
                            <div class="flex items-center">
                                <input type="radio" id="status-inactive" name="status" value="inactive" checked={strategy.status === 'inactive'} class="mr-2">
                                <label for="status-inactive" class="text-light-text dark:text-dark-text">Inactive</label>
                            </div>
                            <div class="flex items-center">
                                <input type="radio" id="status-active" name="status" value="active" checked={strategy.status === 'active'} class="mr-2">
                                <label for="status-active" class="text-light-text dark:text-dark-text">Active</label>
                            </div>
                            <div class="flex items-center">
                                <input type="radio" id="status-paused" name="status" value="paused" checked={strategy.status === 'paused'} class="mr-2">
                                <label for="status-paused" class="text-light-text dark:text-dark-text">Paused</label>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                        Description
                    </label>
                    <textarea 
                        class="w-full p-3 rounded-md bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                        bind:value={description}
                        rows="3"
                        placeholder="Brief description of your strategy"
                    ></textarea>
                </div>
                
                <div class="flex justify-end space-x-3 pt-4 border-t border-light-border dark:border-dark-border">
                    <Button variant="secondary" on:click={handleCancel}>Cancel</Button>
                    <Button variant="primary" on:click={handleSubmit}>Continue to Visual Editor</Button>
                </div>
            </div>
        </div>
    {/if}
</div> 