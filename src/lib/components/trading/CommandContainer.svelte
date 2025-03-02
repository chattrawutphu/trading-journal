<script>
    import { createEventDispatcher, onMount } from 'svelte';
    import Button from '$lib/components/common/Button.svelte';
    import Modal from '$lib/components/common/Modal.svelte';
    
    const dispatch = createEventDispatcher();
    
    // Props
    export let container = {
        id: '',
        name: 'Command Group',
        conditions: [],
        conditionOperators: [],
        actions: [],
        children: [],
        disabled: false,
        containerType: 'IF',  // Default container type (IF, ELSE_IF, ELSE)
        comment: ''           // Container comment
    };
    export let index = 0;
    export let isExpanded = true;
    export let nestingLevel = 0;
    
    // Config modal state
    let showConfigModal = false;
    let tempConfig = {
        name: container.name,
        containerType: container.containerType || 'IF',
        comment: container.comment || ''
    };
    
    // Available conditions and actions for dropdown
    const availableConditions = [
        { 
            id: 'price_above', 
            name: 'Price Above', 
            description: 'Executes when the current price rises above the specified value',
            params: [{ name: 'value', type: 'number', default: 0 }] 
        },
        { 
            id: 'price_below', 
            name: 'Price Below', 
            description: 'Executes when the current price falls below the specified value',
            params: [{ name: 'value', type: 'number', default: 0 }] 
        },
        { 
            id: 'ema_crossover', 
            name: 'EMA Crossover', 
            description: 'Detects when the faster EMA crosses above the slower EMA (bullish signal)',
            params: [
            { name: 'fast_period', type: 'number', default: 9 },
            { name: 'slow_period', type: 'number', default: 21 }
            ]
        },
        { 
            id: 'ema_crossunder', 
            name: 'EMA Crossunder', 
            description: 'Detects when the faster EMA crosses below the slower EMA (bearish signal)',
            params: [
                { name: 'fast_period', type: 'number', default: 9 },
                { name: 'slow_period', type: 'number', default: 21 }
            ]
        },
        { 
            id: 'rsi_above', 
            name: 'RSI Above', 
            description: 'Triggers when RSI rises above the threshold (potential overbought condition)',
            params: [
            { name: 'period', type: 'number', default: 14 },
            { name: 'value', type: 'number', default: 70 }
            ]
        },
        { 
            id: 'rsi_below', 
            name: 'RSI Below', 
            description: 'Triggers when RSI falls below the threshold (potential oversold condition)',
            params: [
            { name: 'period', type: 'number', default: 14 },
            { name: 'value', type: 'number', default: 30 }
            ]
        },
        { 
            id: 'macd_crossover', 
            name: 'MACD Crossover', 
            description: 'Detects when the MACD line crosses above the signal line (bullish signal)',
            params: [
                { name: 'fast_period', type: 'number', default: 12 },
                { name: 'slow_period', type: 'number', default: 26 },
                { name: 'signal_period', type: 'number', default: 9 }
            ]
        },
        { 
            id: 'macd_crossunder', 
            name: 'MACD Crossunder', 
            description: 'Detects when the MACD line crosses below the signal line (bearish signal)',
            params: [
                { name: 'fast_period', type: 'number', default: 12 },
                { name: 'slow_period', type: 'number', default: 26 },
                { name: 'signal_period', type: 'number', default: 9 }
            ]
        },
        { 
            id: 'volume_spike', 
            name: 'Volume Spike', 
            description: 'Triggers when volume exceeds average volume by the specified multiplier',
            params: [
            { name: 'multiplier', type: 'number', default: 2 }
            ]
        },
        { 
            id: 'bollinger_upper_touch', 
            name: 'Price Touches Upper Bollinger', 
            description: 'Executes when price touches or exceeds the upper Bollinger Band (potential resistance)',
            params: [
                { name: 'period', type: 'number', default: 20 },
                { name: 'std_dev', type: 'number', default: 2 }
            ]
        },
        { 
            id: 'bollinger_lower_touch', 
            name: 'Price Touches Lower Bollinger', 
            description: 'Executes when price touches or falls below the lower Bollinger Band (potential support)',
            params: [
                { name: 'period', type: 'number', default: 20 },
                { name: 'std_dev', type: 'number', default: 2 }
            ]
        },
        { 
            id: 'price_percent_change', 
            name: 'Price % Change', 
            description: 'Triggers when price changes by the specified percentage within the timeframe',
            params: [
                { name: 'percent', type: 'number', default: 5 },
                { name: 'direction', type: 'select', options: ['Up', 'Down', 'Either'], default: 'Either' },
                { name: 'timeframe_hours', type: 'number', default: 24 }
            ]
        },
        { 
            id: 'stoch_rsi_overbought', 
            name: 'Stochastic RSI Overbought', 
            description: 'Triggers when Stochastic RSI is in overbought territory',
            params: [
                { name: 'k_period', type: 'number', default: 3 },
                { name: 'rsi_period', type: 'number', default: 14 },
                { name: 'stoch_period', type: 'number', default: 14 },
                { name: 'threshold', type: 'number', default: 80 }
            ]
        },
        { 
            id: 'stoch_rsi_oversold', 
            name: 'Stochastic RSI Oversold', 
            description: 'Triggers when Stochastic RSI is in oversold territory',
            params: [
                { name: 'k_period', type: 'number', default: 3 },
                { name: 'rsi_period', type: 'number', default: 14 },
                { name: 'stoch_period', type: 'number', default: 14 },
                { name: 'threshold', type: 'number', default: 20 }
            ]
        },
        { 
            id: 'time_of_day', 
            name: 'Time of Day', 
            description: 'Executes when the current time is within the specified range',
            params: [
            { name: 'start_time', type: 'time', default: '09:00' },
            { name: 'end_time', type: 'time', default: '16:00' }
            ]
        },
        { 
            id: 'funding_rate_above', 
            name: 'Funding Rate Above', 
            description: 'Triggers when the funding rate of a perpetual contract exceeds the specified value',
            params: [
                { name: 'value', type: 'number', default: 0.01 }
            ]
        },
        { 
            id: 'funding_rate_below', 
            name: 'Funding Rate Below', 
            description: 'Triggers when the funding rate of a perpetual contract falls below the specified value',
            params: [
                { name: 'value', type: 'number', default: -0.01 }
            ]
        },
        { 
            id: 'liquidation_spike', 
            name: 'Liquidation Spike', 
            description: 'Detects a significant increase in liquidations on the exchange',
            params: [
                { name: 'threshold_usd', type: 'number', default: 1000000 }
            ]
        }
    ];
    
    const availableActions = [
        { 
            id: 'buy_market', 
            name: 'Buy Market', 
            description: 'Places a market buy order for the specified amount',
            params: [
            { name: 'amount', type: 'number', default: 0 },
            { name: 'amount_type', type: 'select', options: ['USD', '%'], default: 'USD' }
            ]
        },
        { 
            id: 'sell_market', 
            name: 'Sell Market', 
            description: 'Places a market sell order for the specified amount',
            params: [
            { name: 'amount', type: 'number', default: 0 },
            { name: 'amount_type', type: 'select', options: ['USD', '%'], default: 'USD' }
            ]
        },
        { 
            id: 'buy_limit', 
            name: 'Buy Limit', 
            description: 'Places a limit buy order at the specified price and amount',
            params: [
            { name: 'price', type: 'number', default: 0 },
            { name: 'amount', type: 'number', default: 0 },
            { name: 'amount_type', type: 'select', options: ['USD', '%'], default: 'USD' }
            ]
        },
        { 
            id: 'sell_limit', 
            name: 'Sell Limit', 
            description: 'Places a limit sell order at the specified price and amount',
            params: [
            { name: 'price', type: 'number', default: 0 },
            { name: 'amount', type: 'number', default: 0 },
            { name: 'amount_type', type: 'select', options: ['USD', '%'], default: 'USD' }
            ]
        },
        { 
            id: 'set_stop_loss', 
            name: 'Set Stop Loss', 
            description: 'Creates a stop-loss order to limit potential losses',
            params: [
            { name: 'price', type: 'number', default: 0 },
            { name: 'type', type: 'select', options: ['Fixed', 'Trailing'], default: 'Fixed' },
            { name: 'trail_percent', type: 'number', default: 1, showIf: { field: 'type', value: 'Trailing' } }
            ]
        },
        { 
            id: 'set_take_profit', 
            name: 'Set Take Profit', 
            description: 'Creates a take-profit order to secure gains at the specified price',
            params: [
            { name: 'price', type: 'number', default: 0 }
            ]
        },
        { 
            id: 'dca_buy', 
            name: 'DCA Buy', 
            description: 'Implements a Dollar-Cost Averaging strategy for buying',
            params: [
                { name: 'amount', type: 'number', default: 0 },
                { name: 'interval_hours', type: 'number', default: 24 },
                { name: 'total_orders', type: 'number', default: 5 }
            ]
        },
        { 
            id: 'scaled_entry', 
            name: 'Scaled Entry', 
            description: 'Places multiple buy orders at different price levels',
            params: [
                { name: 'start_price', type: 'number', default: 0 },
                { name: 'end_price', type: 'number', default: 0 },
                { name: 'orders_count', type: 'number', default: 5 },
                { name: 'total_amount', type: 'number', default: 0 },
                { name: 'amount_type', type: 'select', options: ['USD', '%'], default: 'USD' }
            ]
        },
        { 
            id: 'scaled_exit', 
            name: 'Scaled Exit', 
            description: 'Places multiple sell orders at different price levels',
            params: [
                { name: 'start_price', type: 'number', default: 0 },
                { name: 'end_price', type: 'number', default: 0 },
                { name: 'orders_count', type: 'number', default: 5 },
                { name: 'total_amount', type: 'number', default: 0 },
                { name: 'amount_type', type: 'select', options: ['USD', '%'], default: 'USD' }
            ]
        },
        { 
            id: 'send_notification', 
            name: 'Send Notification', 
            description: 'Sends a custom notification with the specified message',
            params: [
            { name: 'message', type: 'text', default: '' }
            ]
        },
        { 
            id: 'cancel_all_orders', 
            name: 'Cancel All Orders', 
            description: 'Cancels all open orders for the current symbol',
            params: []
        },
        { 
            id: 'hedge_position', 
            name: 'Hedge Position', 
            description: 'Creates a hedge against current position by opening an opposite position',
            params: [
                { name: 'percentage', type: 'number', default: 100 },
                { name: 'market', type: 'select', options: ['Same', 'Futures', 'Options'], default: 'Same' }
            ]
        },
        { 
            id: 'rebalance_portfolio', 
            name: 'Rebalance Portfolio', 
            description: 'Rebalances your portfolio according to preset allocations',
            params: [
                { name: 'threshold_percent', type: 'number', default: 5 }
            ]
        }
    ];
    
    // Local state
    let editingItem = null;
    let editingItemType = null;
    let editingItemIndex = -1;
    let showItemEditor = false;
    
    function getConditionDefinition(conditionId) {
        return availableConditions.find(c => c.id === conditionId.split('_')[0]);
    }
    
    function getActionDefinition(actionId) {
        return availableActions.find(a => a.id === actionId.split('_')[0]);
    }
    
    // Initialize conditionOperators if they don't exist
    if (!container.conditionOperators && container.conditions.length > 0) {
        container.conditionOperators = Array(Math.max(0, container.conditions.length - 1)).fill('AND');
        dispatch('update', { index, container });
    }
    
    // Toggle container expansion
    function toggleExpand() {
        isExpanded = !isExpanded;
    }
    
    // Add condition
    function addCondition() {
        // Show a modal to select a condition
        dispatch('selectcondition', { containerIndex: index });
    }
    
    // Add action
    function addAction() {
        // Show a modal to select an action
        dispatch('selectaction', { containerIndex: index });
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
            children: [],
            containerType: 'IF',
            disabled: false,
            comment: ''
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
    
    // Toggle operator between AND/OR
    function toggleOperator(operatorIndex) {
        if (!container.conditionOperators) {
            container.conditionOperators = Array(Math.max(0, container.conditions.length - 1)).fill('AND');
        }
        
        container.conditionOperators[operatorIndex] = 
            container.conditionOperators[operatorIndex] === 'AND' ? 'OR' : 'AND';
            
        dispatch('update', { index, container });
    }
    
    // Update operators array when conditions change
    $: {
        if (container.conditions && container.conditions.length > 0) {
            // Ensure we have the right number of operators
            if (!container.conditionOperators) {
                container.conditionOperators = Array(Math.max(0, container.conditions.length - 1)).fill('AND');
            } else if (container.conditionOperators.length < container.conditions.length - 1) {
                // Add more operators if needed
                const additionalOperators = Array(container.conditions.length - 1 - container.conditionOperators.length).fill('AND');
                container.conditionOperators = [...container.conditionOperators, ...additionalOperators];
            } else if (container.conditionOperators.length > container.conditions.length - 1) {
                // Remove excess operators
                container.conditionOperators = container.conditionOperators.slice(0, container.conditions.length - 1);
            }
        }
    }
    
    // Toggle NOT for a condition
    function toggleNot(conditionIndex) {
        container.conditions[conditionIndex].not = !container.conditions[conditionIndex].not;
        dispatch('update', { index, container });
    }
    
    // Toggle disabled for a condition
    function toggleDisabled(type, index) {
        if (type === 'condition') {
            container.conditions[index].disabled = !container.conditions[index].disabled;
        } else {
            container.actions[index].disabled = !container.actions[index].disabled;
        }
        dispatch('update', { index, container });
    }
    
    // Toggle container disabled state
    function toggleContainerDisabled() {
        container.disabled = !container.disabled;
        dispatch('update', { index, container });
    }
    
    // Save container configuration
    function saveContainerConfig() {
        container.name = tempConfig.name;
        container.containerType = tempConfig.containerType;
        container.comment = tempConfig.comment;
        
        dispatch('update', { index, container });
        showConfigModal = false;
    }
    
    // Open configuration modal
    function openConfigModal() {
        tempConfig = {
            name: container.name,
            containerType: container.containerType || 'IF',
            comment: container.comment || ''
        };
        showConfigModal = true;
    }
    
    onMount(() => {
        // Empty onMount since we removed the event listeners
    });
</script>

<div class="command-container bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg mb-4 {container.disabled ? 'opacity-75' : ''} 
    {container.containerType === 'IF' ? 'if-container' : 
     container.containerType === 'ELSE_IF' ? 'else-if-container' : 
     container.containerType === 'ELSE' ? 'else-container' : ''}"
    style="margin-left: {nestingLevel * 1.5}rem">
    <!-- Logic flow connector -->
    {#if container.containerType === 'ELSE_IF' || container.containerType === 'ELSE'}
        <div class="logic-connector 
            {container.containerType === 'ELSE_IF' ? 'bg-purple-400 dark:bg-purple-600' : 'bg-green-400 dark:bg-green-600'}">
        </div>
    {/if}
    
    <!-- Header -->
    <div class="p-3 border-b border-light-border dark:border-dark-border flex justify-between items-center
        {container.containerType === 'IF' ? 'bg-blue-100 dark:bg-blue-900/30' : 
        container.containerType === 'ELSE_IF' ? 'bg-purple-100 dark:bg-purple-900/30' : 
        container.containerType === 'ELSE' ? 'bg-green-100 dark:bg-green-900/30' : 
        'bg-light-hover dark:bg-dark-hover'}">
        <div class="flex items-center gap-2">
            <button 
                class="p-1 text-light-text dark:text-dark-text hover:text-theme-500 dark:hover:text-theme-400"
                on:click={toggleExpand}
            >
                <svg class="w-5 h-5 transform transition-transform {isExpanded ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
            </button>
            <!-- Container Type Badge -->
            <div class="px-3 py-1 rounded-md text-sm font-medium shadow-sm
                {container.containerType === 'IF' ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200' : 
                container.containerType === 'ELSE_IF' ? 'bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200' : 
                'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200'}">
                {#if container.containerType === 'IF'}
                    <div class="flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        IF
                    </div>
                {:else if container.containerType === 'ELSE_IF'}
                    <div class="flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        ELSE IF
                    </div>
                {:else}
                    <div class="flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        ELSE
                    </div>
                {/if}
            </div>
            <span class="font-medium text-light-text dark:text-dark-text {container.disabled ? 'line-through text-red-500 dark:text-red-400' : ''}">
                {container.name || 'Command Group'}
            </span>
        </div>
        <div class="flex items-center gap-2">
            <!-- Config button -->
            <button
                class="p-1 text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 dark:hover:text-theme-400"
                on:click={openConfigModal}
                title="Configure"
            >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>
            <button
                class="p-1 rounded-md {container.disabled ? 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400' : 'text-light-text-muted dark:text-dark-text-muted hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'}"
                on:click={toggleContainerDisabled}
                title={container.disabled ? "Enable container" : "Disable container"}
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
            </button>
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
    
    <!-- Comment display if exists -->
    {#if container.comment}
        <div class="px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/10 text-xs text-yellow-700 dark:text-yellow-300 border-b border-yellow-100 dark:border-yellow-900/50 italic">
            {container.comment}
        </div>
    {/if}
    
    <!-- Content -->
    {#if isExpanded}
        <div class="p-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Left Side: Conditions Section -->
                <div>
                    <div class="flex justify-between items-center mb-2">
                        <h3 class="text-sm font-medium text-light-text dark:text-dark-text">
                            {#if container.containerType === 'IF' || container.containerType === 'ELSE_IF'}
                                Conditions {#if container.containerType === 'IF'}<span class="text-blue-600 dark:text-blue-400">IF</span>{:else}<span class="text-purple-600 dark:text-purple-400">ELSE IF</span>{/if}
                            {:else}
                                <span class="text-green-600 dark:text-green-400">ELSE</span> (executes if none of the above match)
                            {/if}
                        </h3>
                        <div class="relative">
                            <button 
                                class="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                                on:click={addCondition}
                            >
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Add Condition
                            </button>
                        </div>
                    </div>
                    
                    {#if container.conditions.length === 0}
                        <div class="p-3 border border-dashed border-light-border dark:border-dark-border rounded-md text-center text-light-text-muted dark:text-dark-text-muted text-sm">
                            No conditions added. Click "Add Condition" to add one.
                        </div>
                    {:else}
                        <div class="space-y-2 conditions-container relative">
                            {#each container.conditions as condition, i}
                                <div class="relative {i > 0 ? 'mt-1' : ''}">
                                    <!-- Logical operator between conditions -->
                                    {#if i > 0 && container.conditionOperators}
                                        <div class="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10 logical-operator-container">
                                            <button 
                                                class="logical-operator {container.conditionOperators[i-1] === 'AND' ? 'operator-and' : 'operator-or'} shadow-sm"
                                                on:click={() => toggleOperator(i-1)}
                                                title="Click to toggle operator"
                                            >
                                                {container.conditionOperators[i-1]}
                                            </button>
                                        </div>
                                    {/if}
                                    
                                    <div class="p-0 {condition.not ? 'bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/30 border-purple-200 dark:border-purple-800' : 'bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30 border-blue-200 dark:border-blue-800'} border rounded-lg shadow-sm flex justify-between items-stretch relative condition-item overflow-hidden">
                                        <!-- Left color indicator -->
                                        <div class="w-1.5 {condition.not ? 'bg-purple-400 dark:bg-purple-500' : 'bg-blue-400 dark:bg-blue-500'}"></div>
                                        
                                        <!-- Content with status indicators -->
                                        <div class="flex-1 p-3 {condition.disabled || container.disabled ? 'opacity-60' : ''}">
                                            <div class="font-medium text-sm text-light-text dark:text-dark-text flex items-center">
                                                <!-- Icon indicator -->
                                                <svg class="w-4 h-4 mr-1.5 {condition.not ? 'text-purple-500 dark:text-purple-400' : 'text-blue-500 dark:text-blue-400'}" 
                                                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                </svg>
                                                
                                                <!-- NOT badge -->
                                                {#if condition.not}
                                                    <span class="inline-flex items-center justify-center px-2 py-0.5 mr-1.5 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200">NOT</span>
                                                {/if}
                                                
                                                <!-- Condition name -->
                                                <span class="{condition.disabled || container.disabled ? 'line-through text-red-500 dark:text-red-400' : ''}">{condition.name}</span>
                                            </div>
                                            
                                            <!-- Description text -->
                                            {#if getConditionDefinition(condition.id)?.description}
                                                <div class="mt-1 text-xs text-light-text-muted dark:text-dark-text-muted italic {condition.disabled || container.disabled ? 'line-through text-red-400/80 dark:text-red-300/80' : ''}">
                                                    {getConditionDefinition(condition.id).description}
                                                </div>
                                            {/if}
                                            
                                            <!-- Parameters -->
                                            <div class="mt-1 text-xs text-light-text-muted dark:text-dark-text-muted {condition.disabled || container.disabled ? 'line-through text-red-400 dark:text-red-300' : ''}">
                                                {#each condition.params as param}
                                                    {#if shouldShowParam(param, condition)}
                                                        <span class="inline-flex items-center mr-2 px-1.5 py-0.5 rounded-md bg-light-hover/50 dark:bg-dark-hover/50">
                                                            <span class="font-medium mr-1">{param.name}:</span> {formatParamValue(param)}
                                                        </span>
                                                    {/if}
                                                {/each}
                                            </div>
                                        </div>
                                        
                                        <!-- Replace menu button with icon menu on hover -->
                                        <div class="condition-actions opacity-0 transition-opacity duration-200 ease-in-out flex items-center pr-2">
                                            <!-- Not toggle -->
                                            <button 
                                                class="p-1.5 rounded-md text-light-text-muted dark:text-dark-text-muted hover:text-purple-500 dark:hover:text-purple-400 hover:bg-light-hover dark:hover:bg-dark-hover"
                                                on:click|stopPropagation={() => toggleNot(i)}
                                                title={condition.not ? "Remove NOT" : "Add NOT"}
                                                            >
                                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                                    {#if condition.not}
                                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636" />
                                                                    {/if}
                                                                </svg>
                                                            </button>
                                            
                                            <!-- Disable toggle -->
                                                            <button 
                                                class="p-1.5 rounded-md text-light-text-muted dark:text-dark-text-muted hover:text-red-500 dark:hover:text-red-400 hover:bg-light-hover dark:hover:bg-dark-hover"
                                                on:click|stopPropagation={() => toggleDisabled('condition', i)}
                                                title={condition.disabled ? "Enable" : "Disable"}
                                                            >
                                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                                </svg>
                                                            </button>
                                            
                                            <!-- Edit -->
                                                            <button 
                                                class="p-1.5 rounded-md text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 dark:hover:text-theme-400 hover:bg-light-hover dark:hover:bg-dark-hover"
                                                on:click|stopPropagation={() => editItem(condition, 'condition', i)}
                                                title="Edit"
                                                            >
                                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                            </button>
                                            
                                            <!-- Delete -->
                                                            <button 
                                                class="p-1.5 rounded-md text-light-text-muted dark:text-dark-text-muted hover:text-red-500 dark:hover:text-red-400 hover:bg-light-hover dark:hover:bg-dark-hover"
                                                on:click|stopPropagation={() => removeItem('condition', i)}
                                                title="Delete"
                                                            >
                                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                        </div>
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
                                on:click={addAction}
                            >
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Add Action
                            </button>
                        </div>
                    </div>
                    
                    {#if container.actions.length === 0}
                        <div class="p-3 border border-dashed border-light-border dark:border-dark-border rounded-md text-center text-light-text-muted dark:text-dark-text-muted text-sm">
                            No actions added. Click "Add Action" to add one.
                        </div>
                    {:else}
                        <div class="space-y-2 actions-container">
                            {#each container.actions as action, i}
                                <div class="p-0 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30 border border-green-200 dark:border-green-800 rounded-lg shadow-sm flex justify-between items-stretch relative action-item overflow-hidden">
                                    <!-- Left color indicator -->
                                    <div class="w-1.5 bg-green-400 dark:bg-green-500"></div>
                                    
                                    <!-- Content with status indicators -->
                                    <div class="flex-1 p-3 {action.disabled || container.disabled ? 'opacity-60' : ''}">
                                        <div class="font-medium text-sm text-light-text dark:text-dark-text flex items-center">
                                            <!-- Icon indicator -->
                                            <svg class="w-4 h-4 mr-1.5 text-green-500 dark:text-green-400" 
                                                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                                      d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            
                                            <!-- Action name -->
                                            <span class="{action.disabled || container.disabled ? 'line-through text-red-500 dark:text-red-400' : ''}">{action.name}</span>
                                        </div>
                                        
                                        <!-- Description text -->
                                        {#if getActionDefinition(action.id)?.description}
                                            <div class="mt-1 text-xs text-light-text-muted dark:text-dark-text-muted italic {action.disabled || container.disabled ? 'line-through text-red-400/80 dark:text-red-300/80' : ''}">
                                                {getActionDefinition(action.id).description}
                                            </div>
                                        {/if}
                                        
                                        <!-- Parameters -->
                                        <div class="mt-1 text-xs text-light-text-muted dark:text-dark-text-muted {action.disabled || container.disabled ? 'line-through text-red-400 dark:text-red-300' : ''}">
                                            {#each action.params as param}
                                                {#if shouldShowParam(param, action)}
                                                    <span class="inline-flex items-center mr-2 px-1.5 py-0.5 rounded-md bg-light-hover/50 dark:bg-dark-hover/50">
                                                        <span class="font-medium mr-1">{param.name}:</span> {formatParamValue(param)}
                                                    </span>
                                                {/if}
                                            {/each}
                                        </div>
                                    </div>
                                    
                                    <!-- Replace menu button with icon menu on hover -->
                                    <div class="action-actions opacity-0 transition-opacity duration-200 ease-in-out flex items-center pr-2">
                                        <!-- Disable toggle -->
                                        <button 
                                            class="p-1.5 rounded-md text-light-text-muted dark:text-dark-text-muted hover:text-red-500 dark:hover:text-red-400 hover:bg-light-hover dark:hover:bg-dark-hover"
                                            on:click|stopPropagation={() => toggleDisabled('action', i)}
                                            title={action.disabled ? "Enable" : "Disable"}
                                        >
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                            </svg>
                                        </button>
                                        
                                        <!-- Edit -->
                                                        <button 
                                            class="p-1.5 rounded-md text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 dark:hover:text-theme-400 hover:bg-light-hover dark:hover:bg-dark-hover"
                                            on:click|stopPropagation={() => editItem(action, 'action', i)}
                                            title="Edit"
                                                        >
                                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                        
                                        <!-- Delete -->
                                                        <button 
                                            class="p-1.5 rounded-md text-light-text-muted dark:text-dark-text-muted hover:text-red-500 dark:hover:text-red-400 hover:bg-light-hover dark:hover:bg-dark-hover"
                                            on:click|stopPropagation={() => removeItem('action', i)}
                                            title="Delete"
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
                        <div class="relative child-container-wrapper">
                            <svelte:self 
                                container={childContainer}
                                index={childIndex}
                                nestingLevel={nestingLevel + 1}
                                on:update={handleChildUpdate}
                                on:remove={handleChildRemove}
                                on:selectcondition
                                on:selectaction
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

<!-- Config Modal -->
{#if showConfigModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-light-card dark:bg-dark-card rounded-lg shadow-xl w-full max-w-md p-4 max-h-[90vh] overflow-y-auto">
            <h3 class="text-xl font-semibold text-light-text dark:text-dark-text mb-4">
                Configure Container
            </h3>
            
            <div class="space-y-4">
                <!-- Container Name -->
                <div class="form-group">
                    <label class="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                        Container Name
                    </label>
                    <input 
                        type="text" 
                        class="w-full p-2 rounded-md bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                        bind:value={tempConfig.name}
                        placeholder="Command Group"
                    />
                </div>
                
                <!-- Container Type -->
                <div class="form-group">
                    <label class="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                        Container Type
                    </label>
                    <div class="grid grid-cols-3 gap-2">
                        <button 
                            class="p-2 rounded-md text-center text-sm font-medium {tempConfig.containerType === 'IF' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700' : 'bg-light-hover dark:bg-dark-hover text-light-text-muted dark:text-dark-text-muted border border-light-border dark:border-dark-border'}"
                            on:click={() => tempConfig.containerType = 'IF'}
                        >
                            IF
                        </button>
                        <button 
                            class="p-2 rounded-md text-center text-sm font-medium {tempConfig.containerType === 'ELSE_IF' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700' : 'bg-light-hover dark:bg-dark-hover text-light-text-muted dark:text-dark-text-muted border border-light-border dark:border-dark-border'}"
                            on:click={() => tempConfig.containerType = 'ELSE_IF'}
                        >
                            ELSE IF
                        </button>
                        <button 
                            class="p-2 rounded-md text-center text-sm font-medium {tempConfig.containerType === 'ELSE' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700' : 'bg-light-hover dark:bg-dark-hover text-light-text-muted dark:text-dark-text-muted border border-light-border dark:border-dark-border'}"
                            on:click={() => tempConfig.containerType = 'ELSE'}
                        >
                            ELSE
                        </button>
                    </div>
                </div>
                
                <!-- Container Comment -->
                <div class="form-group">
                    <label class="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                        Comment
                    </label>
                    <textarea 
                        class="w-full p-2 rounded-md bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                        bind:value={tempConfig.comment}
                        rows="3"
                        placeholder="Add a comment about this container..."
                    ></textarea>
                </div>
            </div>
            
            <div class="flex justify-end space-x-2 mt-6">
                <Button variant="secondary" size="sm" on:click={() => showConfigModal = false}>
                    Cancel
                </Button>
                <Button variant="primary" size="sm" on:click={saveContainerConfig}>
                    Save
                </Button>
            </div>
        </div>
    </div>
{/if}

<style>
    .command-container-wrapper {
        position: relative;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    
    .command-container-wrapper:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .child-container-wrapper {
        position: relative;
    }
    
    .logical-operator {
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
        transition: all 0.2s ease;
    }
    
    .operator-and {
        background-color: #e0f2fe;
        color: #0369a1;
        border: 1px solid #7dd3fc;
    }
    
    .operator-or {
        background-color: #fae8ff;
        color: #a855f7;
        border: 1px solid #d8b4fe;
    }
    
    .operator-and:hover {
        background-color: #bae6fd;
    }
    
    .operator-or:hover {
        background-color: #f0abfc;
    }
    
    .logic-connector {
        position: absolute;
        left: -1.5rem;
        top: 0;
        bottom: 0;
        width: 2px;
    }
    
    .logic-connector::before {
        content: '';
        position: absolute;
        left: 0;
        top: -15px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
    }
    
    .if-container {
        border-left: 3px solid #60a5fa;
    }
    
    .else-if-container {
        border-left: 3px solid #c084fc;
    }
    
    .else-container {
        border-left: 3px solid #4ade80;
    }
    
    .condition-item:hover .condition-actions,
    .action-item:hover .action-actions {
        opacity: 1;
    }
</style> 