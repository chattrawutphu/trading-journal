<script>
    import { onMount, createEventDispatcher } from 'svelte';
    import Button from '$lib/components/common/Button.svelte';
    import { fade } from 'svelte/transition';
    
    const dispatch = createEventDispatcher();
    
    // Props
    export let script = {
        name: '',
        conditions: [],
        actions: []
    };
    
    // Local state
    let draggedItem = null;
    let draggedItemType = null;
    let dragOverIndex = -1;
    let editingItem = null;
    let editingItemType = null;
    let editingItemIndex = -1;
    let showItemEditor = false;
    
    // Available conditions and actions
    const availableConditions = [
        { id: 'price_above', name: 'Price Above', params: [{ name: 'value', type: 'number', default: 0 }], description: 'Triggered when the price is above a certain value' },
        { id: 'price_below', name: 'Price Below', params: [{ name: 'value', type: 'number', default: 0 }], description: 'Triggered when the price is below a certain value' },
        { id: 'ema_crossover', name: 'EMA Crossover', params: [
            { name: 'fast_period', type: 'number', default: 9 },
            { name: 'slow_period', type: 'number', default: 21 }
        ], description: 'Triggered when the fast EMA crosses over the slow EMA' },
        { id: 'rsi_above', name: 'RSI Above', params: [
            { name: 'period', type: 'number', default: 14 },
            { name: 'value', type: 'number', default: 70 }
        ], description: 'Triggered when the RSI is above a certain value' },
        { id: 'rsi_below', name: 'RSI Below', params: [
            { name: 'period', type: 'number', default: 14 },
            { name: 'value', type: 'number', default: 30 }
        ], description: 'Triggered when the RSI is below a certain value' },
        { id: 'volume_spike', name: 'Volume Spike', params: [
            { name: 'multiplier', type: 'number', default: 2 }
        ], description: 'Triggered when the volume is above a certain multiplier' },
        { id: 'time_of_day', name: 'Time of Day', params: [
            { name: 'start_time', type: 'time', default: '09:00' },
            { name: 'end_time', type: 'time', default: '16:00' }
        ], description: 'Triggered when the time is between a certain start and end time' }
    ];
    
    const availableActions = [
        { id: 'buy_market', name: 'Buy Market', params: [
            { name: 'amount', type: 'number', default: 0 },
            { name: 'amount_type', type: 'select', options: ['USD', '%'], default: 'USD' }
        ], description: 'Buys a market order' },
        { id: 'sell_market', name: 'Sell Market', params: [
            { name: 'amount', type: 'number', default: 0 },
            { name: 'amount_type', type: 'select', options: ['USD', '%'], default: 'USD' }
        ], description: 'Sells a market order' },
        { id: 'buy_limit', name: 'Buy Limit', params: [
            { name: 'price', type: 'number', default: 0 },
            { name: 'amount', type: 'number', default: 0 },
            { name: 'amount_type', type: 'select', options: ['USD', '%'], default: 'USD' }
        ], description: 'Buys a limit order' },
        { id: 'sell_limit', name: 'Sell Limit', params: [
            { name: 'price', type: 'number', default: 0 },
            { name: 'amount', type: 'number', default: 0 },
            { name: 'amount_type', type: 'select', options: ['USD', '%'], default: 'USD' }
        ], description: 'Sells a limit order' },
        { id: 'set_stop_loss', name: 'Set Stop Loss', params: [
            { name: 'price', type: 'number', default: 0 },
            { name: 'type', type: 'select', options: ['Fixed', 'Trailing'], default: 'Fixed' },
            { name: 'trail_percent', type: 'number', default: 1, showIf: { field: 'type', value: 'Trailing' } }
        ], description: 'Sets a stop loss order' },
        { id: 'set_take_profit', name: 'Set Take Profit', params: [
            { name: 'price', type: 'number', default: 0 }
        ], description: 'Sets a take profit order' },
        { id: 'send_notification', name: 'Send Notification', params: [
            { name: 'message', type: 'text', default: '' }
        ], description: 'Sends a notification' }
    ];
    
    // Functions to handle drag and drop
    function handleDragStart(event, item, type) {
        draggedItem = { ...item };
        draggedItemType = type;
        event.dataTransfer.effectAllowed = 'move';
    }
    
    function handleDragOver(event, index, type) {
        event.preventDefault();
        if (draggedItemType === type) {
            dragOverIndex = index;
        }
    }
    
    function handleDrop(event, type) {
        event.preventDefault();
        
        if (draggedItemType === type) {
            if (dragOverIndex !== -1) {
                // Add new item from palette
                const newItem = {
                    ...draggedItem,
                    id: `${draggedItem.id}_${Date.now()}`,
                    params: draggedItem.params.map(p => ({ ...p, value: p.default })),
                    comment: '' // Initialize with empty comment
                };
                
                if (type === 'condition') {
                    script.conditions = [
                        ...script.conditions.slice(0, dragOverIndex),
                        newItem,
                        ...script.conditions.slice(dragOverIndex)
                    ];
                } else {
                    script.actions = [
                        ...script.actions.slice(0, dragOverIndex),
                        newItem,
                        ...script.actions.slice(dragOverIndex)
                    ];
                }
                
                script = { ...script };
                dispatch('change', script);
            }
        }
        
        draggedItem = null;
        draggedItemType = null;
        dragOverIndex = -1;
    }
    
    function handleDragEnd() {
        draggedItem = null;
        draggedItemType = null;
        dragOverIndex = -1;
    }
    
    // Functions to edit items
    function openItemEditor(item, type, index) {
        editingItem = JSON.parse(JSON.stringify(item));
        editingItemType = type;
        editingItemIndex = index;
        showItemEditor = true;
    }
    
    function saveItemEdit() {
        if (editingItemType === 'condition') {
            script.conditions[editingItemIndex] = editingItem;
        } else {
            script.actions[editingItemIndex] = editingItem;
        }
        
        script = { ...script };
        dispatch('change', script);
        closeItemEditor();
    }
    
    function closeItemEditor() {
        showItemEditor = false;
        editingItem = null;
        editingItemType = null;
        editingItemIndex = -1;
    }
    
    function removeItem(type, index) {
        if (type === 'condition') {
            script.conditions = script.conditions.filter((_, i) => i !== index);
        } else {
            script.actions = script.actions.filter((_, i) => i !== index);
        }
        
        script = { ...script };
        dispatch('change', script);
    }
    
    // Get condition or action template by ID
    function getConditionById(id) {
        return availableConditions.find(c => c.id === id);
    }
    
    function getActionById(id) {
        return availableActions.find(a => a.id === id);
    }
    
    // Format parameter value for display
    function formatParamValue(param) {
        if (param.type === 'select') {
            return param.value || param.default;
        } else if (param.type === 'number') {
            return (param.value ?? param.default).toString();
        } else {
            return param.value || param.default || '';
        }
    }
    
    // Check if parameter should be shown based on conditions
    function shouldShowParam(param, item) {
        if (!param.showIf) return true;
        
        const dependentParam = item.params.find(p => p.name === param.showIf.field);
        return dependentParam && dependentParam.value === param.showIf.value;
    }
</script>

<div class="visual-script-editor">
    <div class="flex flex-col md:flex-row gap-4">
        <!-- Left side: Palette -->
        <div class="w-full md:w-1/4 space-y-4">
            <div class="card p-4">
                <h3 class="text-lg font-semibold text-light-text dark:text-dark-text mb-3">Conditions</h3>
                <div class="space-y-2">
                    {#each availableConditions as condition}
                        <div 
                            class="p-2 bg-light-hover dark:bg-dark-hover rounded-md cursor-move text-light-text dark:text-dark-text"
                            draggable="true"
                            on:dragstart={(e) => handleDragStart(e, condition, 'condition')}
                            on:dragend={handleDragEnd}
                        >
                            {condition.name}
                            <div class="text-xs text-light-text-muted dark:text-dark-text-muted mt-1 truncate">
                                {condition.description}
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
            
            <div class="card p-4">
                <h3 class="text-lg font-semibold text-light-text dark:text-dark-text mb-3">Actions</h3>
                <div class="space-y-2">
                    {#each availableActions as action}
                        <div 
                            class="p-2 bg-light-hover dark:bg-dark-hover rounded-md cursor-move text-light-text dark:text-dark-text"
                            draggable="true"
                            on:dragstart={(e) => handleDragStart(e, action, 'action')}
                            on:dragend={handleDragEnd}
                        >
                            {action.name}
                            <div class="text-xs text-light-text-muted dark:text-dark-text-muted mt-1 truncate">
                                {action.description}
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
        
        <!-- Right side: Script Builder -->
        <div class="w-full md:w-3/4 space-y-4">
            <!-- Conditions Section -->
            <div 
                class="card p-4"
                on:dragover={(e) => e.preventDefault()}
                on:drop={(e) => handleDrop(e, 'condition')}
            >
                <h3 class="text-lg font-semibold text-light-text dark:text-dark-text mb-3">
                    When these conditions are met:
                </h3>
                
                {#if script.conditions.length === 0}
                    <div 
                        class="p-4 border-2 border-dashed border-light-border dark:border-dark-border rounded-md text-center text-light-text-muted dark:text-dark-text-muted"
                        on:dragover={(e) => handleDragOver(e, 0, 'condition')}
                    >
                        Drag conditions here
                    </div>
                {:else}
                    <div class="space-y-2">
                        {#each script.conditions as condition, index}
                            <div 
                                class="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md flex justify-between items-center"
                                on:dragover={(e) => handleDragOver(e, index, 'condition')}
                            >
                                <div class="flex-1">
                                    <div class="font-medium text-light-text dark:text-dark-text">{condition.name}</div>
                                    <div class="text-xs text-light-text-muted dark:text-dark-text-muted italic">
                                        {getConditionById(condition.id.split('_')[0])?.description || ''}
                                    </div>
                                    
                                    <!-- Condition Comment -->
                                    {#if condition.comment}
                                        <div class="mt-2 mb-1 mx-1 p-2 text-xs bg-yellow-50 dark:bg-yellow-900/10 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700/50 rounded-md italic">
                                            <div class="flex items-start">
                                                <svg class="w-3.5 h-3.5 mr-1.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                                </svg>
                                                <span>{condition.comment}</span>
                                            </div>
                                        </div>
                                    {/if}
                                    
                                    <div class="text-xs text-light-text-muted dark:text-dark-text-muted mt-1">
                                        {#each condition.params as param}
                                            {#if shouldShowParam(param, condition)}
                                                <span class="inline-flex items-center mr-2 px-1.5 py-0.5 rounded-md bg-light-hover/50 dark:bg-dark-hover/50">
                                                    <span class="font-medium mr-1">{param.name}:</span> {formatParamValue(param)}
                                                </span>
                                            {/if}
                                        {/each}
                                    </div>
                                </div>
                                <div class="flex items-center space-x-2">
                                    <button 
                                        class="p-1 text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 dark:hover:text-theme-400"
                                        on:click={() => openItemEditor(condition, 'condition', index)}
                                    >
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                    <button 
                                        class="p-1 text-light-text-muted dark:text-dark-text-muted hover:text-red-500 dark:hover:text-red-400"
                                        on:click={() => removeItem('condition', index)}
                                    >
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        {/each}
                        
                        <div 
                            class="p-2 border-2 border-dashed border-light-border dark:border-dark-border rounded-md text-center text-light-text-muted dark:text-dark-text-muted"
                            on:dragover={(e) => handleDragOver(e, script.conditions.length, 'condition')}
                        >
                            Drag more conditions here
                        </div>
                    </div>
                {/if}
            </div>
            
            <!-- Actions Section -->
            <div 
                class="card p-4"
                on:dragover={(e) => e.preventDefault()}
                on:drop={(e) => handleDrop(e, 'action')}
            >
                <h3 class="text-lg font-semibold text-light-text dark:text-dark-text mb-3">
                    Then perform these actions:
                </h3>
                
                {#if script.actions.length === 0}
                    <div 
                        class="p-4 border-2 border-dashed border-light-border dark:border-dark-border rounded-md text-center text-light-text-muted dark:text-dark-text-muted"
                        on:dragover={(e) => handleDragOver(e, 0, 'action')}
                    >
                        Drag actions here
                    </div>
                {:else}
                    <div class="space-y-2">
                        {#each script.actions as action, index}
                            <div 
                                class="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md flex justify-between items-center"
                                on:dragover={(e) => handleDragOver(e, index, 'action')}
                            >
                                <div class="flex-1">
                                    <div class="font-medium text-light-text dark:text-dark-text">{action.name}</div>
                                    <div class="text-xs text-light-text-muted dark:text-dark-text-muted italic">
                                        {getActionById(action.id.split('_')[0])?.description || ''}
                                    </div>
                                    
                                    <!-- Action Comment -->
                                    {#if action.comment}
                                        <div class="mt-2 mb-1 mx-1 p-2 text-xs bg-yellow-50 dark:bg-yellow-900/10 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700/50 rounded-md italic">
                                            <div class="flex items-start">
                                                <svg class="w-3.5 h-3.5 mr-1.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                                </svg>
                                                <span>{action.comment}</span>
                                            </div>
                                        </div>
                                    {/if}
                                    
                                    <div class="text-xs text-light-text-muted dark:text-dark-text-muted mt-1">
                                        {#each action.params as param}
                                            {#if shouldShowParam(param, action)}
                                                <span class="inline-flex items-center mr-2 px-1.5 py-0.5 rounded-md bg-light-hover/50 dark:bg-dark-hover/50">
                                                    <span class="font-medium mr-1">{param.name}:</span> {formatParamValue(param)}
                                                </span>
                                            {/if}
                                        {/each}
                                    </div>
                                </div>
                                <div class="flex items-center space-x-2">
                                    <button 
                                        class="p-1 text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 dark:hover:text-theme-400"
                                        on:click={() => openItemEditor(action, 'action', index)}
                                    >
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                    <button 
                                        class="p-1 text-light-text-muted dark:text-dark-text-muted hover:text-red-500 dark:hover:text-red-400"
                                        on:click={() => removeItem('action', index)}
                                    >
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        {/each}
                        
                        <div 
                            class="p-2 border-2 border-dashed border-light-border dark:border-dark-border rounded-md text-center text-light-text-muted dark:text-dark-text-muted"
                            on:dragover={(e) => handleDragOver(e, script.actions.length, 'action')}
                        >
                            Drag more actions here
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    </div>
    
    <!-- Item Editor Modal -->
    {#if showItemEditor}
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" transition:fade={{ duration: 200 }}>
            <div class="bg-light-card dark:bg-dark-card rounded-lg shadow-xl w-full max-w-md p-4 max-h-[90vh] overflow-y-auto">
                <h3 class="text-xl font-semibold text-light-text dark:text-dark-text mb-4">
                    Edit {editingItem.name}
                </h3>
                
                <div class="space-y-4">
                    {#each editingItem.params as param, paramIndex}
                        {#if shouldShowParam(param, editingItem)}
                            <div class="form-group">
                                <label class="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                                    {param.name}
                                </label>
                                
                                {#if param.type === 'number'}
                                    <input 
                                        type="number" 
                                        class="w-full p-2 rounded-md bg-light-input dark:bg-dark-input border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                                        bind:value={param.value}
                                    />
                                {:else if param.type === 'text'}
                                    <input 
                                        type="text" 
                                        class="w-full p-2 rounded-md bg-light-input dark:bg-dark-input border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                                        bind:value={param.value}
                                    />
                                {:else if param.type === 'time'}
                                    <input 
                                        type="time" 
                                        class="w-full p-2 rounded-md bg-light-input dark:bg-dark-input border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                                        bind:value={param.value}
                                    />
                                {:else if param.type === 'select'}
                                    <select 
                                        class="w-full p-2 rounded-md bg-light-input dark:bg-dark-input border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                                        bind:value={param.value}
                                    >
                                        {#each param.options as option}
                                            <option value={option}>{option}</option>
                                        {/each}
                                    </select>
                                {/if}
                            </div>
                        {/if}
                    {/each}
                    
                    <!-- Comment Field -->
                    <div class="form-group">
                        <label class="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                            Comment
                        </label>
                        <textarea 
                            class="w-full p-2 rounded-md bg-light-input dark:bg-dark-input border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                            bind:value={editingItem.comment}
                            rows="3"
                            placeholder="Add a comment about this item..."
                        ></textarea>
                    </div>
                </div>
                
                <div class="flex justify-end space-x-2 mt-6">
                    <Button variant="secondary" size="sm" on:click={closeItemEditor}>
                        Cancel
                    </Button>
                    <Button variant="primary" size="sm" on:click={saveItemEdit}>
                        Save
                    </Button>
                </div>
            </div>
        </div>
    {/if}
</div>

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-sm;
    }
</style> 