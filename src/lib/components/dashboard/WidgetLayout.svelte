<script>
    import { writable } from 'svelte/store';
    import { dndzone } from 'svelte-dnd-action';
    import TradeCalendar from './TradeCalendar.svelte';
    import TradingStats from './TradingStats.svelte';
    import StatsCard from './StatsCard.svelte';
    import TradeChart from './TradeChart.svelte';
    import Modal from '../common/Modal.svelte';

    // Widget configurations with predefined sizes
    const defaultWidgetConfigs = {
        TradingStats: { cols: 12, rows: 2, height: 140 },
        StatsCards: { cols: 2, rows: 8, height: 560 },
        TradeCalendar: { cols: 6, rows: 8, height: 560 },
        TradeChart: { cols: 4, rows: 8, height: 560 }
    };

    export let openTrades = [];
    export let closedTrades = [];
    export let totalPnL = 0;
    export let winRate = 0;
    export let accountId = null;

    // Initialize widgets with saved layout from localStorage or default layout
    function getInitialLayout() {
        const savedLayout = localStorage.getItem('widgetLayout');
        if (savedLayout) {
            const parsed = JSON.parse(savedLayout);
            return parsed.map(widget => ({
                ...widget,
                component: getComponentByName(widget.id)
            }));
        }
        return [
            { 
                id: 'TradingStats', 
                component: TradingStats, 
                config: {...defaultWidgetConfigs.TradingStats}
            },
            { 
                id: 'StatsCards', 
                component: StatsCard, 
                config: {...defaultWidgetConfigs.StatsCards},
                props: { totalPnL, openTrades, closedTrades, winRate }
            },
            { 
                id: 'TradeCalendar', 
                component: TradeCalendar, 
                config: {...defaultWidgetConfigs.TradeCalendar},
                props: { trades: [...openTrades, ...closedTrades], accountId }
            },
            { 
                id: 'TradeChart', 
                component: TradeChart, 
                config: {...defaultWidgetConfigs.TradeChart},
                props: { openTrades, closedTrades }
            }
        ];
    }

    function getComponentByName(id) {
        const componentMap = {
            'TradingStats': TradingStats,
            'StatsCards': StatsCard,
            'TradeCalendar': TradeCalendar,
            'TradeChart': TradeChart
        };
        return componentMap[id];
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
            component: getComponentByName(widget.id)
        }));
    }

    let widgets = writable(getInitialLayout());
    let tempWidgets; // Store temporary layout during edit mode
    let editMode = false;
    let showConfigModal = false;
    let selectedWidgetForConfig = null;

    function toggleEditMode() {
        if (!editMode) {
            // Entering edit mode - store current layout without components
            tempWidgets = backupLayout($widgets);
        }
        editMode = !editMode;
    }

    function saveLayout() {
        // Save to localStorage
        const savableWidgets = $widgets.map(widget => ({
            id: widget.id,
            config: widget.config,
            props: widget.props
        }));
        localStorage.setItem('widgetLayout', JSON.stringify(savableWidgets));
        editMode = false;
    }

    function cancelEdit() {
        // Restore previous layout with components
        widgets.set(restoreLayout(tempWidgets));
        editMode = false;
    }

    function handleDndConsider(e) {
        widgets.update(w => e.detail.items);
    }

    function handleDndFinalize(e) {
        widgets.update(w => e.detail.items);
    }

    function openWidgetConfig(widget) {
        selectedWidgetForConfig = {...widget};
        showConfigModal = true;
    }

    function updateWidgetConfig() {
        if (selectedWidgetForConfig) {
            // Calculate height based on rows (70px per row)
            const height = selectedWidgetForConfig.config.rows * 70;
            
            widgets.update(widgets => 
                widgets.map(w => 
                    w.id === selectedWidgetForConfig.id 
                    ? {
                        ...w, 
                        config: {
                            ...selectedWidgetForConfig.config,
                            height
                        }
                    } 
                    : w
                )
            );
            showConfigModal = false;
        }
    }

    // Reactive updates for props
    $: {
        const statsCardsWidget = $widgets.find(w => w.id === 'StatsCards');
        if (statsCardsWidget) {
            statsCardsWidget.props = { totalPnL, openTrades, closedTrades, winRate };
        }

        const tradeCalendarWidget = $widgets.find(w => w.id === 'TradeCalendar');
        if (tradeCalendarWidget) {
            tradeCalendarWidget.props = { 
                trades: [...openTrades, ...closedTrades], 
                accountId 
            };
        }

        const tradeChartWidget = $widgets.find(w => w.id === 'TradeChart');
        if (tradeChartWidget) {
            tradeChartWidget.props = { openTrades, closedTrades };
        }
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

    <div 
        use:dndzone={{ items: $widgets, dragDisabled: !editMode }}
        on:consider={handleDndConsider}
        on:finalize={handleDndFinalize}
        class="grid grid-cols-12 gap-4 p-4"
    >
        {#each $widgets as widget (widget.id)}
            <div 
                class="widget relative" 
                style="grid-column: span {widget.config.cols}; grid-row: span {widget.config.rows}; height: {widget.config.height}px;"
            >
                {#if editMode}
                    <button 
                        on:click={() => openWidgetConfig(widget)}
                        class="absolute top-2 right-2 z-10 bg-gray-200 dark:bg-gray-700 p-2 rounded-full"
                    >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        </svg>
                    </button>
                {/if}
                <svelte:component 
                    this={widget.component} 
                    {...(widget.props || {})} 
                    height={widget.config.height}
                />
            </div>
        {/each}
    </div>
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
