<script>
    import Button from '../common/Button.svelte';
    
    export let onAddWidget;
</script>

<div class="flex flex-col items-center justify-center p-8 min-h-[400px] rounded-lg border-2 border-dashed border-light-border dark:border-dark-border">
    <div class="text-center space-y-4">
        <svg class="w-16 h-16 mx-auto text-light-text-muted dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
        <div class="space-y-2">
            <h3 class="text-lg font-medium text-light-text dark:text-dark-text">No Widgets Added</h3>
            <p class="text-sm text-light-text-muted dark:text-dark-text-muted">
                Start by adding widgets to customize your dashboard
            </p>
        </div>
        <Button
            variant="primary"
            size="sm"
            on:click={onAddWidget}
            class="mt-4"
        >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Your First Widget
        </Button>
    </div>
</div> 