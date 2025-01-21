<script>
    import { fade, slide } from 'svelte/transition';
    import { flip } from 'svelte/animate';
    import Button from '../common/Button.svelte';
    import { tradingStatsStore, PERIOD_OPTIONS } from '$lib/stores/tradingStatsStore';

    export let show = false;

    function handleClose() {
        show = false;
    }

    function moveUp(index) {
        if (index > 0) {
            const newPeriods = [...$tradingStatsStore.selectedPeriods];
            [newPeriods[index], newPeriods[index - 1]] = [newPeriods[index - 1], newPeriods[index]];
            tradingStatsStore.reorderPeriods(newPeriods);
        }
    }

    function moveDown(index) {
        if (index < $tradingStatsStore.selectedPeriods.length - 1) {
            const newPeriods = [...$tradingStatsStore.selectedPeriods];
            [newPeriods[index], newPeriods[index + 1]] = [newPeriods[index + 1], newPeriods[index]];
            tradingStatsStore.reorderPeriods(newPeriods);
        }
    }

    function resetConfig() {
        tradingStatsStore.reset();
    }

    $: availablePeriods = Object.entries(PERIOD_OPTIONS)
        .filter(([id]) => !$tradingStatsStore.selectedPeriods.includes(id))
        .map(([id, data]) => ({ id, ...data }));
</script>

{#if show}
    <div 
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        transition:fade={{ duration: 150 }}
    >
        <div class="card w-full max-w-2xl mx-auto relative max-h-[calc(100vh-2rem)]">
            <!-- Header -->
            <div class="px-6 py-4 border-b border-light-border dark:border-dark-border flex justify-between items-center sticky top-0 bg-light-card dark:bg-dark-card rounded-t-xl backdrop-blur-lg bg-opacity-90 dark:bg-opacity-90 z-10">
                <h2 class="text-xl font-bold bg-gradient-to-r from-theme-500 to-theme-600 bg-clip-text text-transparent">
                    Configure Stats
                </h2>
                <button
                    class="p-2 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover"
                    on:click={handleClose}
                >
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>

            <!-- Content -->
            <div class="px-6 py-4 overflow-y-auto max-h-[calc(100vh-16rem)]">
                <div class="grid grid-cols-2 gap-6">
                    <!-- Selected Periods -->
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <h3 class="text-base font-semibold text-light-text dark:text-dark-text">
                                Selected Periods
                            </h3>
                            <span class="text-sm text-light-text-muted dark:text-dark-text-muted">
                                {$tradingStatsStore.selectedPeriods.length}/{$tradingStatsStore.maxPeriods}
                            </span>
                        </div>
                        <div class="space-y-2 bg-light-hover/20 dark:bg-dark-hover/20 p-4 rounded-xl min-h-[200px]">
                            {#each $tradingStatsStore.selectedPeriods as periodId, index (periodId)}
                                <div 
                                    animate:flip={{duration: 300}}
                                    class="period-item flex items-center justify-between p-3 rounded-lg bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border group hover:shadow-md"
                                >
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-full bg-theme-500/10 flex items-center justify-center">
                                            <svg class="w-4 h-4 text-theme-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={PERIOD_OPTIONS[periodId].icon}/>
                                            </svg>
                                        </div>
                                        <span class="font-medium text-light-text dark:text-dark-text">
                                            {PERIOD_OPTIONS[periodId].label}
                                        </span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <div class="flex flex-col gap-0.5">
                                            <button
                                                class="p-1 rounded text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover disabled:opacity-30"
                                                on:click={() => moveUp(index)}
                                                disabled={index === 0}
                                            >
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
                                                </svg>
                                            </button>
                                            <button
                                                class="p-1 rounded text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover disabled:opacity-30"
                                                on:click={() => moveDown(index)}
                                                disabled={index === $tradingStatsStore.selectedPeriods.length - 1}
                                            >
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                                </svg>
                                            </button>
                                        </div>
                                        {#if $tradingStatsStore.selectedPeriods.length > 1}
                                            <button
                                                class="p-1.5 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-red-500 hover:bg-light-hover dark:hover:bg-dark-hover"
                                                on:click={() => tradingStatsStore.removePeriod(periodId)}
                                            >
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                                </svg>
                                            </button>
                                        {/if}
                                    </div>
                                </div>
                            {/each}
                            {#if $tradingStatsStore.selectedPeriods.length === 0}
                                <div class="flex flex-col items-center justify-center h-[200px] text-light-text-muted dark:text-dark-text-muted">
                                    <svg class="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                    </svg>
                                    <span class="text-sm">No periods selected</span>
                                </div>
                            {/if}
                        </div>
                    </div>

                    <!-- Available Periods -->
                    <div class="space-y-3">
                        <h3 class="text-base font-semibold text-light-text dark:text-dark-text">
                            Available Periods
                        </h3>
                        <div class="space-y-2 bg-light-hover/20 dark:bg-dark-hover/20 p-4 rounded-xl min-h-[200px]">
                            {#each availablePeriods as period}
                                <button
                                    class="w-full flex items-center gap-3 p-3 rounded-lg bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border hover:shadow-md hover:bg-light-hover dark:hover:bg-dark-hover disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                                    on:click={() => tradingStatsStore.addPeriod(period.id)}
                                    disabled={$tradingStatsStore.selectedPeriods.length >= $tradingStatsStore.maxPeriods}
                                >
                                    <div class="w-8 h-8 rounded-full bg-theme-500/10 flex items-center justify-center">
                                        <svg class="w-4 h-4 text-theme-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={period.icon}/>
                                        </svg>
                                    </div>
                                    <span class="font-medium text-light-text dark:text-dark-text">{period.label}</span>
                                </button>
                            {/each}
                            {#if availablePeriods.length === 0}
                                <div class="flex flex-col items-center justify-center h-[200px] text-light-text-muted dark:text-dark-text-muted">
                                    <svg class="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                    </svg>
                                    <span class="text-sm">All periods selected</span>
                                </div>
                            {/if}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="px-6 py-4 border-t border-light-border dark:border-dark-border flex justify-between gap-4 sticky bottom-0 bg-light-card dark:bg-dark-card rounded-b-xl backdrop-blur-lg bg-opacity-90 dark:bg-opacity-90 z-10">
                <Button variant="secondary" size="sm" on:click={resetConfig}>
                    Reset to Default
                </Button>
                <Button variant="primary" size="sm" on:click={handleClose}>
                    Done
                </Button>
            </div>
        </div>
    </div>
{/if}

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl shadow-xl;
    }

    .period-item {
        @apply transition-all duration-200;
    }

    .period-item:hover {
        @apply ring-1 ring-theme-500 ring-opacity-30;
    }
</style>
