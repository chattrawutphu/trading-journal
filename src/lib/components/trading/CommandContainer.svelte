<script>
    import { createEventDispatcher } from 'svelte';
    import Button from '$lib/components/common/Button.svelte';
    
    const dispatch = createEventDispatcher();
    
    // Props
    export let container = {
        id: '',
        name: 'Command Group',
        conditions: [],
        actions: [],
        children: []
    };
    export let index = 0;
    export let isExpanded = true;
    export let nestingLevel = 0;
    
    // Available conditions and actions for dropdown
    const availableConditions = [
        { id: 'price_above', name: 'Price Above', params: [{ name: 'value', type: 'number', default: 0 }] },
        { id: 'price_below', name: 'Price Below', params: [{ name: 'value', type: 'number', default: 0 }] },
        { id: 'ema_crossover', name: 'EMA Crossover', params: [
            { name: 'fast_period', type: 'number', default: 9 },
            { name: 'slow_period', type: 'number', default: 21 }
        ]},
        { id: 'rsi_above', name: 'RSI Above', params: [
            { name: 'period', type: 'number', default: 14 },
            { name: 'value', type: 'number', default: 70 }
        ]},
        { id: 'rsi_below', name: 'RSI Below', params: [
            { name: 'period', type: 'number', default: 14 },
            { name: 'value', type: 'number', default: 30 }
        ]},
        { id: 'volume_spike', name: 'Volume Spike', params: [
            { name: 'multiplier', type: 'number', default: 2 }
        ]},
        { id: 'time_of_day', name: 'Time of Day', params: [
            { name: 'start_time', type: 'time', default: '09:00' },
            { name: 'end_time', type: 'time', default: '16:00' }
        ]}
    ];
    
    const availableActions = [
        { id: 'buy_market', name: 'Buy Market', params: [
            { name: 'amount', type: 'number', default: 0 },
            { name: 'amount_type', type: 'select', options: ['USD', '%'], default: 'USD' }
        ]},
        { id: 'sell_market', name: 'Sell Market', params: [
            { name: 'amount', type: 'number', default: 0 },
            { name: 'amount_type', type: 'select', options: ['USD', '%'], default: 'USD' }
        ]},
        { id: 'buy_limit', name: 'Buy Limit', params: [
            { name: 'price', type: 'number', default: 0 },
            { name: 'amount', type: 'number', default: 0 },
            { name: 'amount_type', type: 'select', options: ['USD', '%'], default: 'USD' }
        ]},
        { id: 'sell_limit', name: 'Sell Limit', params: [
            { name: 'price', type: 'number', default: 0 },
            { name: 'amount', type: 'number', default: 0 },
            { name: 'amount_type', type: 'select', options: ['USD', '%'], default: 'USD' }
        ]},
        { id: 'set_stop_loss', name: 'Set Stop Loss', params: [
            { name: 'price', type: 'number', default: 0 },
            { name: 'type', type: 'select', options: ['Fixed', 'Trailing'], default: 'Fixed' },
            { name: 'trail_percent', type: 'number', default: 1, showIf: { field: 'type', value: 'Trailing' } }
        ]},
        { id: 'set_take_profit', name: 'Set Take Profit', params: [
            { name: 'price', type: 'number', default: 0 }
        ]},
        { id: 'send_notification', name: 'Send Notification', params: [
            { name: 'message', type: 'text', default: '' }
        ]}
    ];
    
    // Local state
    let showConditionDropdown = false;
    let showActionDropdown = false;
    let editingItem = null;
    let editingItemType = null;
    let editingItemIndex = -1;
    let showItemEditor = false;
    
    // Drag and drop state
    let isDragging = false;
    let draggedItem = null;
    let draggedItemType = null; // 'condition', 'action'
    let draggedItemIndex = -1;
    let dropTarget = null;
    let dropTargetType = null; // 'before', 'after'
    let dropTargetIndex = -1;
    let dropTargetContainer = null; // For dropping between containers
    
    // Toggle container expansion
    function toggleExpand() {
        isExpanded = !isExpanded;
    }
    
    // Add condition
    function addCondition(condition) {
        const newCondition = {
            ...condition,
            id: `${condition.id}_${Date.now()}`,
            params: condition.params.map(p => ({ ...p, value: p.default }))
        };
        
        container.conditions = [...container.conditions, newCondition];
        showConditionDropdown = false;
        
        dispatch('update', { index, container });
    }
    
    // Add action
    function addAction(action) {
        const newAction = {
            ...action,
            id: `${action.id}_${Date.now()}`,
            params: action.params.map(p => ({ ...p, value: p.default }))
        };
        
        container.actions = [...container.actions, newAction];
        showActionDropdown = false;
        
        dispatch('update', { index, container });
    }
    
    // Edit item
    function editItem(item, type, itemIndex) {
        editingItem = JSON.parse(JSON.stringify(item));
        editingItemType = type;
        editingItemIndex = itemIndex;
        showItemEditor = true;
    }
    
    // Save edited item
    function saveItemEdit() {
        if (editingItemType === 'condition') {
            container.conditions[editingItemIndex] = editingItem;
        } else {
            container.actions[editingItemIndex] = editingItem;
        }
        
        closeItemEditor();
        dispatch('update', { index, container });
    }
    
    // Close item editor
    function closeItemEditor() {
        showItemEditor = false;
        editingItem = null;
        editingItemType = null;
        editingItemIndex = -1;
    }
    
    // Remove item
    function removeItem(type, itemIndex) {
        if (type === 'condition') {
            container.conditions = container.conditions.filter((_, i) => i !== itemIndex);
        } else {
            container.actions = container.actions.filter((_, i) => i !== itemIndex);
        }
        
        dispatch('update', { index, container });
    }
    
    // Remove container
    function removeContainer() {
        dispatch('remove', { index });
    }
    
    // Add child container
    function addChildContainer() {
        if (!container.children) {
            container.children = [];
        }
        
        const childContainer = {
            id: `container_${Date.now()}`,
            name: 'Command Group',
            conditions: [],
            actions: [],
            children: []
        };
        
        container.children = [...container.children, childContainer];
        dispatch('update', { index, container });
    }
    
    // Handle child container update
    function handleChildUpdate(event) {
        const { index: childIndex, container: updatedChild } = event.detail;
        container.children[childIndex] = updatedChild;
        dispatch('update', { index, container });
    }
    
    // Handle child container removal
    function handleChildRemove(event) {
        const { index: childIndex } = event.detail;
        container.children = container.children.filter((_, i) => i !== childIndex);
        dispatch('update', { index, container });
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
    
    // Handle container name change
    function handleNameChange() {
        dispatch('update', { index, container });
    }
    
    // Drag and drop functions
    
    // Start dragging an item
    function handleDragStart(event, item, type, itemIndex) {
        event.stopPropagation();
        
        isDragging = true;
        draggedItem = { ...item };
        draggedItemType = type;
        draggedItemIndex = itemIndex;
        
        // Dispatch event to parent to control global drag state
        dispatch('dragstart', {
            item: draggedItem,
            type: draggedItemType,
            containerIndex: index,
            itemIndex: draggedItemIndex
        });
        
        // Set data transfer for compatibility
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', JSON.stringify({
            type: draggedItemType,
            index: draggedItemIndex,
            containerIndex: index
        }));
    }
    
    // Handle drag over
    function handleDragOver(event, type, targetIndex) {
        event.preventDefault();
        event.stopPropagation();
        
        if (!isDragging) return;
        
        // Only handle same type items within the same container
        if (draggedItemType !== type) return;
        
        // Calculate drop position
        const rect = event.currentTarget.getBoundingClientRect();
        const mouseY = event.clientY - rect.top;
        const height = rect.height;
        const position = mouseY / height;
        
        if (position < 0.5) {
            // Drop before
            dropTargetType = 'before';
        } else {
            // Drop after
            dropTargetType = 'after';
        }
        
        dropTargetIndex = targetIndex;
    }
    
    // Handle drop
    function handleDrop(event, type) {
        event.preventDefault();
        event.stopPropagation();
        
        if (!isDragging || draggedItemType !== type || dropTargetIndex === -1) {
            resetDragState();
            return;
        }
        
        // Move item within the same container
        let items = type === 'condition' ? [...container.conditions] : [...container.actions];
        const itemToMove = { ...draggedItem };
        
        // Remove the item from its current position
        items = items.filter((_, i) => i !== draggedItemIndex);
        
        // Adjust the target index if needed
        let adjustedTargetIndex = dropTargetIndex;
        if (draggedItemIndex < dropTargetIndex) {
            adjustedTargetIndex--;
        }
        
        // Insert at the new position
        if (dropTargetType === 'before') {
            items = [
                ...items.slice(0, adjustedTargetIndex),
                itemToMove,
                ...items.slice(adjustedTargetIndex)
            ];
        } else {
            items = [
                ...items.slice(0, adjustedTargetIndex + 1),
                itemToMove,
                ...items.slice(adjustedTargetIndex + 1)
            ];
        }
        
        // Update the container
        if (type === 'condition') {
            container.conditions = items;
        } else {
            container.actions = items;
        }
        
        dispatch('update', { index, container });
        resetDragState();
    }
    
    // Drop from another container
    function handleExternalDrop(event, type) {
        event.preventDefault();
        event.stopPropagation();
        
        try {
            const data = JSON.parse(event.dataTransfer.getData('text/plain'));
            
            if (data && data.type === type && data.containerIndex !== undefined) {
                // Dispatch to parent to handle cross-container drag and drop
                dispatch('externaldrop', {
                    sourceContainerIndex: data.containerIndex,
                    sourceItemIndex: data.index,
                    targetContainerIndex: index,
                    itemType: type
                });
            }
        } catch (err) {
            console.error('Error parsing drag data:', err);
        }
        
        resetDragState();
    }
    
    // Reset drag state
    function resetDragState() {
        isDragging = false;
        draggedItem = null;
        draggedItemType = null;
        draggedItemIndex = -1;
        dropTarget = null;
        dropTargetType = null;
        dropTargetIndex = -1;
        dropTargetContainer = null;
        
        dispatch('dragend');
    }
    
    // Handle drag end
    function handleDragEnd(event) {
        event.stopPropagation();
        resetDragState();
    }
</script>

<div class="command-container bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg mb-4 overflow-hidden" style="margin-left: {nestingLevel * 1.5}rem">
    <!-- Header -->
    <div class="p-3 bg-light-hover dark:bg-dark-hover border-b border-light-border dark:border-dark-border flex justify-between items-center">
        <div class="flex items-center gap-2">
            <button 
                class="p-1 text-light-text dark:text-dark-text hover:text-theme-500 dark:hover:text-theme-400"
                on:click={toggleExpand}
            >
                <svg class="w-5 h-5 transform transition-transform {isExpanded ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
            </button>
        </div>
        <div class="flex items-center gap-2">
            <button
                class="p-1 text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 dark:hover:text-theme-400"
                on:click={addChildContainer}
                title="Add container"
            >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
            </button>
            {#if nestingLevel > 0}
                <button 
                    class="p-1 text-light-text-muted dark:text-dark-text-muted hover:text-red-500 dark:hover:text-red-400"
                    on:click={removeContainer}
                    title="Remove container"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            {/if}
        </div>
    </div>
    
    <!-- Content -->
    {#if isExpanded}
        <div class="p-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Left Side: Conditions Section -->
                <div>
                    <div class="flex justify-between items-center mb-2">
                        <h3 class="text-sm font-medium text-light-text dark:text-dark-text">Conditions</h3>
                        <div class="relative">
                            <button 
                                class="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                                on:click={() => showConditionDropdown = !showConditionDropdown}
                            >
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Add Condition
                            </button>
                            
                            {#if showConditionDropdown}
                                <div class="absolute right-0 mt-1 w-48 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-md shadow-lg z-10">
                                    <ul class="py-1 max-h-60 overflow-y-auto">
                                        {#each availableConditions as condition}
                                            <li>
                                                <button 
                                                    class="w-full text-left px-4 py-2 text-sm text-light-text dark:text-dark-text hover:bg-light-hover dark:hover:bg-dark-hover"
                                                    on:click={() => addCondition(condition)}
                                                    draggable="true"
                                                    on:dragstart={(e) => handleDragStart(e, condition, 'condition', -1)}
                                                    on:dragend={handleDragEnd}
                                                >
                                                    {condition.name}
                                                </button>
                                            </li>
                                        {/each}
                                    </ul>
                                </div>
                            {/if}
                        </div>
                    </div>
                    
                    {#if container.conditions.length === 0}
                        <div 
                            class="p-3 border border-dashed border-light-border dark:border-dark-border rounded-md text-center text-light-text-muted dark:text-dark-text-muted text-sm droppable-area"
                            on:dragover={(e) => e.preventDefault()}
                            on:drop={(e) => handleExternalDrop(e, 'condition')}
                        >
                            No conditions added. Click "Add Condition" to add one.
                        </div>
                    {:else}
                        <div 
                            class="space-y-2 conditions-container"
                            on:dragover={(e) => e.preventDefault()}
                            on:drop={(e) => handleExternalDrop(e, 'condition')}
                        >
                            {#each container.conditions as condition, i}
                                <div 
                                    class="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md flex justify-between items-center relative condition-item"
                                    draggable="true"
                                    on:dragstart={(e) => handleDragStart(e, condition, 'condition', i)}
                                    on:dragover={(e) => handleDragOver(e, 'condition', i)}
                                    on:drop={(e) => handleDrop(e, 'condition')}
                                    on:dragend={handleDragEnd}
                                >
                                    <!-- Drop indicator lines -->
                                    {#if isDragging && draggedItemType === 'condition' && dropTargetIndex === i}
                                        {#if dropTargetType === 'before'}
                                            <div class="absolute top-0 left-0 right-0 h-1 bg-theme-500 z-10 drop-indicator-line"></div>
                                        {:else if dropTargetType === 'after'}
                                            <div class="absolute bottom-0 left-0 right-0 h-1 bg-theme-500 z-10 drop-indicator-line"></div>
                                        {/if}
                                    {/if}
                                    
                                    <div class="flex-1">
                                        <div class="font-medium text-sm text-light-text dark:text-dark-text">{condition.name}</div>
                                        <div class="text-xs text-light-text-muted dark:text-dark-text-muted">
                                            {#each condition.params as param}
                                                {#if shouldShowParam(param, condition)}
                                                    <span class="mr-2">{param.name}: {formatParamValue(param)}</span>
                                                {/if}
                                            {/each}
                                        </div>
                                    </div>
                                    <div class="flex items-center space-x-1">
                                        <button 
                                            class="p-1 text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 dark:hover:text-theme-400"
                                            on:click={() => editItem(condition, 'condition', i)}
                                        >
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button 
                                            class="p-1 text-light-text-muted dark:text-dark-text-muted hover:text-red-500 dark:hover:text-red-400"
                                            on:click={() => removeItem('condition', i)}
                                        >
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
                
                <!-- Right Side: Actions Section -->
                <div>
                    <div class="flex justify-between items-center mb-2">
                        <h3 class="text-sm font-medium text-light-text dark:text-dark-text">Actions</h3>
                        <div class="relative">
                            <button 
                                class="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800"
                                on:click={() => showActionDropdown = !showActionDropdown}
                            >
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Add Action
                            </button>
                            
                            {#if showActionDropdown}
                                <div class="absolute right-0 mt-1 w-48 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-md shadow-lg z-10">
                                    <ul class="py-1 max-h-60 overflow-y-auto">
                                        {#each availableActions as action}
                                            <li>
                                                <button 
                                                    class="w-full text-left px-4 py-2 text-sm text-light-text dark:text-dark-text hover:bg-light-hover dark:hover:bg-dark-hover"
                                                    on:click={() => addAction(action)}
                                                    draggable="true"
                                                    on:dragstart={(e) => handleDragStart(e, action, 'action', -1)}
                                                    on:dragend={handleDragEnd}
                                                >
                                                    {action.name}
                                                </button>
                                            </li>
                                        {/each}
                                    </ul>
                                </div>
                            {/if}
                        </div>
                    </div>
                    
                    {#if container.actions.length === 0}
                        <div 
                            class="p-3 border border-dashed border-light-border dark:border-dark-border rounded-md text-center text-light-text-muted dark:text-dark-text-muted text-sm droppable-area"
                            on:dragover={(e) => e.preventDefault()}
                            on:drop={(e) => handleExternalDrop(e, 'action')}
                        >
                            No actions added. Click "Add Action" to add one.
                        </div>
                    {:else}
                        <div 
                            class="space-y-2 actions-container"
                            on:dragover={(e) => e.preventDefault()}
                            on:drop={(e) => handleExternalDrop(e, 'action')}
                        >
                            {#each container.actions as action, i}
                                <div 
                                    class="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md flex justify-between items-center relative action-item"
                                    draggable="true"
                                    on:dragstart={(e) => handleDragStart(e, action, 'action', i)}
                                    on:dragover={(e) => handleDragOver(e, 'action', i)}
                                    on:drop={(e) => handleDrop(e, 'action')}
                                    on:dragend={handleDragEnd}
                                >
                                    <!-- Drop indicator lines -->
                                    {#if isDragging && draggedItemType === 'action' && dropTargetIndex === i}
                                        {#if dropTargetType === 'before'}
                                            <div class="absolute top-0 left-0 right-0 h-1 bg-theme-500 z-10 drop-indicator-line"></div>
                                        {:else if dropTargetType === 'after'}
                                            <div class="absolute bottom-0 left-0 right-0 h-1 bg-theme-500 z-10 drop-indicator-line"></div>
                                        {/if}
                                    {/if}
                                    
                                    <div class="flex-1">
                                        <div class="font-medium text-sm text-light-text dark:text-dark-text">{action.name}</div>
                                        <div class="text-xs text-light-text-muted dark:text-dark-text-muted">
                                            {#each action.params as param}
                                                {#if shouldShowParam(param, action)}
                                                    <span class="mr-2">{param.name}: {formatParamValue(param)}</span>
                                                {/if}
                                            {/each}
                                        </div>
                                    </div>
                                    <div class="flex items-center space-x-1">
                                        <button 
                                            class="p-1 text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 dark:hover:text-theme-400"
                                            on:click={() => editItem(action, 'action', i)}
                                        >
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button 
                                            class="p-1 text-light-text-muted dark:text-dark-text-muted hover:text-red-500 dark:hover:text-red-400"
                                            on:click={() => removeItem('action', i)}
                                        >
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            </div>
            
            <!-- Nested Command Containers -->
            {#if container.children && container.children.length > 0}
                <div class="mt-4 border-t border-light-border dark:border-dark-border pt-4">
                    {#each container.children as childContainer, childIndex}
                        <div 
                            class="relative child-container-wrapper"
                            draggable="true"
                            on:dragstart={(e) => {
                                e.stopPropagation();
                                dispatch('childDragStart', { 
                                    parentIndex: index,
                                    childIndex: childIndex,
                                    container: childContainer
                                });
                            }}
                            on:dragend={(e) => {
                                e.stopPropagation();
                                dispatch('dragend');
                            }}
                        >
                            <svelte:self 
                                container={childContainer}
                                index={childIndex}
                                nestingLevel={nestingLevel + 1}
                                on:update={handleChildUpdate}
                                on:remove={handleChildRemove}
                                on:dragstart
                                on:dragend
                                on:externaldrop
                                on:childDragStart
                            />
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    {/if}
</div>

<!-- Item Editor Modal -->
{#if showItemEditor}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
                                    class="w-full p-2 rounded-md bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                                    bind:value={param.value}
                                />
                            {:else if param.type === 'text'}
                                <input 
                                    type="text" 
                                    class="w-full p-2 rounded-md bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                                    bind:value={param.value}
                                />
                            {:else if param.type === 'time'}
                                <input 
                                    type="time" 
                                    class="w-full p-2 rounded-md bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                                    bind:value={param.value}
                                />
                            {:else if param.type === 'select'}
                                <select 
                                    class="w-full p-2 rounded-md bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
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

<style>
    .condition-item, .action-item {
        position: relative;
        cursor: grab;
    }
    
    .condition-item:active, .action-item:active {
        cursor: grabbing;
    }
    
    .droppable-area {
        min-height: 60px;
    }
    
    .drop-indicator-line {
        pointer-events: none;
        animation: pulse 1.5s infinite;
    }
    
    @keyframes pulse {
        0% { opacity: 0.6; }
        50% { opacity: 1; }
        100% { opacity: 0.6; }
    }
</style> 