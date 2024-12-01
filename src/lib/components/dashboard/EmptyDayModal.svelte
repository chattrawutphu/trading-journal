<script>
    import { createEventDispatcher } from 'svelte';
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
<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" on:click={close}>
    <div class="bg-light-card dark:bg-dark-card rounded-lg shadow-xl max-w-md w-full" on:click|stopPropagation>
        <!-- Header -->
        <div class="p-4 border-b border-light-border dark:border-dark-border">
            <div class="flex justify-between items-center">
                <h2 class="text-2xl font-bold bg-gradient-purple bg-clip-text text-transparent">
                    {new Date(date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </h2>
                <button class="text-light-text-muted dark:text-dark-text-muted hover:text-theme-500" on:click={close}>
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>

        <!-- Content -->
        <div class="p-6 text-center">
            <svg class="w-12 h-12 mx-auto mb-4 text-light-text-muted dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            <p class="text-light-text-muted dark:text-dark-text mb-6">
                No trades recorded for this day. Would you like to add one?
            </p>
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
