<script>
    import { createEventDispatcher } from 'svelte';
    import { fade, fly } from 'svelte/transition';
    import Button from '../common/Button.svelte';
    
    const dispatch = createEventDispatcher();
    
    export let show = false;
    export let date = '';

    function close() {
        show = false;
    }

    function handleNewTrade() {
        dispatch('newTrade', date);
        close();
    }
</script>

{#if show}
<div 
    class="fixed inset-0 bg-black/50  z-50 flex items-center justify-center p-4 " 
    on:click={close}
    transition:fade={{ duration: 200 }}
>
    <div 
        class="card w-full max-w-md mx-auto relative transform  ease-out" 
        on:click|stopPropagation
        in:fly={{ y: 20, duration: 300, delay: 150 }}
        out:fly={{ y: 20, duration: 200 }}
    >
        <!-- Header -->
        <div class="px-8 py-5 border-b border-light-border dark:border-dark-border flex justify-between items-center sticky top-0 bg-light-card dark:bg-dark-card rounded-t-xl  bg-opacity-90 dark:bg-opacity-90 z-10">
            <h2 class="text-2xl font-bold bg-gradient-purple bg-clip-text text-transparent">
                {new Date(date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })}
            </h2>
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
                <svg class="w-16 h-16 mx-auto mb-4 text-light-text-muted dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
                <p class="text-light-text-muted dark:text-dark-text mb-6">
                    No trades recorded for this day. Would you like to add one?
                </p>
            </div>
        </div>

        <!-- Footer -->
        <div class="px-8 py-5 border-t border-light-border dark:border-dark-border flex justify-end gap-4 sticky bottom-0 bg-light-card dark:bg-dark-card rounded-b-xl  bg-opacity-90 dark:bg-opacity-90 z-10">
            <Button variant="secondary" on:click={close}>
                Cancel
            </Button>
            <Button variant="primary" on:click={handleNewTrade}>
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                New Trade
            </Button>
        </div>
    </div>
</div>
{/if}

<style>
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl shadow-xl transition-colors duration-200;
    }
</style>
