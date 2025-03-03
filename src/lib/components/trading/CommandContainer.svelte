<script>
    import { createEventDispatcher, onMount, onDestroy, tick, afterUpdate } from 'svelte';
    import { fade, slide, fly } from 'svelte/transition';
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
    // Add sibling containers to check valid container position
    export let siblingContainers = [];
    
    // Config modal state
    let showConfigModal = false;
    let tempConfig = {
        name: container.name,
        containerType: container.containerType || 'IF',
        comment: container.comment || ''
    };
    
    // Check if container position is valid based on container type
    $: isValidContainerPosition = checkValidContainerPosition();
    
    // Function to check if the container is in a valid position based on its type
    function checkValidContainerPosition() {
        // IF is always valid
        if (container.containerType === 'IF') return true;
        
        // If this is a child container or at index 0, it should be IF
        if (index === 0) return false;
        
        // For ELSE_IF and ELSE, check if there is an IF container before it
        if (container.containerType === 'ELSE_IF' || container.containerType === 'ELSE') {
            // Check sibling containers if provided
            if (siblingContainers && siblingContainers.length > 0) {
                const hasIfBefore = siblingContainers.some((c, i) => 
                    i < index && (c.containerType === 'IF' || c.containerType === 'ELSE_IF')
                );
                return hasIfBefore;
            } else {
                // If no sibling containers provided, assume it's valid (no validation)
                return true;
            }
        }
        
        return true;
    }
    
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
    
    // Add state for contextual help
    let showContextualHelp = false;
    let helpContext = null;
    
    // Add state for dropdowns
    let containerMenuOpen = false;
    let conditionMenuOpen = [];
    let actionMenuOpen = [];
    
    // Add a reference to store the active dropdown type and index
    let activeDropdown = { type: null, index: -1 };
    
    // Add this to your existing props
    export let parentId = null; // Parent container ID
    
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
        dispatch('remove', { index, container });
    }
    
    // Add child container
    function addChildContainer() {
        if (!container.children) {
            container.children = [];
        }
        
        // Create IF container
        const ifContainer = {
            id: `container_if_${Date.now()}`,
            name: 'Command Group',
            conditions: [],
            actions: [],
            children: [],
            containerType: 'IF',
            disabled: false,
            comment: ''
        };
        
        // Create ELSE container
        const elseContainer = {
            id: `container_else_${Date.now()}`,
            name: 'Default Actions',
            conditions: [],
            actions: [],
            children: [],
            containerType: 'ELSE',
            disabled: false,
            comment: '',
            parentIfId: ifContainer.id // Reference to parent IF container
        };
        
        // Add both containers
        container.children = [...container.children, ifContainer, elseContainer];
        
        // ต้องขยายให็นหลังจากเพิ่ม child
        isExpanded = true;
        
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
    
    // Add an ELSE_IF container after the specified container index
    function addElseIfContainer(ifContainer, afterIndex) {
        // Create ELSE_IF container
        const elseIfContainer = {
            id: `container_elseif_${Date.now()}`,
            name: 'Additional Condition',
            conditions: [],
            actions: [],
            children: [],
            containerType: 'ELSE_IF',
            disabled: false,
            comment: '',
            parentIfId: ifContainer.id // Reference to parent IF container
        };
        
        // Insert ELSE_IF container at the correct position (after the specified index)
        container.children.splice(afterIndex + 1, 0, elseIfContainer);
        
        // Update parent container
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
    
    // Function to show contextual help
    function showHelp(context) {
        helpContext = context;
        showContextualHelp = true;
    }
    
    // Function to close all dropdowns
    function closeAllDropdowns() {
        containerMenuOpen = false;
        conditionMenuOpen = conditionMenuOpen.map(() => false);
        actionMenuOpen = actionMenuOpen.map(() => false);
        activeDropdown = { type: null, index: -1 };
    }
    
    // Function to toggle a specific dropdown
    function toggleDropdown(type, index = -1) {
        // If this dropdown is already open, close it
        if (activeDropdown.type === type && activeDropdown.index === index) {
            closeAllDropdowns();
            return;
        }
        
        // Close all open dropdowns
        closeAllDropdowns();
        
        // Open the requested dropdown
        if (type === 'container') {
            containerMenuOpen = true;
        } else if (type === 'condition') {
            conditionMenuOpen[index] = true;
        } else if (type === 'action') {
            actionMenuOpen[index] = true;
        }
        
        // Update active dropdown reference
        activeDropdown = { type, index };
    }
    
    // Handle scroll event to close dropdowns
    function handleScroll() {
        closeAllDropdowns();
    }
    
    // Handle document clicks to close dropdowns when clicking outside
    function handleDocumentClick(event) {
        // Don't close if clicking inside an open dropdown or on its toggle button
        const clickedOnDropdownContent = event.target.closest('.dropdown-menu');
        const clickedOnDropdownToggle = event.target.closest('.dropdown-toggle');
        
        if (!clickedOnDropdownContent && !clickedOnDropdownToggle) {
            closeAllDropdowns();
        }
    }
    
    // Set up and clean up event handlers
    onMount(() => {
        window.addEventListener('scroll', handleScroll, true);
        document.addEventListener('click', handleDocumentClick);
        
        // Setup intersection observer for mini-map visibility tracking
        observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    isInViewport = entry.isIntersecting;
                    if (isInViewport) {
                        dispatch('containervisible', { id: container.id, isVisible: true });
                    } else {
                        dispatch('containervisible', { id: container.id, isVisible: false });
                    }
                });
            },
            { threshold: 0.1 } // 10% visibility threshold
        );
        
        if (containerRef) {
            observer.observe(containerRef);
        }
        
        // Register this container for the mini-map
        registerContainer(container.id, nestingLevel, container.containerType, container.name);
        
        // Register observer for this container
        if (containerRef) {
            observer.observe(containerRef);
        }
        
        // Register this container with parent reference
        registerContainer(container.id, nestingLevel, container.containerType, container.name);
        
        // If this container has children, ensure they're properly registered
        if (container.children && container.children.length > 0) {
            container.children.forEach(child => {
                dispatch('childcontainer', { 
                    childId: child.id, 
                    parentId: container.id,
                    level: nestingLevel + 1,
                    type: child.containerType,
                    name: child.name
                });
            });
        }
    });
    
    onDestroy(() => {
        window.removeEventListener('scroll', handleScroll, true);
        document.removeEventListener('click', handleDocumentClick);
        
        // Clean up intersection observer
        if (observer && containerRef) {
            observer.unobserve(containerRef);
        }
    });
    
    // Add mock data for condition testing
    let mockData = {
        price: 45000,
        previousPrice: 44000,
        volume: 1200,
        rsi: 62,
        macd: 0.5,
        macdSignal: 0.3,
        ema9: 44800,
        ema21: 44200,
        timestamp: new Date()
    };
    
    // Simple condition testing function
    function testCondition(condition) {
        // This is a simplified mock implementation
        // In a real app, this would use proper evaluation logic
        if (condition.disabled) return false;
        
        const baseResult = (() => {
            switch(condition.id.split('_')[0]) {
                case 'price':
                    if (condition.id.includes('above')) {
                        return mockData.price > parseFloat(condition.params.find(p => p.name === 'value')?.value || 0);
                    } else if (condition.id.includes('below')) {
                        return mockData.price < parseFloat(condition.params.find(p => p.name === 'value')?.value || 0);
                    }
                    return false;
                case 'rsi':
                    if (condition.id.includes('above')) {
                        return mockData.rsi > parseFloat(condition.params.find(p => p.name === 'value')?.value || 0);
                    } else if (condition.id.includes('below')) {
                        return mockData.rsi < parseFloat(condition.params.find(p => p.name === 'value')?.value || 0);
                    }
                    return false;
                case 'ema':
                    if (condition.id.includes('crossover')) {
                        return mockData.ema9 > mockData.ema21;
                    } else if (condition.id.includes('crossunder')) {
                        return mockData.ema9 < mockData.ema21;
                    }
                    return false;
                case 'macd':
                    if (condition.id.includes('crossover')) {
                        return mockData.macd > mockData.macdSignal;
                    } else if (condition.id.includes('crossunder')) {
                        return mockData.macd < mockData.macdSignal;
                    }
                    return false;
                default:
                    return Math.random() > 0.5; // Random result for other conditions
            }
        })();
        
        return condition.not ? !baseResult : baseResult;
    }
    
    // Evaluate all conditions in a container
    function evaluateContainer() {
        if (container.disabled || container.conditions.length === 0) return false;
        
        let result = true;
        
        for (let i = 0; i < container.conditions.length; i++) {
            const conditionResult = testCondition(container.conditions[i]);
            
            if (i === 0) {
                result = conditionResult;
            } else {
                const operator = container.conditionOperators[i-1];
                if (operator === 'AND') {
                    result = result && conditionResult;
                } else {
                    result = result || conditionResult;
                }
            }
        }
        
        return result;
    }
    
    // Show test panel
    let showTestPanel = false;
    
    function toggleTestPanel() {
        showTestPanel = !showTestPanel;
    }
    
    // Add a reactive statement to pre-calculate the result
    $: containerEvaluationResult = evaluateContainer();
    
    // Click outside directive to close dropdowns
    function clickOutside(node) {
        const handleClick = event => {
            if (node && !node.contains(event.target) && !event.defaultPrevented) {
                node.dispatchEvent(new CustomEvent('clickoutside'));
            }
        };
        
        document.addEventListener('click', handleClick, true);
        
        return {
            destroy() {
                document.removeEventListener('click', handleClick, true);
            }
        };
    }
    
    // Reset dropdown arrays when conditions/actions change
    $: {
        if (container.conditions) {
            conditionMenuOpen = Array(container.conditions.length).fill(false);
        }
        if (container.actions) {
            actionMenuOpen = Array(container.actions.length).fill(false);
        }
    }
    
    // For mini-map
    let containerRef;
    let isInViewport = false;
    let observer;
    let allContainers = [];
    let activeContainerIds = new Set();
    
    // Modify the registerContainer function
    const registerContainer = (id, level, type, name) => {
        if (!allContainers.some(c => c.id === id)) {
            allContainers = [...allContainers, { id, level, type, name, parentId }];
            dispatch('registercontainer', { id, level, type, name, parentId, containerRef });
        }
    };
    
    // Function to scroll to this container
    function scrollToThisContainer() {
        containerRef.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // When rendering child containers, pass the parent ID
    function renderChildContainers() {
        return container.children.map((childContainer, childIndex) => {
            return `
                <CommandContainer
                    container={childContainer}
                    index={childIndex}
                    nestingLevel={nestingLevel + 1}
                    parentId={container.id}
                    siblingContainers={container.children}
                    on:registercontainer={handleContainerRegistration}
                    on:containervisible={handleContainerVisibility}
                    on:childcontainer={handleChildContainer}
                />
            `;
        });
    }
    
    // Add or modify this function to provide better indentation control
    function getIndentationStyle(level) {
        // Reduce the indentation multiplier from 2rem to 1rem or 0.75rem
        const indentation = level * 0.75; // Reduced from larger value
        return `margin-left: ${indentation}rem;`;
    }
</script>

<!-- Add bind:this to the main container div -->
<div bind:this={containerRef} class="command-container bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg mb-4 {container.disabled ? 'opacity-75' : ''} 
    {container.containerType === 'IF' ? 'if-container' : 
     container.containerType === 'ELSE_IF' ? 'else-if-container' : 
     container.containerType === 'ELSE' ? 'else-container' : ''}
    nested-container-level-{nestingLevel} <!-- เพิ่ม class นี้ -->
    {!isValidContainerPosition ? 'invalid-container-position ring-2 ring-red-500/30 dark:ring-red-600/40' : ''}"
    data-container-id={container.id}
    data-container-level={nestingLevel}
    data-container-type={container.containerType}>
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
            <!-- Expand button -->
            <button 
                class="p-1 text-light-text dark:text-dark-text hover:text-theme-500 dark:hover:text-theme-400"
                on:click={toggleExpand}
            >
                <svg class="w-5 h-5 transition-transform duration-200 {isExpanded ? 'transform rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
            </button>
            
            <!-- Container Type Badge - restored -->
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
            
            <!-- Container name -->
            <span class="font-medium text-light-text dark:text-dark-text {container.disabled ? 'line-through text-red-500 dark:text-red-400' : ''}">
                {container.name || 'Command Group'}
            </span>
            
            <!-- Warning indicator for invalid container position -->
            {#if !isValidContainerPosition}
                <div class="ml-2 text-red-500 dark:text-red-400 flex items-center gap-1" 
                     transition:fly={{ y: -10, duration: 150 }}
                     title="{container.containerType} must come after an IF container">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span class="text-xs">Invalid position</span>
                </div>
            {/if}
        </div>
        
        <!-- Dropdown menu button -->
        <div class="relative">
            <button
                class="p-1.5 rounded-md text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 dark:hover:text-theme-400 hover:bg-light-hover dark:hover:bg-dark-hover dropdown-toggle"
                on:click|stopPropagation={() => toggleDropdown('container')}
                title="Container options"
            >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
            </button>
            
            {#if containerMenuOpen}
                <div 
                    class="absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50 dropdown-menu"
                    transition:fade={{ duration: 100 }}
                >
                    <div class="py-1" role="menu" aria-orientation="vertical">
                        <!-- Config option -->
                        <button 
                            class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            on:click|stopPropagation={() => {
                                openConfigModal();
                                closeAllDropdowns();
                            }}
                            role="menuitem"
                        >
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                            Configure
            </button>
                        
                        <!-- Toggle Disabled option -->
            <button
                            class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            on:click|stopPropagation={() => {
                                toggleContainerDisabled();
                                closeAllDropdowns();
                            }}
                            role="menuitem"
                        >
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                            {container.disabled ? 'Enable' : 'Disable'} Container
            </button>
                        
                        <!-- Add Child Container option -->
            <button
                            class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            on:click|stopPropagation={() => {
                                addChildContainer();
                                closeAllDropdowns();
                            }}
                            role="menuitem"
                        >
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                            Add Child IF-ELSE
            </button>
                        
                        <!-- Test Conditions option -->
                <button 
                            class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            on:click|stopPropagation={() => {
                                toggleTestPanel();
                                closeAllDropdowns();
                            }}
                            role="menuitem"
                        >
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            {showTestPanel ? 'Hide' : 'Test'} Conditions
                        </button>
                        
                        <!-- Help option -->
                        <button 
                            class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            on:click|stopPropagation={() => {
                                showHelp('container');
                                closeAllDropdowns();
                            }}
                            role="menuitem"
                        >
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Help
                        </button>
                        
                        <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                        
                        <!-- Remove Container option -->
                        <button 
                            class="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            on:click|stopPropagation={() => {
                                removeContainer();
                                closeAllDropdowns();
                            }}
                            role="menuitem"
                        >
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                            Remove Container
                </button>
                    </div>
                </div>
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
        <div class="p-4 ms-4" transition:slide={{ duration: 200 }}>
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
                            <!-- Update Add Condition button to remove animation class -->
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
                        <div class="p-4 border border-dashed border-blue-300 dark:border-blue-700 rounded-md bg-blue-50/50 dark:bg-blue-900/20 text-center">
                            <svg class="w-8 h-8 mx-auto text-blue-400 dark:text-blue-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <p class="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">No conditions added yet</p>
                            <p class="text-xs text-light-text-muted dark:text-dark-text-muted mb-3">Add conditions to determine when your actions will execute</p>
                            <button 
                                class="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
                                on:click={addCondition}
                            >
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Add Your First Condition
                            </button>
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
                                    
                                    <!-- Update condition item to match action item styling -->
                                    <div class="p-0 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg shadow-sm flex justify-between items-stretch relative condition-item overflow-hidden">
                                        <!-- Left color indicator -->
                                        <div class="w-1.5 bg-blue-400 dark:bg-blue-500"></div>
                                        
                                        <!-- Content with status indicators -->
                                        <div class="flex-1 p-3 {condition.disabled || container.disabled ? 'opacity-60' : ''}">
                                            <div class="font-medium text-sm text-light-text dark:text-dark-text flex items-center">
                                                <!-- Icon indicator -->
                                                <svg class="w-4 h-4 mr-1.5 text-blue-500 dark:text-blue-400" 
                                                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                
                                                <!-- Condition name -->
                                                <span class="{condition.disabled || container.disabled ? 'line-through text-red-500 dark:text-red-400' : ''}">
                                                    {condition.not ? 'NOT ' : ''}{condition.name}
                                                </span>
                                            </div>
                                            
                                            <!-- Condition definition description text -->
                                            {#if getConditionDefinition(condition.id)?.description}
                                                <div class="mt-1 text-xs text-light-text-muted dark:text-dark-text-muted italic {condition.disabled || container.disabled ? 'line-through text-red-400/80 dark:text-red-300/80' : ''}">
                                                    {getConditionDefinition(condition.id).description}
                                                </div>
                                            {/if}
                                            
                                            <!-- Parameters -->
                                            <div class="mt-1 text-xs text-light-text-muted dark:text-dark-text-muted {condition.disabled || container.disabled ? 'line-through text-red-400 dark:text-red-300' : ''}">
                                                {#each condition.params.filter(p => shouldShowParam(p, condition)) as param}
                                                    <span class="inline-flex items-center mr-2 px-1.5 py-0.5 rounded-md bg-light-hover/50 dark:bg-dark-hover/50">
                                                        <span class="font-medium mr-1">{param.name}:</span> {formatParamValue(param)}
                                                    </span>
                                                {/each}
                                            </div>
                                        </div>

                                        <!-- Dropdown menu -->
                                        <div class="relative flex items-center">
                                            <button 
                                                class="p-1.5 rounded-md text-light-text-muted dark:text-dark-text-muted hover:text-blue-500 dark:hover:text-blue-400 hover:bg-light-hover dark:hover:bg-dark-hover dropdown-toggle"
                                                on:click|stopPropagation={() => toggleDropdown('condition', i)}
                                                title="Condition options"
                                            >
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                                                </svg>
                                            </button>
                                            
                                            {#if conditionMenuOpen[i]}
                                                <div 
                                                    class="absolute right-0 top-full mt-1 w-40 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50 dropdown-menu"
                                                    transition:fade={{ duration: 100 }}
                                                    use:clickOutside={() => conditionMenuOpen[i] = false}
                                                >
                                                    <div class="py-1" role="menu" aria-orientation="vertical">
                                                        <!-- Add Toggle NOT option to the dropdown menu -->
                                                        <button 
                                                            class="flex items-center w-full px-4 py-2 text-sm {condition.not ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'} hover:bg-gray-100 dark:hover:bg-gray-700"
                                                            on:click|stopPropagation={() => {
                                                                toggleNot(i);
                                                                conditionMenuOpen[i] = false;
                                                            }}
                                                        >
                                                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                            </svg>
                                                            {condition.not ? 'Remove NOT' : 'Add NOT'}
                                                        </button>
                                                        
                                                        <!-- Edit option -->
                                                        <button 
                                                            class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                            on:click|stopPropagation={() => {
                                                                editItem(condition, 'condition', i);
                                                                conditionMenuOpen[i] = false;
                                                            }}
                                                        >
                                                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                            Edit Condition
                                                        </button>
                                                
                                                        <!-- Toggle Disabled option -->
                                                        <button 
                                                            class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                            on:click|stopPropagation={() => {
                                                                toggleDisabled('condition', i);
                                                                conditionMenuOpen[i] = false;
                                                            }}
                                                        >
                                                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                            </svg>
                                                            {condition.disabled ? 'Enable' : 'Disable'}
                                                        </button>
                                                
                                                        <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                                                        
                                                        <!-- Delete option -->
                                                        <button 
                                                            class="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                            on:click|stopPropagation={() => {
                                                                removeItem('condition', i);
                                                                conditionMenuOpen[i] = false;
                                                            }}
                                                        >
                                                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            {/if}
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
                            <!-- Update Add Action button to remove animation class -->
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
                        <div class="p-4 border border-dashed border-green-300 dark:border-green-700 rounded-md bg-green-50/50 dark:bg-green-900/20 text-center">
                            <svg class="w-8 h-8 mx-auto text-green-400 dark:text-green-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <p class="text-sm text-green-600 dark:text-green-400 font-medium mb-1">No actions added yet</p>
                            <p class="text-xs text-light-text-muted dark:text-dark-text-muted mb-3">Add actions to define what should happen when your conditions are met</p>
                            <button 
                                class="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-700 transition-colors"
                                on:click={addAction}
                            >
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Add Your First Action
                            </button>
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
                                    <div class="flex items-center pr-2">
                                        <!-- Action dropdown toggle button -->
                                        <button 
                                            class="p-1.5 rounded-md text-light-text-muted dark:text-dark-text-muted hover:text-green-500 dark:hover:text-green-400 hover:bg-light-hover dark:hover:bg-dark-hover dropdown-toggle"
                                            on:click|stopPropagation={() => toggleDropdown('action', i)}
                                            title="Action options"
                                        >
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                                            </svg>
                                        </button>
                                        
                                        {#if actionMenuOpen[i]}
                                            <div 
                                                class="absolute right-0 top-full mt-1 w-40 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50 dropdown-menu"
                                                transition:fade={{ duration: 100 }}
                                                use:clickOutside={() => actionMenuOpen[i] = false}
                                            >
                                                <div class="py-1" role="menu" aria-orientation="vertical">
                                                    <!-- Edit option -->
                                                    <button 
                                                        class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                        on:click|stopPropagation={() => {
                                                            editItem(action, 'action', i);
                                                            actionMenuOpen[i] = false;
                                                        }}
                                                    >
                                                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                        Edit Action
                                                    </button>
                                                    
                                                    <!-- Toggle Disabled option -->
                                                    <button 
                                                        class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                        on:click|stopPropagation={() => {
                                                            toggleDisabled('action', i);
                                                            actionMenuOpen[i] = false;
                                                        }}
                                                    >
                                                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                        </svg>
                                                        {action.disabled ? 'Enable' : 'Disable'}
                                                    </button>
                                                    
                                                    <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                                                    
                                                    <!-- Delete option -->
                                                    <button 
                                                        class="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        on:click|stopPropagation={() => {
                                                            removeItem('action', i);
                                                            actionMenuOpen[i] = false;
                                                        }}
                                                    >
                                                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            </div>
            
            <!-- Nested Command Containers -->
            {#if container.children && container.children.length > 0}
                <div class="nested-containers mt-4 border-t border-light-border dark:border-dark-border pt-4">
                    {#each container.children as childContainer, childIndex}
                        <!-- ตรงนี้แก้โดยไม่ใช้ style inline แต่ใช้ class แทน -->
                        <div class="child-container">
                            <svelte:self
                                container={childContainer}
                                index={childIndex}
                                nestingLevel={nestingLevel + 1}
                                siblingContainers={container.children}
                                parentId={container.id}
                                on:update={handleChildUpdate}
                                on:remove={handleChildRemove}
                                on:selectcondition
                                on:selectaction
                                on:registercontainer
                                on:containervisible
                                on:childcontainer
                            />
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    {/if}
    
    <!-- Test panel -->
    {#if showTestPanel && container.conditions.length > 0}
        <div class="p-3 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 text-sm" transition:slide={{ duration: 200 }}>
            <div class="flex justify-between items-center mb-2">
                <h4 class="font-medium text-yellow-800 dark:text-yellow-200">Condition Test Results</h4>
                <div class="flex items-center">
                    <span class="mr-2 text-xs text-yellow-600 dark:text-yellow-400">Using simulated market data</span>
                    <button class="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200" on:click={toggleTestPanel}>
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                        </div>
            
            <div class="overflow-x-auto">
                <table class="w-full text-xs border-collapse">
                    <thead>
                        <tr class="bg-yellow-100 dark:bg-yellow-800/30">
                            <th class="p-2 text-left font-medium text-yellow-900 dark:text-yellow-100">Condition</th>
                            <th class="p-2 text-left font-medium text-yellow-900 dark:text-yellow-100">Parameters</th>
                            <th class="p-2 text-center w-20 font-medium text-yellow-900 dark:text-yellow-100">Result</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each container.conditions as condition, i}
                            <tr class="border-t border-yellow-200 dark:border-yellow-800/50">
                                <td class="p-2 text-yellow-900 dark:text-yellow-50">
                                    <div class="flex items-center">
                                        {#if condition.not}<span class="mr-1 font-medium">NOT</span>{/if}
                                        {condition.name}
                                    </div>
                                </td>
                                <td class="p-2">
                                    <div class="flex flex-wrap gap-1">
                                        {#each condition.params.filter(p => shouldShowParam(p, condition)) as param}
                                            <span class="inline-flex items-center px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-800/40 text-yellow-800 dark:text-yellow-200">
                                                <span class="font-medium mr-1">{param.name}:</span> {formatParamValue(param)}
                                            </span>
                    {/each}
                </div>
                                </td>
                                <td class="p-2 text-center">
                                    {#if condition.disabled}
                                        <span class="inline-block px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">Disabled</span>
                                    {:else if testCondition(condition)}
                                        <span class="inline-block px-2 py-0.5 rounded bg-green-100 dark:bg-green-800/50 text-green-700 dark:text-green-200">
                                            True
                                        </span>
                                    {:else}
                                        <span class="inline-block px-2 py-0.5 rounded bg-red-100 dark:bg-red-800/50 text-red-700 dark:text-red-200">
                                            False
                                        </span>
            {/if}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                    <tfoot>
                        <tr class="border-t border-yellow-300 dark:border-yellow-700">
                            <td colspan="2" class="p-2 font-medium text-yellow-900 dark:text-yellow-50">Overall Result:</td>
                            <td class="p-2 text-center">
                                <span class="inline-block px-2 py-0.5 rounded-full font-medium {containerEvaluationResult ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200' : 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200'}">
                                    {containerEvaluationResult ? 'TRUE' : 'FALSE'}
                                </span>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div class="mt-2 text-xs text-yellow-600 dark:text-yellow-300">
                <p>This is a simulation using mock data. Actual results may vary based on real market conditions.</p>
            </div>
        </div>
    {/if}
</div>

<!-- Updated Item Editor Modal -->
{#if showItemEditor}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
         transition:fade={{ duration: 150 }}>
        <div class="bg-light-card dark:bg-dark-card rounded-lg shadow-xl w-full max-w-md p-4 max-h-[90vh] overflow-y-auto"
             transition:fly={{ y: 20, duration: 200 }}>
            <div class="flex items-center justify-between mb-4 pb-2 border-b border-light-border dark:border-dark-border">
                <h3 class="text-xl font-semibold text-light-text dark:text-dark-text flex items-center">
                    {#if editingItemType === 'condition'}
                        <div class="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mr-2 border border-blue-200 dark:border-blue-800">
                            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                    {:else}
                        <div class="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 flex items-center justify-center mr-2 border border-green-200 dark:border-green-800">
                            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                    {/if}
                    {editingItem.name}
            </h3>
                <button class="text-light-text-muted dark:text-dark-text-muted hover:text-red-500 dark:hover:text-red-400" on:click={closeItemEditor}>
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            
            <!-- Add description display -->
            {#if editingItemType === 'condition' && getConditionDefinition(editingItem.id)?.description}
                <div class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-md text-sm text-blue-800 dark:text-blue-300">
                    {getConditionDefinition(editingItem.id).description}
                </div>
            {:else if editingItemType === 'action' && getActionDefinition(editingItem.id)?.description}
                <div class="mb-4 p-3 bg-green-50 dark:bg-green-900/10 rounded-md text-sm text-green-800 dark:text-green-300">
                    {getActionDefinition(editingItem.id).description}
                </div>
            {/if}
            
            <!-- Improved parameter editing UI -->
            <div class="space-y-4">
                {#each editingItem.params as param, paramIndex}
                    {#if shouldShowParam(param, editingItem)}
                        <div class="form-group p-3 border border-light-border dark:border-dark-border rounded-lg bg-light-hover/50 dark:bg-dark-hover/50">
                            <label class="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5 flex items-center">
                                <span>{param.name}</span>
                                <span class="ml-1.5 text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-400">
                                    {param.type}
                                </span>
                            </label>
                            
                            <!-- More intuitive input fields by type -->
                            {#if param.type === 'number'}
                                <div class="flex items-center">
                                <input 
                                    type="number" 
                                        class="w-full p-2 rounded-md bg-white dark:bg-gray-700 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                                    bind:value={param.value}
                                        placeholder={param.default.toString()}
                                    />
                                    <!-- Add increment/decrement buttons for number inputs -->
                                    <div class="flex flex-col ml-2">
                                        <button class="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                            on:click={() => param.value = (parseFloat(param.value) || 0) + 1}>
                                            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                                            </svg>
                                        </button>
                                        <button class="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                            on:click={() => param.value = Math.max(0, (parseFloat(param.value) || 0) - 1)}>
                                            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            {:else if param.type === 'text'}
                                <input 
                                    type="text" 
                                    class="w-full p-2 rounded-md bg-white dark:bg-gray-700 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                                    bind:value={param.value}
                                    placeholder={param.default}
                                />
                            {:else if param.type === 'time'}
                                <input 
                                    type="time" 
                                    class="w-full p-2 rounded-md bg-white dark:bg-gray-700 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                                    bind:value={param.value}
                                />
                            {:else if param.type === 'select'}
                                <select 
                                    class="w-full p-2 rounded-md bg-white dark:bg-gray-700 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                                    bind:value={param.value}
                                >
                                    {#each param.options as option}
                                        <option value={option}>{option}</option>
                                    {/each}
                                </select>
                            {/if}
                            
                            <!-- Parameter help text if available -->
                            {#if param.help}
                                <p class="mt-1 text-xs text-light-text-muted dark:text-dark-text-muted">{param.help}</p>
                            {/if}
                        </div>
                    {/if}
                {/each}
            </div>
            
            <!-- Action buttons -->
            <div class="flex justify-end space-x-2 mt-6">
                <Button variant="secondary" size="sm" on:click={closeItemEditor}>
                    Cancel
                </Button>
                <Button variant="primary" size="sm" on:click={saveItemEdit}>
                    Save Changes
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

<!-- Contextual Help Panel -->
{#if showContextualHelp}
    <div class="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center" 
         on:click={() => showContextualHelp = false}
         transition:fade={{ duration: 150 }}>
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 max-w-md w-full mx-4" 
             on:click|stopPropagation
             transition:fly={{ y: 20, duration: 200 }}>
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {#if helpContext === 'container'}
                        About Command Containers
                    {:else if helpContext === 'condition'}
                        About Conditions
                    {:else if helpContext === 'action'}
                        About Actions
                    {:else}
                        Help
                    {/if}
                </h3>
                <button class="text-gray-400 hover:text-gray-500" on:click={() => showContextualHelp = false}>
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            
            <div class="text-sm text-gray-600 dark:text-gray-300 space-y-3">
                {#if helpContext === 'container'}
                    <p>Command containers group conditions and actions together. When all conditions in a container are met, the actions will execute.</p>
                    <p><strong>IF containers</strong> are the starting point for any logical condition.</p>
                    <p><strong>ELSE IF containers</strong> are checked only if the previous IF or ELSE IF conditions were not met.</p>
                    <p><strong>ELSE containers</strong> contain actions that execute when none of the previous conditions were met.</p>
                {:else if helpContext === 'condition'}
                    <p>Conditions determine when your actions will be executed. They are evaluated based on market data and indicators.</p>
                    <p>Multiple conditions can be grouped with AND/OR operators.</p>
                    <p>You can add NOT to invert a condition's result.</p>
                {:else if helpContext === 'action'}
                    <p>Actions are the operations that will be performed when conditions are met, such as buying, selling, or setting stops.</p>
                    <p>Actions execute in the order they are listed from top to bottom.</p>
                {/if}
                
                <div class="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p class="text-xs text-gray-500 dark:text-gray-400">For more detailed help, check our <a href="/documentation" class="text-blue-500 hover:underline">documentation</a>.</p>
                </div>
            </div>
        </div>
    </div>
{/if}

<!-- Add a performance hint to containers with many conditions -->
{#if container.conditions.length > 5}
    <div class="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 text-xs text-yellow-700 dark:text-yellow-300">
        <div class="flex items-start">
            <svg class="w-4 h-4 mr-1.5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
                Using many conditions may affect performance. Consider breaking complex logic into separate command groups.
            </span>
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
    
    /* Remove hover transforms and animations */
    .condition-item, .action-item {
        position: relative;
        /* Remove transition animation */
    }
    
    .condition-item:hover, .action-item:hover {
        /* Remove transform and box-shadow effects */
    }
    
    .condition-actions, .action-actions {
        opacity: 0.3;  /* Semi-visible instead of completely hidden */
        transition: opacity 0.2s ease-in-out;
    }
    
    .condition-item:hover .condition-actions,
    .action-item:hover .action-actions {
        opacity: 1;
    }
    
    /* Remove pulse animation definition */
    @keyframes subtle-pulse {
        /* Remove animation frames */
    }
    
    .add-button-pulse {
        /* Remove animation property */
    }
    
    /* Improved logic flow visualization */
    .logic-flow {
        position: absolute;
        left: -2rem;
        height: 100%;
        width: 2px;
        background: linear-gradient(to bottom, 
            rgba(var(--color-theme-500-rgb), 0.5),
            rgba(var(--color-theme-500-rgb), 0.5));
    }
    
    .logic-connector {
        position: absolute;
        left: -1.5rem;
        top: 50%;
        width: 1.5rem;
        height: 2px;
        background-color: rgba(var(--color-theme-500-rgb), 0.5);
    }
    
    .logic-dot {
        position: absolute;
        left: -1.5rem;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: rgba(var(--color-theme-500-rgb), 1);
    }
    
    [data-tooltip] {
        position: relative;
    }
    
    [data-tooltip]:hover::after {
        content: attr(data-tooltip);
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        bottom: calc(100% + 5px);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        z-index: 10;
        pointer-events: none;
    }
    
    [data-tooltip-position="right"]:hover::after {
        left: calc(100% + 5px);
        bottom: 50%;
        transform: translateY(50%);
    }
    
    [data-tooltip-position="bottom"]:hover::after {
        bottom: auto;
        top: calc(100% + 5px);
    }
    
    [data-tooltip-position="left"]:hover::after {
        left: auto;
        right: calc(100% + 5px);
        bottom: 50%;
        transform: translateY(50%);
    }
    
    /* Add these styles to ensure proper dropdown positioning */
    .dropdown-container {
        position: relative;
    }
    
    /* Ensure dropdowns appear above other content */
    .dropdown-menu {
        z-index: 50;
        position: absolute;
        right: 0;
        margin-top: 0.25rem;
        min-width: 10rem;
        overflow: visible;
    }
    
    /* Ensure parent containers don't clip dropdowns */
    .condition-item, .action-item {
        /* Existing styles */
        overflow: visible;
    }
    
    .command-container-wrapper {
        /* Existing styles */
        overflow: visible;
    }


</style>