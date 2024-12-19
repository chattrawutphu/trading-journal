<script>
    import { writable } from 'svelte/store';
    import { dndzone } from 'svelte-dnd-action';
    import TradeCalendar from './TradeCalendar.svelte';
    import TradingStats from './TradingStats.svelte';
    import StatsCard from './StatsCard.svelte';
    import TradeChart from './TradeChart.svelte';
    import Modal from '../common/Modal.svelte';
    import { onMount, createEventDispatcher } from 'svelte';
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
        TradingStats: { cols: 12, rows: 2, height: 140 },
        StatsCards: { cols: 2, rows: 8, height: 560 },
        TradeCalendar: { cols: 6, rows: 8, height: 560 },
        TradeChart: { cols: 4, rows: 8, height: 560 }
    };

    // เพิ่มการกำหนดจำนวนสูงสุดของแต่ละ widget
    const widgetLimits = {
        TradeCalendar: 3,
        TradeChart: 3,
        StatsCards: 12,
        TradingStats: 1 // default limit
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
            title: 'Calendar',
            icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
            config: {...defaultWidgetConfigs.TradeCalendar}
        },
        { 
            id: 'TradeChart',
            title: 'Chart',
            icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z',
            config: {...defaultWidgetConfigs.TradeChart}
        }
    ];

    export let openTrades = [];
    export let closedTrades = [];
    export let totalPnL = 0;
    export let winRate = 0;
    export let accountId = null;
    export let widgets = []; // Now receiving widgets as a prop instead of managing internally

    // Initialize widgets with saved layout from localStorage or default layout
    // ปรับปรุงฟังก์ชัน getInitialLayout เพื่อสร้าง unique IDs
    function getInitialLayout() {
        const savedLayout = localStorage.getItem('widgetLayout');
        if (savedLayout) {
            const parsed = JSON.parse(savedLayout);
            return parsed.map(widget => ({
                ...widget,
                props: getWidgetProps(widget.id.split('_')[0])
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
            'TradeChart': TradeChart
        };

        return componentMap[baseType] || null;
    }

    function getWidgetProps(baseType) {
        if (baseType === 'StatsCards') {
            return { totalPnL, openTrades, closedTrades, winRate };
        } else if (baseType === 'TradeCalendar') {
            return { trades: [...openTrades, ...closedTrades], accountId };
        } else if (baseType === 'TradeChart') {
            return { openTrades, closedTrades };
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
            props: getWidgetProps(widget.id.split('_')[0])
        }));
    }

    let tempWidgets; // Store temporary layout during edit mode
    let editMode = false;
    let showConfigModal = false;
    let selectedWidgetForConfig = null;

    function toggleEditMode() {
        if (!editMode) {
            // Entering edit mode - store current layout without components
            tempWidgets = backupLayout(widgets);
        }
        editMode = !editMode;
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
    }

    function cancelEdit() {
        // Restore previous layout with components
        widgets = restoreLayout(tempWidgets);
        editMode = false;
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
    }

    // แยกฟังก์ชันสร้าง widget ใหม่
    function createNewWidget(baseType) {
        const uniqueId = createUniqueId(baseType);
        const newWidget = {
            id: uniqueId,
            config: {...defaultWidgetConfigs[baseType]},
            props: getWidgetProps(baseType)
        };
        return newWidget;
    }

    // เพิ่มฟังก์ชันนับจำนวน widget แต่ละประเภท
    function getWidgetTypeCount(widgets, baseType) {
        return widgets.filter(w => w.id.startsWith(baseType)).length;
    }

    // คำนวณจำนวน widget ที่เหลือสำหรับแสดงใน widget bar
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
                    widget.props = getWidgetProps(baseType);
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
                    }
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
</script>

<div class="relative w-full">
    <div class="absolute top-2 right-2 z-10 flex gap-2">
        {#if editMode}
            <button 
                on:click={cancelEdit}
                class="bg-gray-500 text-white px-4 py-2 rounded"
            >
                Cancel
            </button>
            <button 
                on:click={saveLayout}
                class="bg-green-500 text-white px-4 py-2 rounded"
            >
                Save Layout
            </button>
        {:else}
            <button 
                on:click={toggleEditMode}
                class="bg-blue-500 text-white px-4 py-2 rounded"
            >
                Edit Layout
            </button>
        {/if}
    </div>

    {#if editMode}
        <div class="fixed left-4 top-1/2 -translate-y-1/2 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg p-2 shadow-lg">
            <div class="text-sm font-semibold mb-2 px-2">Available Widgets</div>
            <div class="space-y-2">
                {#each availableWidgetsWithCount as widget (widget.id)}
                    <div class="flex items-center justify-between gap-2 p-2 bg-light-background dark:bg-dark-background rounded cursor-pointer hover:bg-opacity-50"
                         on:click={() => handleAddWidget(widget.id)}
                         class:opacity-50={widget.remaining <= 0}
                         class:pointer-events-none={widget.remaining <= 0}>
                        <div class="flex items-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={widget.icon}/>
                            </svg>
                            <span class="text-sm">{widget.title}</span>
                        </div>
                        <span class="text-xs text-gray-500">
                            {widget.remaining} left
                        </span>
                    </div>
                {/each}
            </div>
        </div>
    {/if}

    {#if mounted}
        <div 
            use:dndzone={{ 
                items: widgets, 
                dragDisabled: !editMode,
                dropFromOthersDisabled: true,
                dropTargetStyle: {
                    outline: '2px dashed #4A90E2',
                    backgroundColor: 'rgba(74, 144, 226, 0.1)'
                },
                flipDurationMs: 300,
                morphDisabled: true
            }}
            on:consider={handleDndConsider}
            on:finalize={handleDndFinalize}
            class="grid grid-cols-12 gap-4 p-4"
        >
            {#each widgets as widget (widget.id)}
                <div 
                    class="widget relative" 
                    style="grid-column: span {widget.config?.cols || 1}; grid-row: span {widget.config?.rows || 1}; height: {widget.config?.height || 100}px;"
                >
                    {#if editMode && !widget.id.includes('dnd-shadow')}
                        <button 
                            on:click={() => openWidgetConfig(widget)}
                            class="absolute top-2 right-2 z-10 bg-gradient-purple text-white p-1 rounded-full"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            </svg>
                        </button>
                        <button 
                            on:click={() => deleteWidget(widget.id)}
                            class="absolute top-2 right-10 z-10 bg-gradient-purple text-white p-1 rounded-full"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    {/if}
                    {#if mounted && !widget.id.startsWith('dnd-shadow') && getComponentByName(widget.id)}
                        <svelte:component 
                            this={getComponentByName(widget.id)} 
                            {...(widget.props || {})} 
                            height={widget.config?.height}
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
                    <label class="block mb-2">Columns</label>
                    <input 
                        type="number" 
                        min="1" 
                        max="12" 
                        bind:value={selectedWidgetForConfig.config.cols} 
                        class="w-full border rounded p-2"
                    />
                </div>
                <div>
                    <label class="block mb-2">Rows</label>
                    <input 
                        type="number" 
                        min="1" 
                        max="12" 
                        bind:value={selectedWidgetForConfig.config.rows} 
                        class="w-full border rounded p-2"
                    />
                </div>
            </div>
            <div class="flex justify-end space-x-2 mt-4">
                <button 
                    on:click={() => showConfigModal = false}
                    class="btn btn-secondary"
                >
                    Cancel
                </button>
                <button 
                    on:click={updateWidgetConfig}
                    class="btn btn-primary"
                >
                    Save
                </button>
            </div>
        </div>
    </Modal>
{/if}

<style>
    .widget {
        transition: all 0.3s ease;
        border: 2px solid transparent;
        position: relative;
        display: flex;
        flex-direction: column;
    }
</style>
