<script>
    import { dndzone } from 'svelte-dnd-action';
    import { calculateHeight } from '$lib/utils/widgetUtils';
    
    export let widgets = [];
    export let editMode = false;
    export let onDndConsider;
    export let onDndFinalize;
    export let onConfigClick;
    export let onDeleteClick;
    export let getComponentByName;
    export let onAddWidgetAtPosition;

    $: getWidgetHeight = (widget) => {
        if (!widget.config?.rows) return 'auto';
        return widget.config.rows === 'auto' ? 'auto' : `${calculateHeight(widget.config.rows)}px`;
    };

    $: getWidgetCols = (widget) => {
        if (!widget.config?.cols) return '1';
        return widget.config.cols === 'auto' ? '12' : widget.config.cols;
    };

    $: getWidgetRows = (widget) => {
        return widget.config?.rows || 1;
    };

    function handleAddButtonClick(position, widget, event) {
        event.stopPropagation();
        onAddWidgetAtPosition(widget.id, position);
    }

    function getMonthlyLosses() {
        let losses = 0;
        const startDate = new Date(selectedYear, selectedMonth, 1);
        const endDate = new Date(selectedYear, selectedMonth + 1, 0);

        Object.values(dailyTrades).forEach(dayStats => {
            const tradeDate = new Date(dayStats.trades[0]?.exitDate);
            if (tradeDate >= startDate && tradeDate <= endDate) {
                losses += dayStats.losses || 0;
            }
        });

        return losses;
    }

    function getMonthlyVolume() {
        let volume = 0;
        const startDate = new Date(selectedYear, selectedMonth, 1);
        const endDate = new Date(selectedYear, selectedMonth + 1, 0);

        Object.values(dailyTrades).forEach(dayStats => {
            const tradeDate = new Date(dayStats.trades[0]?.exitDate);
            if (tradeDate >= startDate && tradeDate <= endDate) {
                volume += dayStats.totalInvested || 0;
            }
        });

        return volume;
    }

    function formatAmount(amount) {
        if (amount >= 1000000) {
            return (amount / 1000000).toFixed(1) + 'M';
        }
        if (amount >= 1000) {
            return (amount / 1000).toFixed(1) + 'K';
        }
        return amount.toFixed(0);
    }

    function getMonthlyROI() {
        const pnl = getMonthlyPnL();
        const volume = getMonthlyVolume();
        
        if (volume === 0) return 0;
        return ((pnl / volume) * 100).toFixed(1);
    }
</script>

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
    on:consider={onDndConsider}
    on:finalize={onDndFinalize}
    class="grid grid-cols-12 gap-2 lg:gap-4 relative"
>
    {#each widgets as widget (widget.id)}
        <div 
            class="widget relative group flex flex-col md:col-span-[var(--widget-cols)] md:row-span-[var(--widget-rows)] md:h-[var(--widget-height)] sm:col-span-12 sm:h-auto {widget.config?.textSize || 'medium'}"
            id={"widget-" + widget.id}
            style="--widget-cols: {getWidgetCols(widget)}; 
                   --widget-rows: {getWidgetRows(widget)}; 
                   --widget-height: {getWidgetHeight(widget)};"
        >
            {#if editMode && !widget.id.includes('dnd-shadow')}
                <div class="absolute inset-0 bg-transparent z-10"></div>
                <div class="absolute -top-3 -right-3 z-20 flex gap-0.5">
                    <button 
                        on:click={() => onConfigClick(widget)}
                        class="p-1 rounded-lg bg-light-hover dark:bg-dark-hover text-light-text dark:text-dark-text hover:bg-light-hover/80 dark:hover:bg-dark-hover/80"
                    >
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                        </svg>
                    </button>
                    <button 
                        on:click={() => onDeleteClick(widget.id)}
                        class="p-1 rounded-lg bg-red-500 hover:bg-red-700 text-white"
                    >
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            {/if}
            {#if !widget.id.startsWith('dnd-shadow') && getComponentByName(widget.id)}
                <svelte:component 
                    this={getComponentByName(widget.id)} 
                    {...(widget.props || {})} 
                    textSize={widget.config?.textSize}
                />
            {/if}

            {#if editMode}
                <button 
                    class="absolute w-[22px] h-[22px] bg-theme-500 text-white rounded-lg flex items-center justify-center cursor-pointer md:opacity-0 md:group-hover:opacity-100 transition-all duration-200 ease-in-out z-20 -top-[11px] left-1/2 -translate-x-1/2 hover:scale-105 hover:bg-theme-600 active:scale-95 shadow-[0_0_0_4px_var(--light-background),0_4px_6px_rgba(0,0,0,0.1)] dark:shadow-[0_0_0_4px_var(--dark-background),0_4px_6px_rgba(0,0,0,0.2),0_0_10px_rgba(var(--theme-500-rgb),0.3)] dark:hover:bg-theme-400 dark:hover:shadow-[0_0_0_4px_var(--dark-background),0_6px_8px_rgba(0,0,0,0.3),0_0_15px_rgba(var(--theme-400-rgb),0.4)]
                       {widget !== widgets[0] ? 'hidden md:flex' : 'flex'}"
                    on:click={(e) => handleAddButtonClick('top', widget, e)}
                >
                    <svg class="w-3.5 h-3.5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14" />
                    </svg>
                </button>

                <button 
                    class="absolute w-[22px] h-[22px] bg-theme-500 text-white rounded-lg flex items-center justify-center cursor-pointer md:opacity-0 md:group-hover:opacity-100 transition-all duration-200 ease-in-out z-20 -bottom-[11px] left-1/2 -translate-x-1/2 hover:scale-105 hover:bg-theme-600 active:scale-95 shadow-[0_0_0_4px_var(--light-background),0_4px_6px_rgba(0,0,0,0.1)] dark:shadow-[0_0_0_4px_var(--dark-background),0_4px_6px_rgba(0,0,0,0.2),0_0_10px_rgba(var(--theme-500-rgb),0.3)] dark:hover:bg-theme-400 dark:hover:shadow-[0_0_0_4px_var(--dark-background),0_6px_8px_rgba(0,0,0,0.3),0_0_15px_rgba(var(--theme-400-rgb),0.4)]"
                    on:click={(e) => handleAddButtonClick('bottom', widget, e)}
                >
                    <svg class="w-3.5 h-3.5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14" />
                    </svg>
                </button>

                <button 
                    class="hidden md:flex absolute w-[22px] h-[22px] bg-theme-500 text-white rounded-lg items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-200 ease-in-out z-20 -left-[11px] top-1/2 -translate-y-1/2 hover:scale-105 hover:bg-theme-600 active:scale-95 shadow-[0_0_0_4px_var(--light-background),0_4px_6px_rgba(0,0,0,0.1)] dark:shadow-[0_0_0_4px_var(--dark-background),0_4px_6px_rgba(0,0,0,0.2),0_0_10px_rgba(var(--theme-500-rgb),0.3)] dark:hover:bg-theme-400 dark:hover:shadow-[0_0_0_4px_var(--dark-background),0_6px_8px_rgba(0,0,0,0.3),0_0_15px_rgba(var(--theme-400-rgb),0.4)]"
                    on:click={(e) => handleAddButtonClick('left', widget, e)}
                >
                    <svg class="w-3.5 h-3.5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14" />
                    </svg>
                </button>

                <button 
                    class="hidden md:flex absolute w-[22px] h-[22px] bg-theme-500 text-white rounded-lg items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-200 ease-in-out z-20 -right-[11px] top-1/2 -translate-y-1/2 hover:scale-105 hover:bg-theme-600 active:scale-95 shadow-[0_0_0_4px_var(--light-background),0_4px_6px_rgba(0,0,0,0.1)] dark:shadow-[0_0_0_4px_var(--dark-background),0_4px_6px_rgba(0,0,0,0.2),0_0_10px_rgba(var(--theme-500-rgb),0.3)] dark:hover:bg-theme-400 dark:hover:shadow-[0_0_0_4px_var(--dark-background),0_6px_8px_rgba(0,0,0,0.3),0_0_15px_rgba(var(--theme-400-rgb),0.4)]"
                    on:click={(e) => handleAddButtonClick('right', widget, e)}
                >
                    <svg class="w-3.5 h-3.5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14" />
                    </svg>
                </button>
            {/if}
        </div>
    {/each}
</div>

<style>
    .widget {
        transition: all 0.3s ease;
        position: relative;
        display: flex;
        flex-direction: column;
    }

    /* Desktop styles (md and up) */
    @media (min-width: 768px) {
        .widget {
            grid-column: span var(--widget-cols);
            grid-row: span var(--widget-rows);
            height: var(--widget-height);
        }
    }

    /* Mobile styles */
    @media (max-width: 767.98px) {
        .widget {
            grid-column: span 12 !important;
            height: auto !important;
        }
    }

    :global(.edit-mode) .widget {
        animation: shake 0.4s infinite;
    }

    @keyframes shake {
        0% { transform: rotate(0deg); }
        25% { transform: rotate(0.1deg); }
        50% { transform: rotate(0deg); }
        75% { transform: rotate(-0.1deg); }
        100% { transform: rotate(0deg); }
    }
</style> 