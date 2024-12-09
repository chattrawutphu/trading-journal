<script>
    import { createEventDispatcher } from 'svelte';
    import { fade, fly } from 'svelte/transition';
    import Button from '../common/Button.svelte';
    import Input from '../common/Input.svelte';

    const dispatch = createEventDispatcher();

    export let show = false;
    export let date = '';

    // Get current date in YYYY-MM-DD format for max attribute
    const maxDate = new Date().toISOString().slice(0, 10);

    function close() {
        show = false;
    }

    function handleNewTrade() {
        // Format date for date input (YYYY-MM-DD)
        const formattedDate = new Date(date);
        formattedDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
        dispatch('newTrade', formattedDate.toISOString().slice(0, 10));
        close();
    }
</script>

{#if show}
    <div 
        class="fixed inset-0 bg-black/50  z-50 flex items-center justify-center p-4 "
        transition:fade={{ duration: 150 }}>
        <div 
            class="card w-full max-w-lg mx-auto relative transform  ease-out">
            <!-- Header -->
            <div class="px-8 py-5 border-b border-light-border dark:border-dark-border flex justify-between items-center sticky top-0 bg-light-card dark:bg-dark-card rounded-t-xl backdrop-blur-lg bg-opacity-90 dark:bg-opacity-90 z-10">
                <h2 class="text-2xl font-bold bg-gradient-purple bg-clip-text text-transparent">New Trade</h2>
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
                <div class="text-center">
                    <svg on:click={handleNewTrade} class="w-16 h-16 mx-auto mb-4 text-light-text-muted dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                    </svg>
                    <p class="text-light-text-muted dark:text-dark-text mb-6">
                        No trades recorded for this day. Would you like to add one?
                    </p>
                </div>
            </div>
            <div class="px-8 py-6 hidden">
                <Input
                    type="date"
                    label="Entry Date"
                    bind:value={date}
                    required
                    max={maxDate}
                />
            </div>

            <!-- Footer -->
            <div class="px-8 py-5 border-t border-light-border dark:border-dark-border flex justify-end gap-4 sticky bottom-0 bg-light-card dark:bg-dark-card rounded-b-xl backdrop-blur-lg bg-opacity-90 dark:bg-opacity-90 z-10">
                <Button variant="secondary" on:click={close}>
                    Cancel
                </Button>
                <Button variant="primary" on:click={handleNewTrade}>
                    Create Trade
                </Button>
            </div>
        </div>
    </div>
{/if}

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl shadow-xl transition-colors duration-200;
    }
</style>
