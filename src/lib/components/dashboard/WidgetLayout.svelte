<script>
    import { writable } from 'svelte/store';
    import { onMount, createEventDispatcher } from 'svelte';
    import { fly } from 'svelte/transition';
    import Modal from '../common/Modal.svelte';
    import Button from '../common/Button.svelte';
    
    // Import new components
    import WidgetSelector from './WidgetSelector.svelte';
    import WidgetGrid from './WidgetGrid.svelte';
    import WidgetEmptyState from './WidgetEmptyState.svelte';
    import WidgetConfigModal from './WidgetConfigModal.svelte';
    
    // Import widget components
    import TradeCalendar from './TradeCalendar.svelte';
    import MonthTradeCalendar from './MonthTradeCalendar.svelte';
    import TradingStats from './TradingStats.svelte';
    import StatsCard from './StatsCard.svelte';
    import TradeChart from './TradeChart.svelte';
    import ProfitTargetWidget from './ProfitTargetWidget.svelte';
    import OpenPositionsWidget from './OpenPositionsWidget.svelte';
    import ShortCalendarWidget from './ShortCalendarWidget.svelte';
    import TopTradesWidget from './TopTradesWidget.svelte';

    // Import utilities
    import { 
        widgetLimits, 
        getDefaultConfig,
        getWidgetDescription,
        generateSampleProps,
        createUniqueId
    } from '$lib/utils/widgetUtils';
    import { widgetStore } from '$lib/stores/widgetStore';
    import { layoutStore } from '$lib/stores/layoutStore';

    const dispatch = createEventDispatcher();
    let mounted = false;

    // Props
    export let openTrades = [];
    export let closedTrades = [];
    export let totalPnL = 0;
    export let winRate = 0;
    export let accountId = null;
    export let widgets = [];
    export let editMode = false;
    export let trades = [];
    export let onSaveLayout;
    export let activeLayoutIndex;

    // Widget configurations with predefined sizes
    const defaultWidgetConfigs = {
        TradingStats: getDefaultConfig('TradingStats'),
        StatsCards: getDefaultConfig('StatsCards'),
        TradeCalendar: getDefaultConfig('TradeCalendar'),
        MonthTradeCalendar: getDefaultConfig('MonthTradeCalendar'),
        TradeChart: getDefaultConfig('TradeChart'),
        ProfitTargetWidget: getDefaultConfig('ProfitTargetWidget'),
        OpenPositionsWidget: getDefaultConfig('OpenPositionsWidget')
    };

    // Available widgets definition
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
        },
        {
            id: 'OpenPositionsWidget',
            title: 'Open Positions',
            icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
            config: {...defaultWidgetConfigs.OpenPositionsWidget}
        },
        {
            id: 'ShortCalendar',
            title: 'Quick Calendar',
            icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
            config: {...defaultWidgetConfigs.ShortCalendar}
        }
    ];

    // State management
    let tempLayout = null; // Store temporary layout during edit mode
    let showConfigModal = false;
    let selectedWidgetForConfig = null;
    let showWidgetModal = false;
    let previewWidget = null;
    let activeWidget = null;
    let handleWidgetSelect;
    let pendingWidgetData = null;

    onMount(() => {
        mounted = true;
        return () => {
            mounted = false;
            clearTimeout(touchTimeout);
            if (tempLayout) {
                dispatch('updateWidgets', tempLayout.widgets);
            }
            tempLayout = null;
            selectedWidgetForConfig = null;
            previewWidget = null;
            activeWidget = null;
        };
    });

    function getComponentByName(id) {
        if (!id || id.includes('dnd-shadow') || id.includes('placeholder')) {
            return null;
        }
        
        const baseType = id.split('_')[0];
        
        const componentMap = {
            'TradingStats': TradingStats,
            'StatsCards': StatsCard,
            'TradeCalendar': TradeCalendar,
            'MonthTradeCalendar': MonthTradeCalendar,
            'TradeChart': TradeChart,
            'ProfitTargetWidget': ProfitTargetWidget,
            'OpenPositionsWidget': OpenPositionsWidget,
            'ShortCalendar': ShortCalendarWidget,
            'TopTradesWidget': TopTradesWidget
        };

        return componentMap[baseType] || null;
    }

    function getWidgetProps(baseType, config) {
        if (baseType === 'StatsCards') {
            return { totalPnL, openTrades, closedTrades, winRate };
        } else if (baseType === 'TradeCalendar' || baseType === 'MonthTradeCalendar' || baseType === 'ShortCalendar') {
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
            return { trades: openTrades, theme: config.theme };
        } else if (baseType === 'TopTradesWidget') {
            return {
                trades: [...openTrades, ...closedTrades],
                period: config.period || 'all',
                metric: config.metric || 'pnl',
                limit: config.limit || 5,
                showChart: config.showChart ?? true
            };
        }
        return {};
    }

    // Layout management functions
    function toggleEditMode() {
        if (!editMode) {
            console.log('🔄 Entering edit mode, storing layout state');
            // Deep clone current layout state
            tempLayout = JSON.parse(JSON.stringify({
                widgets: widgets
            }));
            console.log('Stored layout:', tempLayout);
        }
        editMode = !editMode;
        dispatch('editModeChange', editMode);
    }

    function saveLayout() {
        console.log('💾 Saving layout from WidgetLayout');
        onSaveLayout(widgets);
        tempLayout = null;
        editMode = false;
        dispatch('editModeChange', false);
    }

    async function cancelEdit() {
        console.log('↩️ Cancelling edit, reloading layout...');
        try {
            // Show loading state
            dispatch('setLoading', true);
            
            // Reload layouts from API
            const savedLayouts = await layoutStore.loadLayouts();
            
            if (savedLayouts && savedLayouts.length > 0) {
                // Reset widgets to saved state
                dispatch('updateWidgets', savedLayouts[activeLayoutIndex]?.widgets || []);
                console.log('✅ Layout reloaded successfully');
            }
        } catch (error) {
            console.error('❌ Error reloading layout:', error);
        } finally {
            // Hide loading state
            dispatch('setLoading', false);
            editMode = false;
            dispatch('editModeChange', false);
        }
    }

    function handleAddWidget(baseType) {
        const newWidget = {
            id: createUniqueId(baseType),
            config: {...defaultWidgetConfigs[baseType]},
            props: getWidgetProps(baseType, defaultWidgetConfigs[baseType])
        };
        
        dispatch('updateWidgets', [...widgets, newWidget]);
        showWidgetModal = false;
    }

    // Event handlers
    function handleDndConsider(e) {
        dispatch('updateWidgets', e.detail.items);
    }

    function handleDndFinalize(e) {
        dispatch('updateWidgets', e.detail.items);
    }

    function handleWidgetClick(widget) {
        activeWidget = widget;
        previewWidget = {
            ...widget,
            props: generateSampleProps(widget.id)
        };
    }

    // Widget interaction handlers
    let touchTimeout;
    let touchStartEvent;
    let initialTouchX, initialTouchY;

    function handleWidgetPointerDown(event, widgetId) {
        if (editMode) return;
        if (event.target.closest('.modal')) return;

        initialTouchX = event.clientX;
        initialTouchY = event.clientY;
        touchStartEvent = event;
        touchTimeout = setTimeout(() => {
            toggleEditMode();
            startDragging(widgetId, touchStartEvent);
        }, 500);
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

    // Calculate available widgets with remaining count
    $: availableWidgetsWithCount = availableWidgets.map(widget => ({
        ...widget,
        remaining: (widgetLimits[widget.id] || 1) - widgets.filter(w => w.id.startsWith(widget.id)).length
    }));

    // Update widget props when dependencies change
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

    // Props type checking
    $: if (widgets && !Array.isArray(widgets)) {
        console.error('widgets prop must be an array');
    }

    $: if (typeof editMode !== 'boolean') {
        console.error('editMode prop must be a boolean');
    }

    function handleAddWidgetAtPosition(targetWidgetId, position) {
        const targetIndex = widgets.findIndex(w => w.id === targetWidgetId);
        if (targetIndex === -1) return;

        let insertIndex;

        switch (position) {
            case 'top':
                insertIndex = targetIndex;
                break;
            case 'bottom':
                insertIndex = targetIndex + 1;
                break;
            case 'left':
                insertIndex = targetIndex;
                break;
            case 'right':
                insertIndex = targetIndex + 1;
                break;
            default:
                insertIndex = widgets.length;
        }

        // เก็บข้อมูลสำหรับการเพิ่ม widget
        pendingWidgetData = {
            insertIndex,
            position
        };

        // เปิด modal เพื่อเลือกชนิดของวิดเจ็ต
        showWidgetModal = true;
    }

    // แก้ไข handleWidgetTypeSelect ให้ใช้ค่าเริ่มต้นของแต่ละ widget type
    function handleWidgetTypeSelect(widgetType, position) {
        const defaultConfig = getDefaultConfig(widgetType);
        
        const newWidget = {
            id: createUniqueId(widgetType),
            config: { ...defaultConfig },
            props: getWidgetProps(widgetType, defaultConfig)
        };

        let updatedWidgets;
        
        if (position?.insertIndex != null) {
            // ถ้ามีการระบุตำแหน่ง ให้แทรกที่ตำแหน่งนั้น
            updatedWidgets = [
                ...widgets.slice(0, position.insertIndex),
                newWidget,
                ...widgets.slice(position.insertIndex)
            ];
        } else {
            // ถ้าไม่มีการระบุตำแหน่ง ให้เพิ่มไปท้ายสุด
            updatedWidgets = [...widgets, newWidget];
        }

        dispatch('updateWidgets', updatedWidgets);
        showWidgetModal = false;
        pendingWidgetData = null;
    }
</script>

<div class="relative w-full {editMode ? 'edit-mode edit-mode-background px-3 pb-3' : ''}">
    <!-- Edit mode toolbar -->
    <div class="sticky z-20 -top-3 bg-white dark:bg-[#0f172a] p-2 mb-3 right-2 flex gap-2 justify-between {editMode ? '' : 'hidden'}">
        {#if editMode}
            <div>
                <Button
                    variant="primary" 
                    size="xs"
                    on:click={() => showWidgetModal = true}
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
        {/if}
    </div>

    {#if mounted}
        {#if widgets.length === 0}
            <WidgetEmptyState onAddWidget={() => showWidgetModal = true} />
        {:else}
            <WidgetGrid
                {widgets}
                {editMode}
                {getComponentByName}
                onDndConsider={handleDndConsider}
                onDndFinalize={handleDndFinalize}
                onConfigClick={(widget) => {
                    selectedWidgetForConfig = widget;
                    showConfigModal = true;
                }}
                onDeleteClick={(widgetId) => {
                    dispatch('updateWidgets', widgets.filter(w => w.id !== widgetId));
                }}
                {handleWidgetPointerDown}
                {handleWidgetPointerMove}
                {handleWidgetPointerUp}
                onAddWidgetAtPosition={handleAddWidgetAtPosition}
                on:view
                on:edit
                on:delete
                on:deleteTransaction
                on:dayClick
                on:newTrade
            />
        {/if}
    {/if}

    <!-- Widget Selection Modal -->
    {#if showWidgetModal}
        <Modal 
            show={showWidgetModal}
            on:close={() => {
                showWidgetModal = false;
                pendingWidgetData = null;
            }}
            title="Available Widgets" 
            maxWidth="max-w-4xl"
        >
            <WidgetSelector
                {availableWidgetsWithCount}
                {widgetLimits}
                {widgets}
                handleAddWidget={handleWidgetTypeSelect}
                {getWidgetDescription}
                {getComponentByName}
                {pendingWidgetData}
                onClose={() => {
                    showWidgetModal = false;
                    pendingWidgetData = null;
                }}
            />
        </Modal>
    {/if}

    <!-- Widget Configuration Modal -->
    {#if showConfigModal && selectedWidgetForConfig}
        <WidgetConfigModal
            show={showConfigModal}
            selectedWidget={selectedWidgetForConfig}
            onClose={() => showConfigModal = false}
            onSave={(newConfig) => {
                const updatedWidgets = widgets.map(w => 
                    w.id === selectedWidgetForConfig.id 
                    ? {...w, config: {...newConfig, height: newConfig.rows * 70}} 
                    : w
                );
                dispatch('updateWidgets', updatedWidgets);
                showConfigModal = false;
            }}
        />
    {/if}
</div>

<style>
    .edit-mode-background {
        border: 2px dashed #1E90FF;
    }

</style>
