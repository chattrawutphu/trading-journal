<script>
    import { dndzone } from 'svelte-dnd-action';
    
    export let widgets = [];
    export let editMode = false;
    export let onDndConsider;
    export let onDndFinalize;
    export let onConfigClick;
    export let onDeleteClick;
    export let getComponentByName;
    export let handleWidgetPointerDown;
    export let handleWidgetPointerMove;
    export let handleWidgetPointerUp;
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
                <div class="absolute inset-0 bg-transparent z-10"></div>
                <div class="absolute -top-3 -right-3 z-20 flex gap-0.5">
                    <button 
                        on:click={() => onConfigClick(widget)}
                        class="p-1 rounded-lg bg-light-hover dark:bg-dark-hover text-light-text dark:text-dark-text"
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
                    height={widget.config?.height}
                    textSize={widget.config?.textSize}
                    on:view
                    on:edit
                    on:delete
                    on:deleteTransaction
                    on:dayClick
                    on:newTrade
                />
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

    :global(.edit-mode) .widget {
        animation: shake 0.3s infinite;
    }

    @keyframes shake {
        0% { transform: rotate(0deg); }
        25% { transform: rotate(0.3deg); }
        50% { transform: rotate(0deg); }
        75% { transform: rotate(-0.3deg); }
        100% { transform: rotate(0deg); }
    }
</style> 