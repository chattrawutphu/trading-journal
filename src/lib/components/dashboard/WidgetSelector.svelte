<script>
    import { fly } from 'svelte/transition';
    import { getDefaultConfig } from '$lib/utils/widgetUtils';
    
    export let availableWidgetsWithCount;
    export let widgetLimits;
    export let widgets;
    export let handleAddWidget;
    export let getWidgetDescription;
    export let onClose;
    export let pendingWidgetData;

    let searchQuery = '';
    let selectedCategory = 'all';
    let showPreviewModal = false;
    let previewWidget = null;
    
    const categories = [
        { id: 'all', name: 'All Widgets' },
        { id: 'analytics', name: 'Analytics' },
        { id: 'monitoring', name: 'Monitoring' },
        { id: 'tools', name: 'Tools' },
    ];

    const availableWidgets = [
        { 
            id: 'TradingStats',
            title: 'Trading Stats',
            icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z',
            config: {...getDefaultConfig('TradingStats')}
        },
        { 
            id: 'StatsCards',
            title: 'Stats Cards',
            icon: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z',
            config: {...getDefaultConfig('StatsCards')}
        },
        {
            id: 'TradeCalendar',
            title: 'Daily Calendar',
            icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
            config: {...getDefaultConfig('TradeCalendar')}
        },
        {
            id: 'MonthTradeCalendar',
            title: 'Monthly Calendar',
            icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
            config: {...getDefaultConfig('MonthTradeCalendar')}
        },
        {
            id: 'TradeChart',
            title: 'Performance Chart',
            icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z',
            config: {...getDefaultConfig('TradeChart')}
        },
        {
            id: 'ProfitTargetWidget',
            title: 'Profit Target',
            icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
            config: {...getDefaultConfig('ProfitTargetWidget')}
        },
        { 
            id: 'OpenPositionsWidget',
            title: 'Open Positions',
            icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
            config: {...getDefaultConfig('OpenPositionsWidget')}
        },
        {
            id: 'ShortCalendar',
            title: 'Quick Calendar',
            icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
            config: {...getDefaultConfig('ShortCalendar')}
        },
        {
            id: 'TopTradesWidget',
            title: 'Top Trades',
            icon: 'M5 3a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V3zm12 0H7v14h10V3z M9 7h6m-6 4h6m-6 4h6',
            config: {...getDefaultConfig('TopTradesWidget')}
        },
        {
            id: 'MiniCalendar',
            title: 'Mini Calendar',
            icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
            config: {...getDefaultConfig('MiniCalendar')}
        }
    ];

    $: widgetsWithCategory = availableWidgets.map(widget => ({
        ...widget,
        category: widget.id.includes('chart') ? 'analytics' :
                 widget.id.includes('monitor') ? 'monitoring' : 'tools'
    }));

    $: filteredWidgets = widgetsWithCategory.filter(widget => {
        const matchesSearch = widget.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || widget.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    function getWidgetTypeCount(widgets, baseType) {
        return widgets.filter(w => w.id.startsWith(baseType)).length;
    }

    function handleWidgetTypeSelect(widgetType) {
        handleAddWidget(widgetType, pendingWidgetData);
    }

    function openPreview(widget) {
        previewWidget = widget;
        showPreviewModal = true;
    }

    $: availableWidgetsWithCount = [
        { 
            id: 'TradingStats',
            title: 'Trading Stats',
            icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z',
            count: getWidgetTypeCount(widgets, 'TradingStats'),
            limit: widgetLimits.TradingStats || 1
        },
        {
            id: 'StatsCards',
            title: 'Stats Cards',
            icon: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z',
            count: getWidgetTypeCount(widgets, 'StatsCards'),
            limit: widgetLimits.StatsCards || 1
        },
        {
            id: 'TradeCalendar',
            title: 'Daily Calendar',
            icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
            count: getWidgetTypeCount(widgets, 'TradeCalendar'),
            limit: widgetLimits.TradeCalendar || 1
        },
        {
            id: 'MonthTradeCalendar',
            title: 'Monthly Calendar',
            icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
            count: getWidgetTypeCount(widgets, 'MonthTradeCalendar'),
            limit: widgetLimits.MonthTradeCalendar || 1
        },
        {
            id: 'TradeChart',
            title: 'Performance Chart',
            icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z',
            count: getWidgetTypeCount(widgets, 'TradeChart'),
            limit: widgetLimits.TradeChart || 1
        },
        {
            id: 'ProfitTargetWidget',
            title: 'Profit Target',
            icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
            count: getWidgetTypeCount(widgets, 'ProfitTargetWidget'),
            limit: widgetLimits.ProfitTargetWidget || 3
        },
        { 
            id: 'OpenPositionsWidget',
            title: 'Open Positions',
            icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
            count: getWidgetTypeCount(widgets, 'OpenPositionsWidget'),
            limit: widgetLimits.OpenPositionsWidget || 1
        },
        {
            id: 'ShortCalendar',
            title: 'Quick Calendar',
            icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
            count: getWidgetTypeCount(widgets, 'ShortCalendar'),
            limit: widgetLimits.ShortCalendar || 1
        },
        {
            id: 'TopTradesWidget',
            title: 'Top Trades',
            icon: 'M5 3a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V3zm12 0H7v14h10V3z M9 7h6m-6 4h6m-6 4h6',
            count: getWidgetTypeCount(widgets, 'TopTradesWidget'),
            limit: widgetLimits.TopTradesWidget || 2
        }
    ];
</script>

<div class="h-[65vh] mb-4 flex flex-col">
    <!-- Header with Search and Categories -->
    <div class="p-4 ">
        <div class="mb-4">
            <input
                type="text"
                bind:value={searchQuery}
                placeholder="Search widgets..."
                class="w-full px-3 py-2 text-base rounded-lg bg-light-input dark:bg-dark-input 
                       border border-light-border dark:border-dark-border
                       focus:ring-2 focus:ring-theme-500 focus:border-transparent"
            />
        </div>

        <div class="flex gap-2 overflow-x-auto pb-2">
            {#each categories as category}
                <button
                    class="px-3 py-1.5 text-sm rounded-full whitespace-nowrap
                           transition-colors duration-200
                           {selectedCategory === category.id ? 
                           'bg-theme-500 text-white' : 
                           'bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text'}"
                    on:click={() => selectedCategory = category.id}
                >
                    {category.name}
                </button>
            {/each}
        </div>
    </div>

    <!-- Widget List -->
    <div class="flex-1 overflow-y-auto p-4">
        <div class="space-y-2">
            {#each filteredWidgets as widget (widget.id)}
                <div class="bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border">
                    <div class="p-4">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 flex items-center justify-center rounded-lg bg-theme-500/10">
                                    <svg class="w-4 h-4 text-theme-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={widget.icon}/>
                                    </svg>
                                </div>
                                <div>
                                    <h3 class="text-base font-medium text-light-text dark:text-dark-text">
                                        {widget.title}
                                    </h3>
                                    <p class="text-sm text-light-text-muted dark:text-dark-text-muted mt-0.5">
                                        {getWidgetDescription(widget.id.split('_')[0]).description.slice(0, 60)}...
                                    </p>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <button
                                    class="p-2 rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover
                                           text-light-text-muted dark:text-dark-text-muted transition-colors"
                                    on:click={() => openPreview(widget)}
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </button>
                                <button
                                    class="px-3 py-1.5 text-sm font-medium rounded-lg
                                           bg-theme-500 hover:bg-theme-600 text-white
                                           disabled:opacity-50 disabled:cursor-not-allowed
                                           transition-colors duration-200"
                                    disabled={getWidgetTypeCount(widgets, widget.id.split('_')[0]) >= 
                                             (widgetLimits[widget.id.split('_')[0]] || 1)}
                                    on:click={() => handleWidgetTypeSelect(widget.id.split('_')[0])}
                                >
                                    {getWidgetTypeCount(widgets, widget.id.split('_')[0]) >= 
                                     (widgetLimits[widget.id.split('_')[0]] || 1)
                                        ? 'Limit Reached'
                                        : 'Add Widget'
                                    }
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    </div>
</div>

<!-- Preview Modal -->
{#if showPreviewModal}
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 sm:p-6 md:p-8"
         on:click={() => showPreviewModal = false}>
        <div class="relative bg-white dark:bg-dark-card rounded-xl shadow-xl 
                    w-full max-w-[90vw] md:max-w-4xl lg:max-w-6xl max-h-[90vh] overflow-hidden"
             on:click|stopPropagation>
            <!-- Modal Header -->
            <div class="p-4 sm:p-6 border-b border-light-border dark:border-dark-border flex items-center justify-between">
                <h3 class="text-xl sm:text-2xl font-medium text-light-text dark:text-dark-text">
                    {previewWidget?.title} Preview
                </h3>
                <button
                    class="p-1.5 rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover
                           text-light-text-muted dark:text-dark-text-muted transition-colors"
                    on:click={() => showPreviewModal = false}
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            
            <!-- Modal Content -->
            <div class="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
                <div class="aspect-video bg-light-hover dark:bg-dark-hover rounded-lg overflow-hidden">
                    <img 
                        src="/widget-previews/{previewWidget?.id}-mockup.png"
                        alt={previewWidget?.title}
                        class="w-full h-full object-contain"
                        onerror="this.src='/widget-previews/default-mockup.png'"
                    />
                </div>
                
                <!-- Widget Description -->
                <div class="mt-4 space-y-3">
                    <p class="text-base text-light-text-muted dark:text-dark-text-muted">
                        {getWidgetDescription(previewWidget?.id.split('_')[0]).description}
                    </p>
                    
                    <div class="flex justify-end pt-4">
                        <button
                            class="px-4 py-2 text-base font-medium rounded-lg
                                   bg-theme-500 hover:bg-theme-600 text-white
                                   disabled:opacity-50 disabled:cursor-not-allowed
                                   transition-colors duration-200"
                            disabled={getWidgetTypeCount(widgets, previewWidget?.id.split('_')[0]) >= 
                                     (widgetLimits[previewWidget?.id.split('_')[0]] || 1)}
                            on:click={() => {
                                handleWidgetTypeSelect(previewWidget?.id.split('_')[0]);
                                showPreviewModal = false;
                            }}
                        >
                            {getWidgetTypeCount(widgets, previewWidget?.id.split('_')[0]) >= 
                             (widgetLimits[previewWidget?.id.split('_')[0]] || 1)
                                ? 'Maximum Limit Reached'
                                : 'Add This Widget'
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    /* Scrollbar styles */
    .overflow-y-auto {
        scrollbar-width: thin;
        scrollbar-color: var(--theme-500) transparent;
    }

    .overflow-y-auto::-webkit-scrollbar {
        width: 6px;
    }

    .overflow-y-auto::-webkit-scrollbar-track {
        background: transparent;
    }

    .overflow-y-auto::-webkit-scrollbar-thumb {
        background-color: var(--theme-500);
        border-radius: 3px;
    }
</style> 