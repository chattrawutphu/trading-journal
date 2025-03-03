<script>
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import { fade, fly } from "svelte/transition";
    import Button from "$lib/components/common/Button.svelte";
    import Modal from "$lib/components/common/Modal.svelte";
    import CommandContainer from "$lib/components/trading/CommandContainer.svelte";
    import VisualScriptPreview from "$lib/components/trading/VisualScriptPreview.svelte";
    import CommandMiniMap from '$lib/components/trading/CommandMiniMap.svelte';
    import { subscriptionStore } from "$lib/stores/subscriptionStore";
    import { SUBSCRIPTION_TYPES } from "$lib/config/subscription";
    
    // State variables
    let strategy = null;
    let strategyId = "";
    let error = "";
    let containers = [];
    let showCodePreview = false;
    let generatedCode = "";
    let showCopied = false;
    
    // Add state for tracking active container
    let activeContainerId = null;
    let showMiniMap = true;
    let visibleContainers = new Set();
    let allCommandContainers = [];
    
    // Function to handle mini map selection
    function handleMiniMapSelect(event) {
        const { containerId } = event.detail;
        activeContainerId = containerId;
        
        // Scroll to the selected container
        const containerElement = document.querySelector(`[data-container-id="${containerId}"]`);
        if (containerElement) {
            containerElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
    // Update active container when scrolling or interacting
    function updateActiveContainer() {
        // Logic to determine which container is currently in view
        // This could use Intersection Observer or scroll position calculations
    }
    
    // Symbol and Timeframe edit state
    let showSymbolSelector = false;
    let showTimeframeSelector = false;
    
    // Execution frequency state
    let executionFrequency = "candle_close"; // Default: execute on candle close
    
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
    
    // Available execution frequencies based on subscription level
    const basicFrequencies = [
        { id: "candle_close", name: "Every Candle Close", description: "Execute when each candle closes (based on timeframe)" },
        { id: "minute_5", name: "Every 5 Minutes", description: "Execute every 5 minutes" },
        { id: "minute_10", name: "Every 10 Seconds", description: "Execute every 10 seconds" }
    ];
    
    const proFrequencies = [
        ...basicFrequencies,
        { id: "minute_1", name: "Every 1 Minute", description: "Execute every minute" },
        { id: "second_5", name: "Every 5 Seconds", description: "Execute every 5 seconds" }
    ];
    
    const proPlusFrequencies = [
        ...proFrequencies,
        { id: "second_1", name: "Every 1 Second", description: "Execute every second" }
    ];
    
    // Get available frequencies based on subscription level
    $: availableFrequencies = 
        $subscriptionStore.type === SUBSCRIPTION_TYPES.PRO_PLUS ? proPlusFrequencies :
        $subscriptionStore.type === SUBSCRIPTION_TYPES.PRO ? proFrequencies :
        basicFrequencies;
    
    // Modal state for selecting conditions and actions
    let showConditionSelector = false;
    let showActionSelector = false;
    let currentContainerIndex = -1;
    let conditionSearchQuery = '';
    let actionSearchQuery = '';
    
    // Available conditions and actions
    const availableConditions = [
        // Price conditions
        { id: 'price_above', name: 'Price Above', 
          description: 'Executes when the current price rises above a specified value',
          params: [{ name: 'value', type: 'number', default: 0 }],
          category: 'Price'
        },
        { id: 'price_below', name: 'Price Below', 
          description: 'Executes when the current price falls below a specified value',
          params: [{ name: 'value', type: 'number', default: 0 }],
          category: 'Price'
        },
        { id: 'price_between', name: 'Price Between',
          description: 'Triggers when price is between two specified values',
          params: [
            { name: 'lower_value', type: 'number', default: 0 },
            { name: 'upper_value', type: 'number', default: 0 }
          ],
          category: 'Price'
        },
        { id: 'price_change_pct', name: 'Price Change %',
          description: 'Detects when price changes by a percentage in a specified timeframe',
          params: [
            { name: 'percent', type: 'number', default: 5 },
            { name: 'direction', type: 'select', options: ['Up', 'Down', 'Either'], default: 'Either' },
            { name: 'timeframe_minutes', type: 'number', default: 60 }
          ],
          category: 'Price'
        },
        
        // Technical Indicators
        { id: 'ema_crossover', name: 'EMA Crossover', 
          description: 'Detects when the faster EMA crosses above the slower EMA (bullish signal)',
          params: [
            { name: 'fast_period', type: 'number', default: 9 },
            { name: 'slow_period', type: 'number', default: 21 }
          ],
          category: 'Indicators'
        },
        { id: 'ema_crossunder', name: 'EMA Crossunder', 
          description: 'Detects when the faster EMA crosses below the slower EMA (bearish signal)',
          params: [
            { name: 'fast_period', type: 'number', default: 9 },
            { name: 'slow_period', type: 'number', default: 21 }
          ],
          category: 'Indicators'
        },
        { id: 'sma_crossover', name: 'SMA Crossover', 
          description: 'Triggers when the faster SMA crosses above the slower SMA',
          params: [
            { name: 'fast_period', type: 'number', default: 9 },
            { name: 'slow_period', type: 'number', default: 21 }
          ],
          category: 'Indicators'
        },
        { id: 'rsi_above', name: 'RSI Above', 
          description: 'Triggers when RSI rises above a threshold (potential overbought condition)',
          params: [
            { name: 'period', type: 'number', default: 14 },
            { name: 'value', type: 'number', default: 70 }
          ],
          category: 'Indicators'
        },
        { id: 'rsi_below', name: 'RSI Below', 
          description: 'Triggers when RSI falls below a threshold (potential oversold condition)',
          params: [
            { name: 'period', type: 'number', default: 14 },
            { name: 'value', type: 'number', default: 30 }
          ],
          category: 'Indicators'
        },
        { id: 'macd_crossover', name: 'MACD Crossover',
          description: 'Detects when MACD line crosses above the signal line (bullish signal)',
          params: [
            { name: 'fast_period', type: 'number', default: 12 },
            { name: 'slow_period', type: 'number', default: 26 },
            { name: 'signal_period', type: 'number', default: 9 }
          ],
          category: 'Indicators'
        },
        { id: 'macd_crossunder', name: 'MACD Crossunder',
          description: 'Detects when MACD line crosses below the signal line (bearish signal)',
          params: [
            { name: 'fast_period', type: 'number', default: 12 },
            { name: 'slow_period', type: 'number', default: 26 },
            { name: 'signal_period', type: 'number', default: 9 }
          ],
          category: 'Indicators'
        },
        { id: 'bollinger_upper', name: 'Bollinger Upper Touch',
          description: 'Triggers when price touches or exceeds the upper Bollinger Band',
          params: [
            { name: 'period', type: 'number', default: 20 },
            { name: 'deviation', type: 'number', default: 2 }
          ],
          category: 'Indicators'
        },
        { id: 'bollinger_lower', name: 'Bollinger Lower Touch',
          description: 'Triggers when price touches or drops below the lower Bollinger Band',
          params: [
            { name: 'period', type: 'number', default: 20 },
            { name: 'deviation', type: 'number', default: 2 }
          ],
          category: 'Indicators'
        },
        
        // Volume Conditions
        { id: 'volume_spike', name: 'Volume Spike',
          description: 'Detects when trading volume increases significantly compared to average',
          params: [
            { name: 'threshold_percent', type: 'number', default: 200 },
            { name: 'average_periods', type: 'number', default: 20 }
          ],
          category: 'Volume'
        },
        { id: 'volume_decline', name: 'Volume Decline',
          description: 'Triggers when volume falls below a threshold compared to average',
          params: [
            { name: 'threshold_percent', type: 'number', default: 50 },
            { name: 'average_periods', type: 'number', default: 20 }
          ],
          category: 'Volume'
        },
        
        // Crypto-specific Conditions
        { id: 'funding_rate_above', name: 'Funding Rate Above',
          description: 'Triggers when the funding rate rises above a specified threshold',
          params: [
            { name: 'value', type: 'number', default: 0.001 }
          ],
          category: 'Crypto'
        },
        { id: 'funding_rate_below', name: 'Funding Rate Below',
          description: 'Triggers when the funding rate falls below a specified threshold',
          params: [
            { name: 'value', type: 'number', default: -0.001 }
          ],
          category: 'Crypto'
        },
        { id: 'market_dominance', name: 'Market Dominance',
          description: 'Triggers based on market dominance percentage of a cryptocurrency',
          params: [
            { name: 'coin', type: 'select', options: ['BTC', 'ETH'], default: 'BTC' },
            { name: 'condition', type: 'select', options: ['Above', 'Below'], default: 'Above' },
            { name: 'value', type: 'number', default: 60 }
          ],
          category: 'Crypto'
        },
        { id: 'liquidations_spike', name: 'Liquidations Spike',
          description: 'Detects significant liquidation events in the market',
          params: [
            { name: 'threshold_usd', type: 'number', default: 10000000 },
            { name: 'direction', type: 'select', options: ['Long', 'Short', 'Either'], default: 'Either' },
            { name: 'timeframe_minutes', type: 'number', default: 60 }
          ],
          category: 'Crypto'
        }
    ];
    
    const availableActions = [
        // Market Orders
        { id: 'buy_market', name: 'Buy Market', 
          description: 'Places a market buy order for the specified amount',
          params: [
            { name: 'amount', type: 'number', default: 100 },
            { name: 'amount_type', type: 'select', options: ['USD', '%'], default: 'USD' }
          ],
          category: 'Market Orders'
        },
        { id: 'sell_market', name: 'Sell Market', 
          description: 'Places a market sell order for the specified amount',
          params: [
            { name: 'amount', type: 'number', default: 100 },
            { name: 'amount_type', type: 'select', options: ['USD', '%'], default: 'USD' }
          ],
          category: 'Market Orders'
        },
        { id: 'buy_limit', name: 'Buy Limit',
          description: 'Places a limit buy order at a specified price',
          params: [
            { name: 'price', type: 'number', default: 0 },
            { name: 'amount', type: 'number', default: 100 },
            { name: 'amount_type', type: 'select', options: ['USD', '%'], default: 'USD' }
          ],
          category: 'Limit Orders'
        },
        { id: 'sell_limit', name: 'Sell Limit',
          description: 'Places a limit sell order at a specified price',
          params: [
            { name: 'price', type: 'number', default: 0 },
            { name: 'amount', type: 'number', default: 100 },
            { name: 'amount_type', type: 'select', options: ['USD', '%'], default: 'USD' }
          ],
          category: 'Limit Orders'
        },
        
        // Risk Management
        { id: 'set_stop_loss', name: 'Set Stop Loss', 
          description: 'Creates a stop-loss order to limit potential losses',
          params: [
            { name: 'price', type: 'number', default: 0 },
            { name: 'type', type: 'select', options: ['Fixed', 'Trailing'], default: 'Fixed' },
            { name: 'trail_percent', type: 'number', default: 1, showIf: { field: 'type', value: 'Trailing' } }
          ],
          category: 'Risk Management'
        },
        { id: 'set_take_profit', name: 'Set Take Profit',
          description: 'Creates a take-profit order to secure gains at a target price',
          params: [
            { name: 'price', type: 'number', default: 0 },
            { name: 'amount', type: 'number', default: 100 },
            { name: 'amount_type', type: 'select', options: ['USD', '%'], default: '%' }
          ],
          category: 'Risk Management'
        },
        { id: 'cancel_orders', name: 'Cancel Orders',
          description: 'Cancels all open orders or orders of a specified type',
          params: [
            { name: 'type', type: 'select', options: ['All', 'Limit', 'Stop Loss', 'Take Profit'], default: 'All' }
          ],
          category: 'Risk Management'
        },
        
        // Position Management
        { id: 'close_position', name: 'Close Position',
          description: 'Closes all or part of the current position',
          params: [
            { name: 'amount', type: 'number', default: 100 },
            { name: 'amount_type', type: 'select', options: ['%'], default: '%' }
          ],
          category: 'Position Management'
        },
        { id: 'close_positions', name: 'Close All Positions',
          description: 'Closes all open positions',
          params: [],
          category: 'Position Management'
        },
        
        // Leverage and Margin
        { id: 'set_leverage', name: 'Set Leverage',
          description: 'Sets the leverage for future trades',
          params: [
            { name: 'value', type: 'number', default: 1 },
            { name: 'max_leverage', type: 'number', default: 10 }
          ],
          category: 'Leverage'
        },
        { id: 'adjust_margin', name: 'Adjust Margin',
          description: 'Adds or removes margin from an existing position',
          params: [
            { name: 'amount', type: 'number', default: 100 },
            { name: 'action', type: 'select', options: ['Add', 'Remove'], default: 'Add' }
          ],
          category: 'Leverage'
        },
        
        // Notifications
        { id: 'send_notification', name: 'Send Notification',
          description: 'Sends a notification with a custom message',
          params: [
            { name: 'message', type: 'text', default: 'Strategy alert triggered!' },
            { name: 'type', type: 'select', options: ['Email', 'Push', 'SMS', 'All'], default: 'All' }
          ],
          category: 'Notifications'
        },
        { id: 'log_event', name: 'Log Event',
          description: 'Records an event in the trading journal',
          params: [
            { name: 'message', type: 'text', default: 'Event logged' },
            { name: 'importance', type: 'select', options: ['Low', 'Medium', 'High'], default: 'Medium' }
          ],
          category: 'Notifications'
        }
    ];
    
    // Handle container registration from CommandContainer components
    function handleContainerRegistration(event) {
        const { id, level, type, name, parentId } = event.detail;
        
        // Update allCommandContainers array
        const existingIndex = allCommandContainers.findIndex(c => c.id === id);
        if (existingIndex >= 0) {
            allCommandContainers[existingIndex] = { id, level, type, name, parentId };
        } else {
            allCommandContainers = [...allCommandContainers, { id, level, type, name, parentId }];
        }
    }
    
    // Handle container visibility updates
    function handleContainerVisibility(event) {
        const { id, isVisible } = event.detail;
        
        if (isVisible) {
            visibleContainers.add(id);
        } else {
            visibleContainers.delete(id);
        }
        
        // Force Svelte to recognize the change in the Set
        visibleContainers = new Set(visibleContainers);
    }
    
    // Add this handler for child container events
    function handleChildContainer(event) {
        const { childId, parentId, level, type, name } = event.detail;
        
        // Update allCommandContainers array with the child container info
        const existingIndex = allCommandContainers.findIndex(c => c.id === childId);
        if (existingIndex >= 0) {
            allCommandContainers[existingIndex] = { 
                id: childId, 
                level, 
                type, 
                name, 
                parentId  // This is critical for the parent-child relationship
            };
        } else {
            allCommandContainers = [...allCommandContainers, { 
                id: childId, 
                level, 
                type, 
                name, 
                parentId
            }];
        }
    }
    
    onMount(() => {
        // Get strategy ID from URL
        strategyId = $page.params.id;
        
        // Load strategy
        const storedStrategiesStr = localStorage.getItem('draftStrategies');
        if (storedStrategiesStr) {
            const storedStrategies = JSON.parse(storedStrategiesStr);
        
        if (storedStrategies[strategyId]) {
            strategy = storedStrategies[strategyId];
            
                // Initialize containers from strategy
                containers = strategy.script?.containers || [];
                
                // Ensure each container has a containerType
                containers = containers.map(container => ({
                    ...container,
                    containerType: container.containerType || 'IF'
                }));
                
                // Set initial execution frequency
                executionFrequency = strategy.executionFrequency || "candle_close";
                
                // Add default container if none exists
                if (containers.length === 0) {
                    addContainer();
                }
                
                // Update strategy with the new container
                strategy.script = { containers };
                saveStrategy();
            }
        } else {
            error = "Strategy not found";
        }
        
        // Global drag and drop event listeners - REMOVED
        
        return () => {
            // Cleanup event listeners - REMOVED
        };
    });
    
    // Save strategy to localStorage
    function saveStrategy() {
        if (!strategy) return;
        
        strategy.script = { containers };
        strategy.lastUpdated = new Date().toISOString();
        
        const storedStrategies = localStorage.getItem('draftStrategies') 
            ? JSON.parse(localStorage.getItem('draftStrategies')) 
            : {};
        
        storedStrategies[strategyId] = strategy;
        localStorage.setItem('draftStrategies', JSON.stringify(storedStrategies));
    }
    
    // Add a new container
    function addContainer() {
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
        containers = [...containers, ifContainer, elseContainer];
        saveStrategy();
    }
    
    // Handle container update
    function handleContainerUpdate(event) {
        const { index, container } = event.detail;
        containers[index] = container;
        saveStrategy();
    }
    
    // Handle container removal
    function handleContainerRemove(event) {
        const { index, container } = event.detail;
        
        // ทุกครั้งที่ลบ Container (IF หรือ ELSE_IF) ลบทั้งกลุ่ม
        // ไม่ว่าจะลบ Container ใด ให้ลบทั้งชุด IF/ELSE_IF/ELSE
        // ต้องรองรับ nested containers ด้วย (containers ที่ซ้อนกันหลายระดับ)
        
        // ฟังก์ชันสำหรับการลบ containers แบบ nested (recursively)
        function removeContainerGroup(containersList, targetContainer) {
            if (!containersList || containersList.length === 0) return containersList;
            
            // สร้าง array ใหม่ที่ลบทั้งกลุ่ม container ออกไป
            const newContainers = [];
            
            // ใช้ flag เพื่อตรวจสอบว่าอยู่ในกลุ่มเดียวกันหรือไม่
            let skipGroup = false;
            let currentGroupIfId = null;
            
            // ตรวจสอบทีละ container
            for (let i = 0; i < containersList.length; i++) {
                const current = containersList[i];
                
                // ตรวจสอบว่าเป็น IF ที่เริ่มกลุ่มใหม่หรือไม่
                if (current.containerType === 'IF') {
                    // ถ้าเป็น IF ตัวที่ต้องการลบ
                    if (current.id === targetContainer.id) {
                        // เริ่มข้าม (skip) ทั้งกลุ่มนี้
                        skipGroup = true;
                        currentGroupIfId = current.id;
                        continue; // ข้าม container นี้
                    } 
                    // ถ้าเป็น ELSE_IF ที่ต้องการลบ ต้องหา IF ที่เป็นพ่อของมัน
                    else if (targetContainer.containerType === 'ELSE_IF' && 
                             current.id === targetContainer.parentIfId) {
                        // ลบทั้งกลุ่มที่มี parentIfId เดียวกัน
                        skipGroup = true;
                        currentGroupIfId = current.id;
                        continue;
                    } else {
                        // ถ้าเป็น IF ตัวใหม่ที่ไม่ใช่ตัวที่ต้องการลบ
                        skipGroup = false;
                        currentGroupIfId = current.id;
                    }
                }
                
                // ถ้าเป็น ELSE_IF หรือ ELSE ที่เกี่ยวข้องกับ IF ที่ต้องการลบ
                if ((current.containerType === 'ELSE_IF' || current.containerType === 'ELSE') &&
                    (current.parentIfId === currentGroupIfId && skipGroup)) {
                    continue; // ข้าม container นี้
                }
                
                // ตรวจสอบลูกของ container นี้ (recursive)
                if (current.children && current.children.length > 0) {
                    // ถ้ามี container ที่ต้องการลบอยู่ในลูก
                    if (current.children.some(child => child.id === targetContainer.id || 
                       (targetContainer.containerType === 'ELSE_IF' && 
                        child.id === targetContainer.parentIfId))) {
                        // ลบกลุ่ม containers ในลูก
                        current.children = removeContainerGroup(current.children, targetContainer);
                    }
                }
                
                // เพิ่ม container ที่ไม่ได้ถูกข้ามลงในอาร์เรย์ใหม่
                newContainers.push(current);
            }
            
            return newContainers;
        }
        
        // เริ่มการลบจาก containers หลัก
        if (strategy && strategy.containers) {
            containers = removeContainerGroup(containers, container);
        }
        
        saveStrategy();
    }
    
    // Generate preview code
    function generatePreviewCode() {
        // Convert nested containers to a flatter structure for the preview
        const flattenedScript = {
            name: strategy.name,
            conditions: [],
            actions: []
        };
        
        // Helper function to flatten containers
        function flattenContainer(container) {
            flattenedScript.conditions = [...flattenedScript.conditions, ...container.conditions];
            flattenedScript.actions = [...flattenedScript.actions, ...container.actions];
            
            if (container.children && container.children.length > 0) {
                container.children.forEach(child => flattenContainer(child));
            }
        }
        
        // Process all containers
        containers.forEach(container => {
            flattenContainer(container);
        });
        
        return flattenedScript;
    }
    
    // Handle closing code preview modal
    function closeCodePreview() {
        showCodePreview = false;
    }
    
    // Save and exit
    function saveAndExit() {
        saveStrategy();
        goto('/trading-bot');
    }
    
    // Cancel and go back
    function cancel() {
        goto('/trading-bot');
    }
    
    // Handle drag end with improved cleanup
    function handleDragEnd() {
        // If there's a valid drop target when drag ends, process the drop
        if (isDragging && dropTarget && dropTargetType) {
            console.log('Processing drop on drag end:', dropTargetType, 'at index:', dropTargetIndex);
            // Create a synthetic event
            const event = new Event('drop', { bubbles: true });
            handleDrop(event);
        } else {
            // Just reset the state
            resetDragState();
        }
    }
    
    // Global drag handlers - improved to better handle drops outside editor
    function handleGlobalDragOver(event) {
        event.preventDefault();
        if (!isDragging) return;
        event.dataTransfer.dropEffect = 'move';
    }
    
    function handleGlobalDrop(event) {
        event.preventDefault();
        
        // For debugging - allow seeing if the global drop handler was called
        console.log('Global drop event triggered');
        
        if (!isDragging) {
            resetDragState();
            return;
        }
        
        // Process drop if we have valid drop target information
        if (dropTarget && dropTargetType) {
            console.log('Global drop with valid target:', dropTargetType, 'at index:', dropTargetIndex);
            handleDrop(event);
        } else {
            console.log('Global drop without valid target - resetting state');
            resetDragState();
        }
    }
    
    // Keep track of drop target position to allow drops outside the editor
    function updateDropTargetState(item, type, index, parentIndex = -1) {
        dropTarget = item;
        dropTargetType = type;
        dropTargetIndex = index;
        dropTargetParentIndex = parentIndex;
        
        // Add a visual indicator to show the current drop target
        document.querySelectorAll('.current-drop-target').forEach(el => {
            el.classList.remove('current-drop-target');
        });
        
        // Find the relevant container and add a class to highlight it
        const containerElement = document.querySelector(`[data-container-index="${index}"]`);
        if (containerElement) {
            containerElement.classList.add('current-drop-target');
        }
    }
    
    // Handler for condition selection modal
    function handleSelectCondition(event) {
        currentContainerIndex = event.detail.containerIndex;
        conditionSearchQuery = '';
        showConditionSelector = true;
    }
    
    // Handler for action selection modal
    function handleSelectAction(event) {
        currentContainerIndex = event.detail.containerIndex;
        actionSearchQuery = '';
        showActionSelector = true;
    }
    
    // Add selected condition to container
    function addConditionToContainer(condition) {
        if (currentContainerIndex === -1) return;
        
        const newCondition = {
            ...condition,
            id: `${condition.id}_${Date.now()}`,
            params: condition.params.map(p => ({ ...p, value: p.default })),
            not: false,
            disabled: false
        };
        
        containers[currentContainerIndex].conditions = [
            ...containers[currentContainerIndex].conditions,
            newCondition
        ];
        
        // Update and save
        containers = [...containers];
        saveStrategy();
        
        // Close modal
        showConditionSelector = false;
    }
    
    // Add selected action to container
    function addActionToContainer(action) {
        if (currentContainerIndex === -1) return;
        
        const newAction = {
            ...action,
            id: `${action.id}_${Date.now()}`,
            params: action.params.map(p => ({ ...p, value: p.default })),
            disabled: false
        };
        
        containers[currentContainerIndex].actions = [
            ...containers[currentContainerIndex].actions,
            newAction
        ];
        
        // Update and save
        containers = [...containers];
        saveStrategy();
        
        // Close modal
        showActionSelector = false;
    }
    
    // Close condition selector modal
    function closeConditionSelector() {
        showConditionSelector = false;
        currentContainerIndex = -1;
        conditionSearchQuery = '';
    }
    
    // Close action selector modal
    function closeActionSelector() {
        showActionSelector = false;
        currentContainerIndex = -1;
        actionSearchQuery = '';
    }
    
    // Filter conditions based on search query and get unique categories
    $: filteredConditions = conditionSearchQuery 
        ? availableConditions.filter(condition => 
            condition.name.toLowerCase().includes(conditionSearchQuery.toLowerCase()) ||
            condition.description.toLowerCase().includes(conditionSearchQuery.toLowerCase()) ||
            condition.params.some(param => param.name.toLowerCase().includes(conditionSearchQuery.toLowerCase()))
          )
        : availableConditions;
        
    // Get unique condition categories
    $: conditionCategories = [...new Set(filteredConditions.map(c => c.category))];
    
    // Group conditions by category
    $: groupedConditions = conditionCategories.map(category => ({
        category,
        conditions: filteredConditions.filter(c => c.category === category)
    }));
        
    // Filter actions based on search query
    $: filteredActions = actionSearchQuery 
        ? availableActions.filter(action => 
            action.name.toLowerCase().includes(actionSearchQuery.toLowerCase()) ||
            action.description.toLowerCase().includes(actionSearchQuery.toLowerCase()) ||
            action.params.some(param => param.name.toLowerCase().includes(actionSearchQuery.toLowerCase()))
          )
        : availableActions;
        
    // Get unique action categories
    $: actionCategories = [...new Set(filteredActions.map(a => a.category))];
    
    // Group actions by category
    $: groupedActions = actionCategories.map(category => ({
        category,
        actions: filteredActions.filter(a => a.category === category)
    }));
    
    // Save Symbol Change
    function saveSymbolChange(newSymbol) {
        if (strategy && newSymbol) {
            strategy.symbol = newSymbol;
            saveStrategy();
            showSymbolSelector = false;
        }
    }
    
    // Save Timeframe Change
    function saveTimeframeChange(newTimeframe) {
        if (strategy && newTimeframe) {
            strategy.timeframe = newTimeframe;
            saveStrategy();
            showTimeframeSelector = false;
        }
    }
    
    // Handle command container events
    function handleCommandEvents(event) {
        // ... existing code ...
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
        const newContainers = [...containers];
        newContainers.splice(afterIndex + 1, 0, elseIfContainer);
        containers = newContainers;
        
        saveStrategy();
    }
</script>

<div class="editor-container relative">
    <div class="container mx-auto p-4 max-w-6xl">
        <div class="mb-8 bg-light-card dark:bg-dark-card rounded-lg p-6 shadow border border-light-border dark:border-dark-border">
            <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
                    <h1 class="text-2xl font-bold text-light-text dark:text-dark-text mb-2">Visual Strategy Editor</h1>
                {#if strategy}
                        <div class="flex flex-wrap items-center gap-2 text-light-text-muted dark:text-dark-text-muted">
                            <span>{strategy.name}</span>
                            <span class="text-light-text-muted/50 dark:text-dark-text-muted/50">•</span>
                            <div class="flex items-center bg-theme-100/50 dark:bg-theme-900/30 rounded-full px-3 py-1 text-sm text-theme-700 dark:text-theme-300">
                                <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                                <span class="font-medium">{strategy.symbol}</span>
                                {#if showSymbolSelector}
                                    <div class="fixed inset-0 bg-black/20 dark:bg-black/40 z-40" on:click={() => showSymbolSelector = false}></div>
                                    <div class="absolute z-50 mt-2 bg-white dark:bg-dark-card rounded-lg shadow-lg border border-light-border dark:border-dark-border p-4 w-64">
                                        <h4 class="font-medium mb-2 text-light-text dark:text-dark-text">Select Symbol</h4>
                                        <div class="max-h-64 overflow-y-auto">
                                            {#each symbols as sym}
                                                <button
                                                    class="block w-full text-left p-2 rounded hover:bg-light-hover dark:hover:bg-dark-hover text-light-text dark:text-dark-text"
                                                    on:click={() => saveSymbolChange(sym)}
                                                >
                                                    {sym}
                                                </button>
                                            {/each}
                                        </div>
                                    </div>
                                {:else}
                                    <button class="ml-1.5 text-theme-500/70 hover:text-theme-500" on:click={() => showSymbolSelector = true}>
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                {/if}
                            </div>
                            <span class="text-light-text-muted/50 dark:text-dark-text-muted/50">•</span>
                            <div class="flex items-center bg-theme-100/50 dark:bg-theme-900/30 rounded-full px-3 py-1 text-sm text-theme-700 dark:text-theme-300">
                                <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span class="font-medium">{strategy.timeframe}</span>
                                {#if showTimeframeSelector}
                                    <div class="fixed inset-0 bg-black/20 dark:bg-black/40 z-40" on:click={() => showTimeframeSelector = false}></div>
                                    <div class="absolute z-50 mt-2 bg-white dark:bg-dark-card rounded-lg shadow-lg border border-light-border dark:border-dark-border p-4 w-64">
                                        <h4 class="font-medium mb-2 text-light-text dark:text-dark-text">Select Timeframe</h4>
                                        <div class="max-h-64 overflow-y-auto">
                                            {#each timeframes as tf}
                                                <button
                                                    class="block w-full text-left p-2 rounded hover:bg-light-hover dark:hover:bg-dark-hover text-light-text dark:text-dark-text"
                                                    on:click={() => saveTimeframeChange(tf.value)}
                                                >
                                                    {tf.label}
                                                </button>
                                            {/each}
                                        </div>
                                    </div>
                                {:else}
                                    <button class="ml-1.5 text-theme-500/70 hover:text-theme-500" on:click={() => showTimeframeSelector = true}>
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                {/if}
                            </div>
                        </div>
                {/if}
            </div>
            <div class="flex space-x-2">
                    <Button variant="secondary" size="sm" on:click={cancel} class="bg-white/20 hover:bg-white/30 text-white border-white/30">
                    Cancel
                </Button>
                    <Button variant="primary" size="sm" on:click={saveAndExit} class="bg-white hover:bg-white/90 text-indigo-600 font-medium shadow-md">
                    Save & Exit
                </Button>
                </div>
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
        
        <!-- Usage hint -->
        
        {#if strategy}
            <!-- Execution Frequency Selector -->
            <div class="mb-6 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-100 dark:border-purple-800/30 rounded-xl shadow-md p-6 transition-all duration-200 hover:shadow-lg">
                <div class="flex flex-col md:flex-row md:items-start gap-6">
                    <div class="flex-shrink-0 md:w-1/4">
                        <div class="flex items-center">
                            <div class="p-2.5 bg-purple-100 dark:bg-purple-800/30 rounded-lg mr-3">
                                <svg class="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                </div>
                            <h3 class="font-semibold text-xl text-light-text dark:text-dark-text">Execution Frequency</h3>
            </div>
                        <p class="text-light-text-muted dark:text-dark-text-muted text-sm mt-3 ml-11 leading-relaxed">
                            Choose how often your strategy should check market conditions and execute trades. The frequency affects performance and resource usage.
                        </p>
        </div>
        
                    <div class="flex-grow md:w-3/4">
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {#each availableFrequencies as freq}
                                <div 
                                    class="relative border rounded-xl p-4 transition-all duration-200
                                        {executionFrequency === freq.id 
                                            ? 'border-purple-400 bg-white dark:bg-dark-card shadow-md ring-2 ring-purple-400/50' 
                                            : 'border-light-border dark:border-dark-border bg-white/60 dark:bg-dark-card/60 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-white dark:hover:bg-dark-card'}"
                                    on:click={() => {
                                        executionFrequency = freq.id;
                                        if (strategy) {
                                            strategy.executionFrequency = freq.id;
                                            saveStrategy();
                                        }
                                    }}
                                >
                                    {#if executionFrequency === freq.id}
                                        <div class="absolute top-3 right-3 text-purple-500">
                                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                                            </svg>
                                        </div>
                                    {/if}
                                    
                                    <div class="font-medium text-lg text-light-text dark:text-dark-text mb-2">
                                        {freq.name}
                                    </div>
                                    <div class="text-light-text-muted dark:text-dark-text-muted text-sm mb-3 leading-relaxed">
                                        {freq.description}
                                    </div>
                                    
                                    {#if freq.id === 'second_1' || freq.id === 'second_5'}
                                        <div class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium 
                                        {freq.id === 'second_1' 
                                            ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300' 
                                            : 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300'}">
                                            <svg class="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                            </svg>
                                            {freq.id === 'second_1' ? 'Pro+' : 'Pro'}
                                        </div>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="mb-4 flex items-center justify-between">
                <div>
                    <Button variant="secondary" size="sm" on:click={addContainer}>
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Command Group
                    </Button>
                </div>
                <div>
                    <Button variant="outline" size="sm" on:click={() => showCodePreview = true}>
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                        Preview Code
                    </Button>
                </div>
            </div>
            
            <div class="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-sm p-4">
                {#if containers.length === 0}
                    <div class="p-6 border border-dashed border-light-border dark:border-dark-border rounded-md text-center text-light-text-muted dark:text-dark-text-muted">
                        No command groups added. Click "Add Command Group" to create one.
                    </div>
                {:else}
                    <div class="relative">
                        {#each containers as container, i}
                            <div 
                                class="relative command-container-wrapper {i > 0 ? 'mt-4' : ''}"
                                data-container-index={i}
                            >
                                <div class="command-container-content">
                                    <CommandContainer 
                                        container={container}
                                        index={i}
                                        nestingLevel={0}
                                        siblingContainers={containers}
                                        on:update={handleContainerUpdate}
                                        on:remove={handleContainerRemove}
                                        on:selectcondition={handleSelectCondition}
                                        on:selectaction={handleSelectAction}
                                        on:registercontainer={handleContainerRegistration}
                                        on:containervisible={handleContainerVisibility}
                                        on:childcontainer={handleChildContainer}
                                    />
                                </div>
                                
                                <!-- Add ELSE_IF button between IF/ELSE_IF and the next container -->
                                {#if (container.containerType === 'IF' || container.containerType === 'ELSE_IF') && 
                                    i + 1 < containers.length && 
                                    (containers[i+1].containerType === 'ELSE_IF' || containers[i+1].containerType === 'ELSE') &&
                                    containers[i+1].parentIfId === (container.containerType === 'IF' ? container.id : container.parentIfId)}
                                    <div class="flex justify-center -mt-2 mb-2 relative z-10">
                                        <button 
                                            class="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800 hover:bg-purple-200 dark:hover:bg-purple-800/60 transition-colors duration-200 shadow-sm"
                                            on:click={() => addElseIfContainer(
                                                container.containerType === 'IF' ? container : containers.find(c => c.id === container.parentIfId), 
                                                i
                                            )}
                                        >
                                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                            Add ELSE IF
                                        </button>
                                    </div>
                                {/if}
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
            
            <!-- Code Preview Modal -->
            <Modal 
                bind:show={showCodePreview} 
                width="4xl"
                title=""
                hideHeader={true}
                on:close={closeCodePreview}
            >
                <div slot="body" class="p-0">
                    <div class="flex items-center justify-between p-4 mb-0 border-b border-light-border dark:border-dark-border">
                        <h2 class="text-xl font-bold text-light-text dark:text-dark-text flex items-center">
                            <svg class="w-6 h-6 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            JSON Configuration Preview
                        </h2>
                        <button 
                            class="p-1 rounded-lg text-light-text-muted dark:text-dark-text-muted 
                                   hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover"
                            on:click={closeCodePreview}
                        >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    <div class="p-4 pt-2">
                    <VisualScriptPreview script={generatePreviewCode()} />
                </div>
                </div>
            </Modal>
        {/if}
    </div>
</div>

<!-- Modal for condition selection -->
{#if showConditionSelector}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm transition-opacity duration-200"
         transition:fade={{ duration: 200 }}>
        <div class="bg-white dark:bg-gray-800 dark:text-gray-100 rounded-xl shadow-2xl p-6 max-w-4xl w-full mx-4 h-[600px] flex flex-col border border-gray-200 dark:border-gray-700 transform transition-all duration-200"
             transition:fly={{ y: 20, duration: 300 }}>
            <div class="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
                <div class="flex items-center">
                    <div class="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mr-3 flex-shrink-0 border border-blue-200 dark:border-blue-800">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <h2 class="text-2xl font-bold">Select Condition</h2>
                </div>
                
                <div class="flex items-center gap-2">
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input 
                            type="text" 
                            placeholder="Search conditions..." 
                            class="block w-48 pl-10 pr-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 border-0 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                            bind:value={conditionSearchQuery}
                        />
                    </div>
                    
                    <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" on:click={closeConditionSelector}>
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
            
            <div class="mb-4">
                <p class="text-gray-600 dark:text-gray-300 text-sm">Select a condition to add to your trading strategy. Conditions determine when your actions will be executed.</p>
            </div>
            
            <div class="overflow-y-auto flex-grow pr-1 -mr-1">
                {#if filteredConditions.length === 0}
                    <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p class="mt-2 text-lg font-medium">No matching conditions found</p>
                        <p class="mt-1">Try adjusting your search query or browse all available conditions.</p>
                    </div>
                {:else}
                    <div class="space-y-6">
                        {#each groupedConditions as group}
                            <div>
                                <h3 class="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3 px-1 flex items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                                    {#if group.category === 'Price'}
                                        <svg class="w-5 h-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                        </svg>
                                    {:else if group.category === 'Indicators'}
                                        <svg class="w-5 h-5 mr-2 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                                        </svg>
                                    {:else if group.category === 'Volume'}
                                        <svg class="w-5 h-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    {:else if group.category === 'Crypto'}
                                        <svg class="w-5 h-5 mr-2 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    {:else}
                                        <svg class="w-5 h-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                                        </svg>
                                    {/if}
                                    {group.category}
                                </h3>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {#each group.conditions as condition}
                                        <button 
                                            class="group relative p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 bg-white dark:bg-gray-800 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 text-left transition-all duration-200 shadow-sm hover:shadow"
                                            on:click={() => addConditionToContainer(condition)}
                                        >
                                            <div class="absolute left-0 top-0 bottom-0 w-1 bg-blue-400 dark:bg-blue-500 rounded-l-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            <div class="flex items-start">
                                                <div class="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mr-3 flex-shrink-0 border border-blue-200 dark:border-blue-800">
                                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                    </svg>
                                                </div>
                                                <div class="flex-1">
                                                    <div class="font-medium text-lg text-gray-900 dark:text-gray-100 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                        {condition.name}
                                                    </div>
                                                    <div class="text-gray-500 dark:text-gray-400 text-sm mb-2 line-clamp-2">
                                                        {condition.description}
                                                    </div>
                                                    {#if condition.params.length > 0}
                                                        <div class="mt-2 flex flex-wrap gap-2">
                                                            {#each condition.params as param}
                                                                <span class="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 flex items-center">
                                                                    <span class="font-medium">{param.name}</span>
                                                                    {#if param.type === 'number'}
                                                                        <span class="ml-1 text-gray-500 dark:text-gray-400">(number)</span>
                                                                    {:else if param.type === 'select'}
                                                                        <span class="ml-1 text-gray-500 dark:text-gray-400">(select)</span>
                                                                    {/if}
                                                                </span>
                                                            {/each}
                                                        </div>
                                                    {/if}
                                                </div>
                                                <div class="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div class="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    {/each}
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}

<!-- Modal for action selection -->
{#if showActionSelector}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm transition-opacity duration-200"
         transition:fade={{ duration: 200 }}>
        <div class="bg-white dark:bg-gray-800 dark:text-gray-100 rounded-xl shadow-2xl p-6 max-w-4xl w-full mx-4 h-[600px] flex flex-col border border-gray-200 dark:border-gray-700 transform transition-all duration-200"
             transition:fly={{ y: 20, duration: 300 }}>
            <div class="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
                <div class="flex items-center">
                    <div class="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 flex items-center justify-center mr-3 flex-shrink-0 border border-green-200 dark:border-green-800">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h2 class="text-2xl font-bold">Select Action</h2>
                </div>
                
                <div class="flex items-center gap-2">
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input 
                            type="text" 
                            placeholder="Search actions..." 
                            class="block w-48 pl-10 pr-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 border-0 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                            bind:value={actionSearchQuery}
                        />
                    </div>
                    
                    <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" on:click={closeActionSelector}>
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
            
            <div class="mb-4">
                <p class="text-gray-600 dark:text-gray-300 text-sm">Select an action to add to your trading strategy. Actions will be executed when all conditions are met.</p>
            </div>
            
            <div class="overflow-y-auto flex-grow pr-1 -mr-1">
                {#if filteredActions.length === 0}
                    <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p class="mt-2 text-lg font-medium">No matching actions found</p>
                        <p class="mt-1">Try adjusting your search query or browse all available actions.</p>
                    </div>
                {:else}
                    <div class="space-y-6">
                        {#each groupedActions as group}
                            <div>
                                <h3 class="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3 px-1 flex items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                                    {#if group.category === 'Market Orders'}
                                        <svg class="w-5 h-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    {:else if group.category === 'Limit Orders'}
                                        <svg class="w-5 h-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                        </svg>
                                    {:else if group.category === 'Risk Management'}
                                        <svg class="w-5 h-5 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    {:else if group.category === 'Position Management'}
                                        <svg class="w-5 h-5 mr-2 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                        </svg>
                                    {:else if group.category === 'Leverage'}
                                        <svg class="w-5 h-5 mr-2 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                        </svg>
                                    {:else if group.category === 'Notifications'}
                                        <svg class="w-5 h-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                        </svg>
                                    {:else}
                                        <svg class="w-5 h-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                                        </svg>
                                    {/if}
                                    {group.category}
                                </h3>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {#each group.actions as action}
                                        <button 
                                            class="group relative p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-green-400 dark:hover:border-green-500 bg-white dark:bg-gray-800 hover:bg-green-50/50 dark:hover:bg-green-900/20 text-left transition-all duration-200 shadow-sm hover:shadow"
                                            on:click={() => addActionToContainer(action)}
                                        >
                                            <div class="absolute left-0 top-0 bottom-0 w-1 bg-green-400 dark:bg-green-500 rounded-l-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            <div class="flex items-start">
                                                <div class="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 flex items-center justify-center mr-3 flex-shrink-0 border border-green-200 dark:border-green-800">
                                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                    </svg>
                                                </div>
                                                <div class="flex-1">
                                                    <div class="font-medium text-lg text-gray-900 dark:text-gray-100 mb-1 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                                                        {action.name}
                                                    </div>
                                                    <div class="text-gray-500 dark:text-gray-400 text-sm mb-2 line-clamp-2">
                                                        {action.description}
                                                    </div>
                                                    {#if action.params.length > 0}
                                                        <div class="mt-2 flex flex-wrap gap-2">
                                                            {#each action.params as param}
                                                                <span class="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 flex items-center">
                                                                    <span class="font-medium">{param.name}</span>
                                                                    {#if param.type === 'number'}
                                                                        <span class="ml-1 text-gray-500 dark:text-gray-400">(number)</span>
                                                                    {:else if param.type === 'select'}
                                                                        <span class="ml-1 text-gray-500 dark:text-gray-400">(select)</span>
                                                                    {:else if param.type === 'text'}
                                                                        <span class="ml-1 text-gray-500 dark:text-gray-400">(text)</span>
                                                                    {/if}
                                                                </span>
                                                            {/each}
                                                        </div>
                                                    {/if}
                                                </div>
                                                <div class="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div class="h-6 w-6 rounded-full bg-green-500 text-white flex items-center justify-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    {/each}
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
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
    
    /* Logical operators */
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
</style> 

<!-- Add the mini-map component at the bottom of your template -->
{#if showMiniMap}
    <CommandMiniMap 
        containers={allCommandContainers} 
        visibleContainers={visibleContainers} 
    />
{/if}

<!-- ในส่วนของ UI ที่เหมาะสม เช่น sidebar หรือ floating panel -->
<div class="mini-map-panel fixed right-4 bottom-4 z-10 shadow-lg">
    <CommandMiniMap 
        containers={containers} 
        activeContainerId={activeContainerId}
        on:selectcontainer={handleMiniMapSelect}
    />
</div>