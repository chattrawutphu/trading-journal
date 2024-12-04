<script>
    import { fade, fly, crossfade } from 'svelte/transition';
    import { quintOut } from 'svelte/easing';
    import { tradingStatsStore, PERIOD_OPTIONS } from '$lib/stores/tradingStatsStore';
    import Button from '../common/Button.svelte';

    export let show = false;

    const [send, receive] = crossfade({
        duration: 400,
        easing: quintOut
    });

    let availablePeriods = Object.values(PERIOD_OPTIONS).filter(
        period => !$tradingStatsStore.selectedPeriods.includes(period.id)
    );

    let draggedPeriod = null;

    function close() {
        show = false;
    }

    function addPeriod(periodId) {
        tradingStatsStore.addPeriod(periodId);
        availablePeriods = Object.values(PERIOD_OPTIONS).filter(
            period => !$tradingStatsStore.selectedPeriods.includes(period.id)
        );
    }

    function removePeriod(periodId) {
        tradingStatsStore.removePeriod(periodId);
        availablePeriods = Object.values(PERIOD_OPTIONS).filter(
            period => !$tradingStatsStore.selectedPeriods.includes(period.id)
        );
    }

    function resetConfig() {
        tradingStatsStore.reset();
        availablePeriods = Object.values(PERIOD_OPTIONS).filter(
            period => !$tradingStatsStore.selectedPeriods.includes(period.id)
        );
    }

    function handleDragStart(event, periodId) {
        draggedPeriod = periodId;
        event.dataTransfer.effectAllowed = 'move';
        event.target.classList.add('dragging');
    }

    function handleDragEnd(event) {
        draggedPeriod = null;
        event.target.classList.remove('dragging');
        document.querySelectorAll('.period-item').forEach(item => {
            item.classList.remove('drag-over');
        });
    }

    function handleDrop(event, periodId) {
        event.preventDefault();
        
        const draggedIndex = $tradingStatsStore.selectedPeriods.indexOf(draggedPeriod);
        const targetIndex = $tradingStatsStore.selectedPeriods.indexOf(periodId);
        
        if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
            const newPeriods = [...$tradingStatsStore.selectedPeriods];
            newPeriods.splice(draggedIndex, 1);
            newPeriods.splice(targetIndex, 0, draggedPeriod);
            tradingStatsStore.reorderPeriods(newPeriods);
        }

        handleDragEnd(event);
    }

    function handleDragOver(event, periodId) {
        event.preventDefault();
        if (!draggedPeriod || draggedPeriod === periodId) return;
        
        const item = event.target.closest('.period-item');
        if (item) {
            document.querySelectorAll('.period-item').forEach(el => {
                el.classList.remove('drag-over');
            });
            item.classList.add('drag-over');
        }
    }
</script>

{#if show}
    <div 
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        style="margin-top: 0!important;"
        on:click={close}
        transition:fade={{ duration: 200 }}
    >
        <div 
            class="card w-full max-w-5xl mx-auto relative"
            on:click|stopPropagation
            in:fly={{ y: 20, duration: 300, delay: 150 }}
            out:fly={{ y: 20, duration: 200 }}
        >
            <!-- Header -->
            <div class="px-8 py-5 border-b border-light-border dark:border-dark-border flex justify-between items-center sticky top-0 bg-light-card dark:bg-dark-card rounded-t-xl backdrop-blur-lg bg-opacity-90 dark:bg-opacity-90 z-10">
                <h2 class="text-2xl font-bold bg-gradient-purple bg-clip-text text-transparent">Configure Stats</h2>
                <button 
                    class="p-2 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover transition-all duration-200"
                    on:click={close}
                >
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <!-- Content -->
            <div class="px-8 py-6">
                <div class="flex gap-8">
                    <!-- Selected Periods -->
                    <div class="flex-1">
                        <h3 class="text-lg font-semibold mb-4 text-light-text dark:text-dark-text">Selected Periods</h3>
                        <div class="space-y-1">
                            {#each $tradingStatsStore.selectedPeriods as periodId (periodId)}
                                {@const period = PERIOD_OPTIONS[periodId]}
                                <div 
                                    class="period-item flex items-center justify-between p-3 rounded-lg bg-light-hover/30 dark:bg-dark-hover/30 cursor-move"
                                    draggable="true"
                                    on:dragstart={(e) => handleDragStart(e, periodId)}
                                    on:dragend={handleDragEnd}
                                    on:dragover={(e) => handleDragOver(e, periodId)}
                                    on:drop={(e) => handleDrop(e, periodId)}
                                    in:receive={{key: periodId}}
                                    out:send={{key: periodId}}
                                >
                                    <div class="flex items-center gap-3">
                                        <div class="drag-handle w-4 h-4 text-light-text-muted dark:text-dark-text-muted cursor-move">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                                            </svg>
                                        </div>
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={period.icon}/>
                                        </svg>
                                        <span>{period.label}</span>
                                    </div>
                                    <button 
                                        class="p-1.5 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-red-500 hover:bg-light-card dark:hover:bg-dark-card transition-colors duration-200"
                                        on:click={() => removePeriod(period.id)}
                                    >
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                        </svg>
                                    </button>
                                </div>
                            {/each}
                        </div>
                    </div>

                    <!-- Available Periods -->
                    <div class="flex-1">
                        <h3 class="text-lg font-semibold mb-4 text-light-text dark:text-dark-text">Available Periods</h3>
                        <div class="space-y-1">
                            {#each availablePeriods as period}
                                <button 
                                    class="w-full flex items-center gap-3 p-3 rounded-lg bg-light-hover/30 dark:bg-dark-hover/30 hover:bg-light-hover dark:hover:bg-dark-hover transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    on:click={() => addPeriod(period.id)}
                                    disabled={$tradingStatsStore.selectedPeriods.length >= $tradingStatsStore.maxPeriods}
                                >
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={period.icon}/>
                                    </svg>
                                    <span>{period.label}</span>
                                </button>
                            {/each}
                            {#if availablePeriods.length === 0}
                                <div class="text-center py-3 text-light-text-muted dark:text-dark-text-muted">
                                    No more periods available
                                </div>
                            {/if}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="px-8 py-5 border-t border-light-border dark:border-dark-border flex justify-between gap-4 sticky bottom-0 bg-light-card dark:bg-dark-card rounded-b-xl backdrop-blur-lg bg-opacity-90 dark:bg-opacity-90 z-10">
                <Button variant="secondary" on:click={resetConfig}>
                    Reset to Default
                </Button>
                <Button variant="primary" on:click={close}>
                    Done
                </Button>
            </div>
        </div>
    </div>
{/if}

<style>
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl shadow-xl transition-colors duration-200;
    }

    .period-item {
        @apply transition-colors duration-200;
    }

    .period-item.dragging {
        @apply opacity-75 shadow-lg;
    }

    .period-item.drag-over {
        @apply bg-light-hover dark:bg-dark-hover scale-[1.02];
    }

    .drag-handle {
        @apply opacity-50 hover:opacity-100 transition-opacity duration-200;
        touch-action: none;
    }
</style>
