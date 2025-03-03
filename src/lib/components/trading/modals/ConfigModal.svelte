<script>
    import { createEventDispatcher } from 'svelte';
    import Button from '$lib/components/common/Button.svelte';
    
    const dispatch = createEventDispatcher();
    
    // Props
    export let showModal = false;
    export let config = {
        name: 'Command Group',
        containerType: 'IF',
        comment: ''
    };
    
    // Close the modal
    function close() {
        dispatch('close');
    }
    
    // Save the config
    function save() {
        dispatch('save', { config });
    }
</script>

{#if showModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-light-card dark:bg-dark-card rounded-lg shadow-xl w-full max-w-md p-4 max-h-[90vh] overflow-y-auto">
            <h3 class="text-xl font-semibold text-light-text dark:text-dark-text mb-4">
                Configure Container
            </h3>
            
            <div class="space-y-4">
                <!-- Container Name -->
                <div class="form-group">
                    <label class="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                        Container Name
                    </label>
                    <input 
                        type="text" 
                        class="w-full p-2 rounded-md bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                        bind:value={config.name}
                        placeholder="Command Group"
                    />
                </div>
                
                <!-- Container Comment -->
                <div class="form-group">
                    <label class="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                        Comment
                    </label>
                    <textarea 
                        class="w-full p-2 rounded-md bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                        bind:value={config.comment}
                        rows="3"
                        placeholder="Add a comment about this container..."
                    ></textarea>
                </div>
            </div>
            
            <div class="flex justify-end space-x-2 mt-6">
                <Button variant="secondary" size="sm" on:click={close}>
                    Cancel
                </Button>
                <Button variant="primary" size="sm" on:click={save}>
                    Save
                </Button>
            </div>
        </div>
    </div>
{/if} 