<script>
    import { fly } from 'svelte/transition';
    import Button from '../common/Button.svelte';
    import { getDefaultConfig, generateSampleProps } from '$lib/utils/widgetUtils';
    import { onMount } from 'svelte';
    
    export let availableWidgetsWithCount;
    export let widgetLimits;
    export let widgets;
    export let handleAddWidget;
    export let getWidgetDescription;
    export let getComponentByName;
    export let onClose;

    let activeWidget = null;
    let previewWidget = null;

    onMount(() => {
        if (availableWidgetsWithCount.length > 0) {
            handleWidgetClick(availableWidgetsWithCount[0]);
        }
    });

    $: description = previewWidget 
        ? getWidgetDescription(previewWidget.id.split('_')[0])
        : null;

    function getPreviewHeight(widgetId) {
        const config = getDefaultConfig(widgetId.split('_')[0]);
        return config.height || 70;
    }

    function getPreviewWidth(widgetId) {
        const config = getDefaultConfig(widgetId.split('_')[0]);
        return (config.cols || 1) * 70;
    }

    function getWidgetTypeCount(widgets, baseType) {
        return widgets.filter(w => w.id.startsWith(baseType)).length;
    }

    function handleWidgetClick(widget) {
        activeWidget = widget;
        previewWidget = {
            ...widget,
            props: generateSampleProps(widget.id)
        };
    }
</script>

<div class="flex gap-6 h-[65vh]">
    <button
    class="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover text-light-text-muted dark:text-dark-text-muted transition-colors"
    on:click={onClose}
>
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
</button>
    <!-- Widget List -->
    <div class="w-2/6 space-y-1.5 overflow-y-auto">
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

    <!-- Widget Preview -->
    {#if previewWidget}
        <div 
            class="relative w-4/6 rounded-lg bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border h-full flex flex-col"
            transition:fly={{ x: 20, duration: 200 }}
        >
            <!-- Close Button -->


            <!-- Widget Preview with scroll -->
            <div class="h-[70%] bg-white dark:bg-black rounded-t-lg border-b overflow-hidden border-light-border dark:border-dark-border">
                <div class="p-4 h-full overflow-auto">
                    <div 
                        class="relative pointer-events-none transform-gpu min-w-fit"
                        style="
                            width: {getPreviewWidth(previewWidget.id)}px; 
                            height: {getPreviewHeight(previewWidget.id)}px;
                            margin: 0 auto;
                        "
                    >
                        {#if getComponentByName(previewWidget.id)}
                            <svelte:component 
                                this={getComponentByName(previewWidget.id)}
                                {...previewWidget.props}
                                height={getPreviewHeight(previewWidget.id)}
                                textSize="small"
                                isPreview={true}
                            />
                        {/if}
                    </div>
                </div>
            </div>

            <!-- Description with scrollable area -->
            <div class="flex-1 overflow-y-auto">
                <div class="p-3">
                    <div class="widget-description space-y-2 text-xs leading-relaxed text-light-text-muted dark:text-dark-text-muted">
                        {#if description}
                            <h3 class="font-medium text-sm text-light-text dark:text-dark-text mb-2">
                                {description.title}
                            </h3>
                            <p class="mb-3">{description.description}</p>
                            <!--{#if description.features?.length > 0}
                                <div class="mt-2">
                                    <h4 class="font-medium mb-1 text-light-text dark:text-dark-text">Key Features:</h4>
                                    <ul class="list-disc list-inside space-y-1">
                                        {#each description.features as feature}
                                            <li>{feature}</li>
                                        {/each}
                                    </ul> 
                                </div>
                            {/if}-->
                        {/if}
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
                    disabled={getWidgetTypeCount(widgets, previewWidget.id.split('_')[0]) >= (widgetLimits[previewWidget.id.split('_')[0]] || 1)}
                    on:click={() => handleAddWidget(previewWidget.id.split('_')[0])}
                >
                    {getWidgetTypeCount(widgets, previewWidget.id.split('_')[0]) >= (widgetLimits[previewWidget.id.split('_')[0]] || 1) 
                        ? 'Maximum Limit Reached' 
                        : 'Add Widget'
                    }
                </button>
            </div>
        </div>
    {:else}
        <div class="relative w-4/6 h-full flex items-center justify-center p-4 rounded-lg bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border">
            <!-- Close Button -->
            <button
                class="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover text-light-text-muted dark:text-dark-text-muted transition-colors"
                on:click={onClose}
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <span class="text-xs text-light-text-muted dark:text-dark-text-muted">
                Select a widget to see preview
            </span>
        </div>
    {/if}
</div>

<style>
    .widget-description {
        height: 100%;
        overflow-y: auto;
    }

    .overflow-auto {
        overflow: auto;
        max-width: 100%;
        max-height: 400px;
    }

    .p-4.overflow-auto {
        padding: 1rem;
        scrollbar-width: thin;
        scrollbar-color: var(--theme-500) transparent;
    }

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

    /* Preview container styles */
    .transform-gpu {
        transform-origin: top center;
        will-change: transform;
        width: 100%;
        height: 100%;
        display: block;
        margin: 0 auto;
        transition: transform 0.2s ease-out;
    }

    /* Description container styles */
    :global(.widget-description ul) {
        list-style-type: disc;
        margin-left: 1rem;
    }

    :global(.widget-description li) {
        margin-top: 0.25rem;
    }

    :global(.widget-description .title) {
        font-weight: 500;
        margin-bottom: 0.5rem;
    }

    /* Horizontal scrollbar styles */
    .overflow-x-auto {
        scrollbar-width: thin;
        scrollbar-color: var(--theme-500) transparent;
    }

    .overflow-x-auto::-webkit-scrollbar {
        height: 6px;
    }

    .overflow-x-auto::-webkit-scrollbar-track {
        background: transparent;
    }

    .overflow-x-auto::-webkit-scrollbar-thumb {
        background-color: var(--theme-500);
        border-radius: 3px;
    }

    /* Preview container styles */
    .transform-gpu {
        will-change: transform;
        transition: transform 0.2s ease-out;
    }

    .min-w-fit {
        min-width: fit-content;
    }
</style> 