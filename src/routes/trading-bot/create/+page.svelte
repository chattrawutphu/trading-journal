<script>
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import Button from "$lib/components/common/Button.svelte";
    import { subscriptionStore } from "$lib/stores/subscriptionStore";
    import { SUBSCRIPTION_TYPES } from "$lib/config/subscription";
    
    // State variables
    let strategyName = "";
    let symbol = "";
    let timeframe = "1h";
    let description = "";
    let error = "";
    
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
        
        // Clear error
        error = "";
        
        // Create strategy object
        const strategy = {
            id: crypto.randomUUID(),
            name: strategyName.trim(),
            symbol,
            timeframe,
            description,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: document.querySelector('#status-active').checked ? 'active' : 'inactive',
            containers: []
        };
        
        // Save to local storage
        const storedStrategiesStr = localStorage.getItem('draftStrategies');
        const storedStrategies = storedStrategiesStr 
            ? JSON.parse(storedStrategiesStr) 
            : {};
        
        storedStrategies[strategy.id] = strategy;
        localStorage.setItem('draftStrategies', JSON.stringify(storedStrategies));
        
        // Navigate to visual script editor
        goto(`/trading-bot/visual-editor/${strategy.id}`);
    }
    
    // Cancel and go back
    function handleCancel() {
        goto('/trading-bot');
    }
</script>

<div class="container mx-auto p-4 max-w-4xl">
    <div class="mb-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-6 shadow-lg">
        <div class="flex items-center justify-between">
            <div>
                <h1 class="text-2xl font-bold text-white mb-2">Create New Strategy</h1>
                <p class="text-blue-100">Define your trading strategy parameters</p>
            </div>
            <Button variant="secondary" size="sm" on:click={handleCancel} class="bg-white/20 hover:bg-white/30 text-white border-white/30">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
            </Button>
        </div>
    </div>
    
    {#if error}
        <div class="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border-l-4 border-red-500 rounded-md text-red-600 dark:text-red-400 flex items-center">
            <svg class="w-5 h-5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
        </div>
    {/if}
    
    <div class="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-md p-8 transition-all duration-200 hover:shadow-lg">
        <div class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="form-group">
                    <label class="block text-sm font-medium text-light-text dark:text-dark-text mb-2 flex items-center">
                        <svg class="w-4 h-4 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Strategy Name*
                    </label>
                    <input 
                        type="text" 
                        class="w-full p-3 rounded-md bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border text-light-text dark:text-dark-text transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        bind:value={strategyName}
                        placeholder="EMA Crossover Strategy"
                    />
                </div>
                
                <div class="form-group">
                    <label class="block text-sm font-medium text-light-text dark:text-dark-text mb-2 flex items-center">
                        <svg class="w-4 h-4 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        Symbol*
                    </label>
                    <div class="relative">
                        <select 
                            class="w-full p-3 rounded-md bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border text-light-text dark:text-dark-text appearance-none transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none pl-3 pr-10"
                            bind:value={symbol}
                        >
                            <option value="">Select Symbol</option>
                            {#each symbols as sym}
                                <option value={sym}>{sym}</option>
                            {/each}
                        </select>
                        <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                            <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="block text-sm font-medium text-light-text dark:text-dark-text mb-2 flex items-center">
                        <svg class="w-4 h-4 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Timeframe*
                    </label>
                    <div class="relative">
                        <select 
                            class="w-full p-3 rounded-md bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border text-light-text dark:text-dark-text appearance-none transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none pl-3 pr-10"
                            bind:value={timeframe}
                        >
                            {#each timeframes as tf}
                                <option value={tf.value}>{tf.label}</option>
                            {/each}
                        </select>
                        <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                            <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="block text-sm font-medium text-light-text dark:text-dark-text mb-2 flex items-center">
                        <svg class="w-4 h-4 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Initial Status
                    </label>
                    <div class="flex items-center space-x-4 bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border rounded-md p-3">
                        <div class="flex items-center">
                            <input type="radio" id="status-inactive" name="status" value="inactive" checked class="mr-2 h-4 w-4 text-blue-500 focus:ring-blue-500">
                            <label for="status-inactive" class="text-light-text dark:text-dark-text">Inactive</label>
                        </div>
                        <div class="flex items-center">
                            <input type="radio" id="status-active" name="status" value="active" class="mr-2 h-4 w-4 text-blue-500 focus:ring-blue-500">
                            <label for="status-active" class="text-light-text dark:text-dark-text">Active</label>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label class="block text-sm font-medium text-light-text dark:text-dark-text mb-2 flex items-center">
                    <svg class="w-4 h-4 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m-6-8h6M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h6" />
                    </svg>
                    Description
                </label>
                <textarea 
                    class="w-full p-3 rounded-md bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border text-light-text dark:text-dark-text transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    bind:value={description}
                    rows="3"
                    placeholder="Brief description of your strategy"
                ></textarea>
            </div>
            
            <div class="flex justify-end space-x-3 pt-4 border-t border-light-border dark:border-dark-border">
                <Button variant="secondary" on:click={handleCancel} class="hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</Button>
                <Button variant="primary" on:click={handleSubmit} class="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white">Continue to Visual Editor</Button>
            </div>
        </div>
    </div>
</div>