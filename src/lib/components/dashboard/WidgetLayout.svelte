<script>
    import { writable } from 'svelte/store';
    import { dndzone } from 'svelte-dnd-action';
    import { fly } from 'svelte/transition';
    import TradeCalendar from './TradeCalendar.svelte';
    import MonthTradeCalendar from './MonthTradeCalendar.svelte';
    import TradingStats from './TradingStats.svelte';
    import StatsCard from './StatsCard.svelte';
    import TradeChart from './TradeChart.svelte';
    import Modal from '../common/Modal.svelte';
    import { onMount, createEventDispatcher } from 'svelte';
    import Button from '../common/Button.svelte';
    import ProfitTargetWidget from './ProfitTargetWidget.svelte';
    import OpenPositionsWidget from './OpenPositionsWidget.svelte';
    const dispatch = createEventDispatcher();
    let mounted = false;

    // เพิ่มตัวแปรสำหรับนับ sequence
    let idCounter = 0;

    onMount(() => {
        mounted = true;
        return () => {
            mounted = false;
            idCounter = 0;
        };
    });

    // Widget configurations with predefined sizes
    export let defaultWidgetConfigs = {
        TradingStats: { cols: 12, rows: 2, height: 140, textSize: 'medium' },
        StatsCards: { cols: 2, rows: 8, height: 560, textSize: 'medium' },
        TradeCalendar: { cols: 6, rows: 8, height: 560, textSize: 'medium' },
        MonthTradeCalendar: { cols: 6, rows: 8, height: 560, textSize: 'medium' },
        TradeChart: { cols: 4, rows: 8, height: 560, textSize: 'medium' },
        ProfitTargetWidget: { cols: 4, rows: 0.75, height: 52.5, textSize: 'medium', period: 'daily', target: 1000 },
        OpenPositionsWidget: { cols: 4, rows: 4, height: 280, textSize: 'medium'}
    };

    // เพิ่มการกำหนดจำนวนสูงสุดของแต่ละ widget
    const widgetLimits = {
        TradeCalendar: 3,
        MonthTradeCalendar: 3,
        TradeChart: 3,
        StatsCards: 1,
        TradingStats: 1,
        ProfitTargetWidget: 3,
        OpenPositionsWidget: 3
    };

    // ปรับปรุง availableWidgets เพื่อแสดงจำนวนที่เหลือ
    const availableWidgets = [
        { 
            id: 'TradingStats',
            title: 'Trading Stats',
            icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z',
            config: {...defaultWidgetConfigs.TradingStats}
        },
        { 
            id: 'StatsCards',
            title: 'Stats Cards',
            icon: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z',
            config: {...defaultWidgetConfigs.StatsCards}
        },
        { 
            id: 'TradeCalendar',
            title: 'Daily Calendar',
            icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
            config: {...defaultWidgetConfigs.TradeCalendar}
        },
        { 
            id: 'MonthTradeCalendar',
            title: 'Monthly Calendar',
            icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
            config: {...defaultWidgetConfigs.MonthTradeCalendar}
        },
        { 
            id: 'TradeChart',
            title: 'Chart',
            icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z',
            config: {...defaultWidgetConfigs.TradeChart}
        },
        { 
            id: 'ProfitTargetWidget',
            title: 'Profit Target',
            icon: 'M12 3v18m9-9H3',
            config: {...defaultWidgetConfigs.ProfitTargetWidget}
        }
    ];

    export let openTrades = [];
    export let closedTrades = [];
    export let totalPnL = 0;
    export let winRate = 0;
    export let accountId = null;
    export let widgets = []; // Now receiving widgets as a prop instead of managing internally
    export let editMode = false;
    export let trades = [];

    // Initialize widgets with saved layout from localStorage or default layout
    // ปรับปรุงฟังก์ชัน getInitialLayout เพื่อสร้าง unique IDs
    function getInitialLayout() {
        const savedLayout = localStorage.getItem('widgetLayout');
        if (savedLayout) {
            const parsed = JSON.parse(savedLayout);
            return parsed.map(widget => ({
                ...widget,
                props: getWidgetProps(widget.id.split('_')[0], widget.config)
            }));
        }

        const timestamp = Date.now();
        // สร้าง initial widgets พร้อม unique IDs
        return [
            { 
                id: createUniqueId('TradingStats'),
                config: {...defaultWidgetConfigs.TradingStats}
            },
            { 
                id: createUniqueId('StatsCards'),
                config: {...defaultWidgetConfigs.StatsCards},
                props: { totalPnL, openTrades, closedTrades, winRate }
            },
            { 
                id: createUniqueId('TradeCalendar'),
                config: {...defaultWidgetConfigs.TradeCalendar},
                props: { trades: [...openTrades, ...closedTrades], accountId }
            },
            { 
                id: createUniqueId('TradeChart'),
                config: {...defaultWidgetConfigs.TradeChart},
                props: { openTrades, closedTrades }
            }
        ];
    }

    // เพิ่มฟังก์ชันสร้าง unique ID
    function createUniqueId(baseType) {
        return `${baseType}_${generateUUID()}`;
    }

    // เพิ่ม UUID generator function
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // ปรับปรุง getComponentByName เพื่อจัดการ shadow placeholders
    function getComponentByName(id) {
        if (!id || id.includes('dnd-shadow') || id.includes('placeholder')) {
            return null;
        }
        
        // Extract the base component type from the ID
        const baseType = id.split('_')[0];
        
        const componentMap = {
            'TradingStats': TradingStats,
            'StatsCards': StatsCard,
            'TradeCalendar': TradeCalendar,
            'MonthTradeCalendar': MonthTradeCalendar,
            'TradeChart': TradeChart,
            'ProfitTargetWidget': ProfitTargetWidget,
            'OpenPositionsWidget': OpenPositionsWidget
        };

        return componentMap[baseType] || null;
    }

    function getWidgetProps(baseType, config) {
        if (baseType === 'StatsCards') {
            return { totalPnL, openTrades, closedTrades, winRate };
        } else if (baseType === 'TradeCalendar' || baseType === 'MonthTradeCalendar') {
            return { trades: [...openTrades, ...closedTrades], accountId };
        } else if (baseType === 'TradeChart') {
            return { openTrades, closedTrades };
        } else if (baseType === 'ProfitTargetWidget') {
            return {
                trades,
                period: config.period,
                target: config.target
            };
        } else if (baseType === 'OpenPositionsWidget') {
            return { trades, theme: config.theme };
        }
        return {};
    }

    function backupLayout($widgets) {
        return $widgets.map(widget => ({
            id: widget.id,
            config: {...widget.config},
            props: widget.props ? {...widget.props} : undefined
        }));
    }

    function restoreLayout(backupData) {
        return backupData.map(widget => ({
            ...widget,
            props: getWidgetProps(widget.id.split('_')[0], widget.config)
        }));
    }

    let tempWidgets; // Store temporary layout during edit mode
    let showConfigModal = false;
    let selectedWidgetForConfig = null;
    let showWidgetModal = false;

    function toggleEditMode() {
        if (!editMode) {
            // Entering edit mode - store current layout without components
            tempWidgets = backupLayout(widgets);
        }
        editMode = !editMode;
        dispatch('editModeChange', editMode);
    }

    function saveLayout() {
        // Save to localStorage
        const savableWidgets = widgets.map(widget => ({
            id: widget.id,
            config: widget.config,
            props: widget.props
        }));
        localStorage.setItem('widgetLayout', JSON.stringify(savableWidgets));
        editMode = false;
        dispatch('editModeChange', false);
    }

    function cancelEdit() {
        // Restore previous layout with components
        widgets = restoreLayout(tempWidgets);
        editMode = false;
        dispatch('editModeChange', false);
    }

    function handleAddWidget(baseType) {
        // ตรวจสอบจำนวนที่เหลือ
        const currentCount = getWidgetTypeCount(widgets, baseType);
        const maxCount = widgetLimits[baseType] || 1;

        if (currentCount >= maxCount) {
            alert(`Maximum ${maxCount} ${baseType} widgets allowed`);
            return;
        }

        // สร้าง widget ใหม่
        const newWidget = createNewWidget(baseType);
        
        // ตรวจสอบว่า ID ไม่ซ้ำกับ widgets ที่มีอยู่
        while (widgets.some(w => w.id === newWidget.id)) {
            newWidget.id = createUniqueId(baseType);
        }
        
        // เพิ่ม widget และ force re-render
        dispatch('updateWidgets', [...widgets, newWidget]);
        
        // ปิด modal หลังจากเพิ่ม widget
        showWidgetModal = false;
    }

    // แยกฟังก์ชันสร้าง widget ใหม่
    function createNewWidget(baseType) {
        const uniqueId = createUniqueId(baseType);
        const newWidget = {
            id: uniqueId,
            config: {...defaultWidgetConfigs[baseType]},
            props: getWidgetProps(baseType, defaultWidgetConfigs[baseType])
        };
        return newWidget;
    }

    // เพิ่มฟังก์ชันนับจำนวน widget แต่ละประเภท
    function getWidgetTypeCount(widgets, baseType) {
        return widgets.filter(w => w.id.startsWith(baseType)).length;
    }

    // คำนวณจำนวน widget ที่เหลือสำหรับสดงใน widget bar
    $: availableWidgetsWithCount = availableWidgets.map(widget => ({
        ...widget,
        remaining: (widgetLimits[widget.id] || 1) - getWidgetTypeCount(widgets, widget.id)
    }));

    // ปรับปรุง reactive statements สำหรับการอัพเดท props
    $: {
        if (widgets) {
            widgets.forEach(widget => {
                if (!widget.id.includes('dnd-shadow')) {
                    const baseType = widget.id.split('_')[0];
                    widget.props = getWidgetProps(baseType, widget.config);
                }
            });
        }
    }

    // Replace the handleDndConsider function
    function handleDndConsider(e) {
        const { items } = e.detail;
        dispatch('updateWidgets', items);
    }

    // Replace the handleDndFinalize function
    function handleDndFinalize(e) {
        const { items } = e.detail;
        dispatch('updateWidgets', items);
        // Keep edit mode on after drag and drop
    }

    // เพิ่มฟังก์ชัน openWidgetConfig
    function openWidgetConfig(widget) {
        selectedWidgetForConfig = { ...widget };
        showConfigModal = true;
    }

    // เพิ่มฟังก์ชัน updateWidgetConfig
    function updateWidgetConfig() {
        if (selectedWidgetForConfig) {
            // Calculate height based on rows (70px per row)
            const height = selectedWidgetForConfig.config.rows * 70;
            
            const updatedWidgets = widgets.map(w => 
                w.id === selectedWidgetForConfig.id 
                ? {
                    ...w, 
                    config: {
                        ...selectedWidgetForConfig.config,
                        height
                    },
                    props: getWidgetProps(w.id.split('_')[0], selectedWidgetForConfig.config)
                } 
                : w
            );
            dispatch('updateWidgets', updatedWidgets);
            showConfigModal = false;
        }
    }

    function deleteWidget(widgetId) {
        const updatedWidgets = widgets.filter(widget => widget.id !== widgetId);
        dispatch('updateWidgets', updatedWidgets);
        showConfigModal = false;
    }

    let touchTimeout;
    let touchStartEvent;
    let initialTouchX, initialTouchY;

    function handleWidgetPointerDown(event, widgetId) {
        if (editMode) return;

        // Check if the event target is inside a modal
        if (event.target.closest('.modal')) return;

        initialTouchX = event.clientX;
        initialTouchY = event.clientY;
        touchStartEvent = event;
        touchTimeout = setTimeout(() => {
            toggleEditMode();
            startDragging(widgetId, touchStartEvent);
        }, 500); // 2 วินาที
    }

    function handleWidgetPointerMove(event) {
        if (Math.abs(event.clientX - initialTouchX) > 10 || Math.abs(event.clientY - initialTouchY) > 10) {
            clearTimeout(touchTimeout);
        }
    }

    function handleWidgetPointerUp() {
        clearTimeout(touchTimeout);
    }

    function startDragging(widgetId, event) {
        // เริ่มการลากวิดเจ��อหุการลาก
        const widgetElement = document.getElementById(`widget-${widgetId}`);
        if (widgetElement && event) {
            const dragEvent = new DragEvent('dragstart', {
                bubbles: true,
                cancelable: true,
                clientX: event.clientX,
                clientY: event.clientY,
                dataTransfer: new DataTransfer()
            });
            widgetElement.dispatchEvent(dragEvent);
        }
    }

    // Add widget descriptions
    function getWidgetDescription(widgetId) {
        const descriptions = {
            TradingStats: {
                title: "Trading Statistics Overview",
                description: "Displays key trading metrics across different time periods. Shows profit/loss, number of trades, and performance percentages for daily, weekly, monthly, and yearly periods.",
                features: [
                    "Multiple time period views",
                    "Real-time P&L tracking",
                    "Performance percentage calculations",
                    "Trade count statistics"
                ]
            },
            
            StatsCards: {
                title: "Trading Performance Cards",
                description: "A comprehensive view of your trading performance metrics in an easy-to-read card format.",
                features: [
                    "Total profit/loss display",
                    "Open positions counter",
                    "Total trades tracker",
                    "Win rate percentage"
                ]
            },
            
            TradeCalendar: {
                title: "Daily Trading Calendar",
                description: "A detailed calendar view showing your daily trading activity with color-coded performance indicators.",
                features: [
                    "Daily profit/loss tracking",
                    "Trade entry/exit visualization",
                    "Transaction history integration",
                    "Color-coded performance indicators"
                ]
            },
            
            MonthTradeCalendar: {
                title: "Monthly Trading Overview",
                description: "Aggregated monthly view of your trading performance with detailed statistics for each month.",
                features: [
                    "Monthly performance summary",
                    "Win rate statistics",
                    "Total P&L per month",
                    "Trade volume tracking"
                ]
            },
            
            TradeChart: {
                title: "Performance Chart",
                description: "Interactive chart displaying your trading performance over time with detailed analytics.",
                features: [
                    "Performance trend visualization",
                    "Profit/loss tracking over time",
                    "Interactive data points",
                    "Custom date range selection"
                ]
            },
            
            ProfitTargetWidget: {
                title: "Profit Goal Tracker",
                description: "Visual progress tracker for your trading profit goals with customizable time periods.",
                features: [
                    "Customizable profit targets",
                    "Multiple timeframe options",
                    "Progress visualization",
                    "Real-time goal tracking"
                ]
            },
            
            OpenPositionsWidget: {
                title: "Active Trades Monitor",
                description: "Real-time monitor for your currently open trading positions with key position details.",
                features: [
                    "Live position tracking",
                    "Key position metrics",
                    "Scrollable position list",
                    "Quick position overview"
                ]
            }
        };

        const widgetInfo = descriptions[widgetId];
        if (!widgetInfo) return "No description available.";

        return `
            <div class="space-y-2">
                <p class="font-medium">${widgetInfo.title}</p>
                <p>${widgetInfo.description}</p>
                <div class="mt-2">
                    <p class="font-medium mb-1">Key Features:</p>
                    <ul class="list-disc list-inside space-y-1">
                        ${widgetInfo.features.map(feature => `<li>${feature}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
    }

    // Add preview functionality
    let previewTimeout;
    let previewWidget = null;
    let activeWidget = null;

    function showPreview(widget) {
        clearTimeout(previewTimeout);
        previewTimeout = setTimeout(() => {
            previewWidget = {
                ...widget,
                props: generateSampleProps(widget.id)
            };
        }, 100);
    }

    function hidePreview() {
        clearTimeout(previewTimeout);
        previewWidget = null;
    }

    function generateSampleProps(widgetId) {
        const now = new Date();
        // สร้างข้อมูล trades สำหรับใช้ร่วมกัน
        const sampleTrades = Array.from({ length: 10 }, (_, i) => {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            return {
                id: `sample-${i}`,
                symbol: ['AAPL', 'TSLA', 'GOOGL'][i % 3],
                entryDate: date.toISOString(),
                exitDate: i % 2 === 0 ? date.toISOString() : null,
                entryPrice: 100 + (i * 10),
                exitPrice: i % 2 === 0 ? 110 + (i * 10) : null,
                quantity: 100,
                pnl: i % 2 === 0 ? 1000 - (i * 100) : null,
                status: i % 2 === 0 ? 'CLOSED' : 'OPEN',
                type: 'LONG'
            };
        });

        const sampleData = {
            TradingStats: {
                trades: sampleTrades
            },
            StatsCards: {
                totalPnL: 15000,
                openTrades: sampleTrades.filter(t => t.status === 'OPEN'),
                closedTrades: sampleTrades.filter(t => t.status === 'CLOSED'),
                winRate: 65
            },
            TradeCalendar: {
                trades: sampleTrades,
                accountId: 'preview-account',
                totalPnL: 1500,
                winRate: 65,
                transactions: [
                    {
                        type: 'deposit',
                        amount: 10000,
                        date: new Date(now - 86400000 * 30).toISOString()
                    }
                ]
            },
            MonthTradeCalendar: {
                trades: sampleTrades,
                accountId: 'preview-account',
                totalPnL: 1200,
                winRate: 100,
                transactions: [
                    {
                        type: 'deposit',
                        amount: 10000,
                        date: new Date(now - 86400000 * 30).toISOString()
                    }
                ]
            },
            TradeChart: {
                openTrades: sampleTrades.filter(t => t.status === 'OPEN'),
                closedTrades: sampleTrades.filter(t => t.status === 'CLOSED')
            },
            ProfitTargetWidget: {
                trades: sampleTrades,
                period: 'daily',
                target: 1000
            },
            OpenPositionsWidget: {
                trades: sampleTrades.filter(t => t.status === 'OPEN')
            }
        };

        // Add common props for calendar widgets
        if (widgetId === 'TradeCalendar' || widgetId === 'MonthTradeCalendar') {
            sampleData[widgetId] = {
                ...sampleData[widgetId],
                initialBalance: 10000,
                currentBalance: 11500
            };
        }

        return sampleData[widgetId] || {};
    }

    // Replace hover handlers with click handler
    function handleWidgetClick(widget) {
        activeWidget = widget;
        showPreview(widget);
    }

    // Add these helper functions
    function getPreviewHeight(widgetId) {
        const config = defaultWidgetConfigs[widgetId];
        if (!config) return 70; // Default single row height
        return config.rows * 70; // Each row is 70px
    }

    // Add function to calculate preview width based on cols
    function getPreviewWidth(widgetId) {
        const config = defaultWidgetConfigs[widgetId];
        if (!config) return 70; // Default single column width
        return config.cols * 70; // Each column is 70px
    }

    // แก้ไขฟังก์ชัน toggleWidgetModal
    function toggleWidgetModal() {
        showWidgetModal = !showWidgetModal;
        if (showWidgetModal) {
            // Set first widget as active and show preview when modal opens
            activeWidget = availableWidgetsWithCount[0];
            previewWidget = {
                ...activeWidget,
                props: generateSampleProps(activeWidget.id)
            };
        } else {
            // Clear selections when modal closes
            activeWidget = null;
            previewWidget = null;
        }
    }

    // Update the preview container to prevent interactions
    function getPreviewContainer(widget) {
        return `
            <div class="pointer-events-none">
                ${widget}
            </div>
        `;
    }
</script>

<!-- Rest of the file remains unchanged -->
<div class="relative w-full {editMode ? 'edit-mode edit-mode-background' : ''}">
    <div class="top-bar top-2 p-2 mb-3 right-2 z-10 flex gap-2 justify-between {editMode ? '' : 'hidden'}">
        {#if editMode}
            <div>
                <Button
                    variant="primary" 
                    size="xs"
                    on:click={toggleWidgetModal}
                >
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Widget
                </Button>
            </div>
            <div class="flex gap-2">
                <Button 
                    variant="secondary" 
                    size="xs"
                    on:click={cancelEdit}
                >
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel
                </Button>
                <Button 
                    variant="primary" 
                    size="xs"
                    on:click={saveLayout}
                >
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Save Layout
                </Button>
            </div>
        {:else}
            <div style="display: none;">
                <Button 
                    variant="primary" 
                    size="xs"
                    on:click={toggleEditMode}
                    
                >
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Customize Layout
                </Button>
            </div>
        {/if}
    </div>

    {#if showWidgetModal}
        <Modal 
            show={showWidgetModal}
            on:close={toggleWidgetModal}
            title="Available Widgets" 
            maxWidth="max-w-3xl"
        >
            <!-- Close button -->
            <button
                class="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover text-light-text-muted dark:text-dark-text-muted"
                on:click={toggleWidgetModal}
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            <!-- Content -->
            <div class="flex gap-6">
                <!-- Widget List -->
                <div class="w-2/6 space-y-1.5">
                    {#each availableWidgetsWithCount as widget (widget.id)}
                        <div 
                            class="relative p-2 rounded-md transition-all duration-200 cursor-pointer
                                   bg-light-card dark:bg-dark-card hover:bg-light-hover dark:hover:bg-dark-hover
                                   border border-light-border dark:border-dark-border"
                            class:ring-1={activeWidget?.id === widget.id}
                            class:ring-theme-500={activeWidget?.id === widget.id}
                            class:bg-light-hover={activeWidget?.id === widget.id}
                            class:dark:bg-dark-hover={activeWidget?.id === widget.id}
                            on:click={() => handleWidgetClick(widget)}
                        >
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <svg class="w-4 h-4 text-theme-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={widget.icon}/>
                                    </svg>
                                    <span class="text-xs font-medium text-light-text dark:text-dark-text">
                                        {widget.title}
                                    </span>
                                </div>
                                <span class="text-[10px] text-light-text-muted dark:text-dark-text-muted">
                                    {widget.remaining} left
                                </span>
                            </div>
                        </div>
                    {/each}
                </div>

                <!-- Preview Area -->
                <div class="w-4/6 preview-area">
                    {#if previewWidget}
                        <div 
                            class="rounded-lg bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border h-[480px] flex flex-col"
                            transition:fly={{ x: 20, duration: 200 }}
                        >
                            <!-- Widget Preview with scroll -->
                            <div class="bg-light-background h-auto max-h-3/4 dark:bg-dark-background rounded-t-lg border-b overflow-hidden border-light-border dark:border-dark-border flex-shrink-0">
                                <div class="p-4 overflow-auto">
                                    <!-- Add pointer-events-none to prevent interactions -->
                                    <div 
                                        class="relative pointer-events-none"
                                        style="width: {getPreviewWidth(previewWidget.id)}px; height: {getPreviewHeight(previewWidget.id)}px;"
                                    >
                                        {#if getComponentByName(previewWidget.id)}
                                            <svelte:component 
                                                this={getComponentByName(previewWidget.id)}
                                                {...previewWidget.props}
                                                height={getPreviewHeight(previewWidget.id)}
                                                textSize="small"
                                            />
                                        {/if}
                                    </div>
                                </div>
                            </div>

                            <!-- Description with scrollable area -->
                            <div class="flex-1  h-auto flex flex-col overflow-y-auto">
                                <!-- Description container with fixed height -->
                                <div class="flex-1 p-3">
                                    <div class="widget-description space-y-2 text-xs leading-relaxed text-light-text-muted dark:text-dark-text-muted">
                                        {@html getWidgetDescription(previewWidget.id)}
                                    </div>
                                </div>


                            </div>

                                                            <!-- Add Widget button -->
                                                            <div class="p-2 bg-light-card dark:bg-dark-card">
                                                                <button
                                                                    class="w-full py-1.5 px-3 text-xs font-medium rounded
                                                                           bg-theme-500/80 hover:bg-theme-500 text-white
                                                                           disabled:opacity-50 disabled:cursor-not-allowed
                                                                           transition-colors duration-200 shadow-sm"
                                                                    disabled={getWidgetTypeCount(widgets, previewWidget.id) >= (widgetLimits[previewWidget.id] || 1)}
                                                                    on:click={() => handleAddWidget(previewWidget.id)}
                                                                >
                                                                    {getWidgetTypeCount(widgets, previewWidget.id) >= (widgetLimits[previewWidget.id] || 1) 
                                                                        ? 'Maximum Limit Reached' 
                                                                        : 'Add Widget'
                                                                    }
                                                                </button>
                                                            </div>
                        </div>
                    {:else}
                        <div class="h-full flex items-center justify-center p-4 rounded-lg bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border">
                            <span class="text-xs text-light-text-muted dark:text-dark-text-muted">
                                Select a widget to see preview
                            </span>
                        </div>
                    {/if}
                </div>
            </div>
        </Modal>
    {/if}

    {#if mounted}
        <div 
            use:dndzone={{ 
                items: widgets, 
                dragDisabled: !editMode,
                dropFromOthersDisabled: true,
                dropTargetStyle: {
                    outline: '2px dashed var(--theme-500)',
                    backgroundColor: 'var(--theme-500-10)'
                },
                flipDurationMs: 200,
                morphDisabled: true
            }}
            on:consider={handleDndConsider}
            on:finalize={handleDndFinalize}
            class="grid grid-cols-12 gap-4"
        >
            {#each widgets as widget (widget.id)}
                <div 
                    class="widget relative {widget.config.textSize}" 
                    id={"widget-" + widget.id}
                    style="grid-column: span {widget.config?.cols || 1}; grid-row: span {widget.config?.rows || 1}; height: {widget.config?.height || 100}px;"
                    on:pointerdown={(event) => handleWidgetPointerDown(event, widget.id)}
                    on:pointermove={handleWidgetPointerMove}
                    on:pointerup={handleWidgetPointerUp}
                    on:pointerleave={handleWidgetPointerUp}
                >
                    {#if editMode && !widget.id.includes('dnd-shadow')}
                        <!-- Add overlay to prevent interaction -->
                        <div class="absolute inset-0 bg-transparent z-10"></div>
                        <div class="absolute -top-3 -right-3 z-20 flex gap-0.5">
                            <button 
                                on:click={() => openWidgetConfig(widget)}
                                class="p-1 rounded-lg bg-light-hover dark:bg-dark-hover text-light-text dark:text-dark-text"
                            >
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                </svg>
                            </button>
                            <button 
                                on:click={() => deleteWidget(widget.id)}
                                class="p-1 rounded-lg bg-red-500 hover:bg-red-700 text-white"
                            >
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    {/if}
                    {#if mounted && !widget.id.startsWith('dnd-shadow') && getComponentByName(widget.id)}
                        <svelte:component 
                            this={getComponentByName(widget.id)} 
                            {...(widget.props || {})} 
                            height={widget.config?.height}
                            textSize={widget.config?.textSize}
                            on:view
                            on:edit
                            on:delete
                            on:deleteTransaction
                            on:dayClick
                            on:monthClick
                            on:newTrade
                        />
                    {/if}
                </div>
            {/each}
        </div>
    {/if}
</div>

{#if showConfigModal && selectedWidgetForConfig}
    <Modal 
        bind:show={showConfigModal} 
        title="Configure Widget"
    >
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block mb-2 text-light-text dark:text-dark-text">Columns</label>
                    <input 
                        type="number" 
                        min="1" 
                        max="12" 
                        bind:value={selectedWidgetForConfig.config.cols} 
                        class="w-full border border-light-border dark:border-dark-border bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text rounded p-2 focus:ring-2 focus:ring-theme-500 focus:border-transparent"
                    />
                </div>
                <div>
                    <label class="block mb-2 text-light-text dark:text-dark-text">Rows</label>
                    <input 
                        type="number" 
                        min="1" 
                        max="12" 
                        bind:value={selectedWidgetForConfig.config.rows} 
                        class="w-full border border-light-border dark:border-dark-border bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text rounded p-2 focus:ring-2 focus:ring-theme-500 focus:border-transparent"
                    />
                </div>
                <div>
                    <label class="block mb-2 text-light-text dark:text-dark-text">Text Size</label>
                    <select bind:value={selectedWidgetForConfig.config.textSize} class="w-full border border-light-border dark:border-dark-border bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text rounded p-2 focus:ring-2 focus:ring-theme-500 focus:border-transparent">
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                        <option value="extra-large">Extra Large</option>
                    </select>
                </div>
                {#if selectedWidgetForConfig.id.startsWith('ProfitTargetWidget')}
                    <div>
                        <label>Goal Type</label>
                        <select bind:value={selectedWidgetForConfig.config.period}>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="yearly">Yearly</option>
                        </select>
                    </div>
                    <div>
                        <label>Goal Amount</label>
                        <input
                            type="number"
                            bind:value={selectedWidgetForConfig.config.target}
                        />
                    </div>
                {/if}
            </div>
            <div class="flex justify-end space-x-2 mt-4">
                <Button 
                    variant="secondary" 
                    on:click={() => showConfigModal = false}
                >
                    Cancel
                </Button>
                <Button 
                    variant="primary" 
                    on:click={updateWidgetConfig}
                >
                    Save
                </Button>
            </div>
        </div>
    </Modal>
{/if}

<style>
    .widget {
        transition: all 0.3s ease;
        position: relative;
        display: flex;
        flex-direction: column;
    }

    /* Animation for edit mode */
    @keyframes shake {
        0% { transform: rotate(0deg); }
        25% { transform: rotate(0.3deg); }
        50% { transform: rotate(0deg); }
        75% { transform: rotate(-0.3deg); }
        100% { transform: rotate(0deg); }
    }

    .edit-mode .widget {
        animation: shake 0.3s infinite;
    }

    .edit-mode-background {
        border: 2px dashed #1E90FF;
    }

    .top-bar {
        position: sticky;
        top: 0;
        background-color: var(--bg-color);
        z-index: 20;
    }

    /* Edit mode interaction styles */
    .edit-mode .widget :global(*) {
        pointer-events: none;
    }

    .edit-mode .widget > .absolute {
        pointer-events: auto;
    }

    .edit-mode .widget button {
        pointer-events: auto;
    }

    /* Preview transitions */
    .group-hover\:block {
        transition: all 0.3s ease-in-out;
    }

    /* Widget description styles */
    :global(.widget-description) {
        list-style-type: disc;
        margin-left: 1rem;
    }

    :global(.widget-description li) {
        list-style-position: inside;
        margin-top: 0.25rem;
    }

    :global(.widget-description .title) {
        font-weight: 500;
        margin-bottom: 0.5rem;
    }

    /* Dark mode styles */
    :global(.dark) .preview-description {
        color: var(--dark-text);
    }

    :global(.dark) .preview-description h3 {
        color: var(--dark-text);
    }

    :global(.dark) .preview-description ul {
        color: var(--dark-text-muted);
    }

    /* Widget options hover states */
    .widget-options > div:hover,
    .widget-options > div.active {
        background-color: var(--light-hover);
    }

    :global(.dark) .widget-options > div:hover,
    :global(.dark) .widget-options > div.active {
        background-color: var(--dark-hover);
    }

    /* Update transform-gpu styles */
    .transform-gpu {
        transform-origin: top center !important;
        will-change: transform;
        width: 100% !important;
        height: 100%;
        display: block;
        margin: 0 auto; /* Center the transformed content */
    }

    /* Ensure preview container handles overflow properly */
    .preview-area {
        position: relative;
        overflow: visible;
        display: flex;
        flex-direction: column;
    }

    /* Add smooth transition for scale changes */
    .transform-gpu {
        transition: transform 0.2s ease-out;
    }

    /* Ensure content is centered */
    :global(.preview-area .svelte-component) {
        margin: 0 auto;
    }

    /* Add styles for preview scrolling */
    .overflow-auto {
        overflow: auto;
        max-width: 100%;
        max-height: 400px; /* Adjust based on your needs */
    }

    /* Add padding for scrollbars */
    .p-4.overflow-auto {
        padding: 1rem;
        scrollbar-width: thin;
        scrollbar-color: var(--theme-500) transparent;
    }

    /* Customize scrollbar for webkit browsers */
    .p-4.overflow-auto::-webkit-scrollbar {
        width: 6px;
        height: 6px;
    }

    .p-4.overflow-auto::-webkit-scrollbar-track {
        background: transparent;
    }

    .p-4.overflow-auto::-webkit-scrollbar-thumb {
        background-color: var(--theme-500);
        border-radius: 3px;
    }

    /* Update description container styles */
    .widget-description {
        height: 100%;
        overflow-y: auto;
    }

    /* Remove min-height from container */
    .flex-1.overflow-y-auto {
        min-height: unset;
    }
</style>
