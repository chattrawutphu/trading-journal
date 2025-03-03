<script>
    import { createEventDispatcher } from 'svelte';
    import { fade, fly } from 'svelte/transition';
    
    const dispatch = createEventDispatcher();
    
    // Props
    export let showModal = false;
    export let helpContext = 'container'; // 'container', 'condition', or 'action'
    
    // Close the modal
    function close() {
        dispatch('close');
    }
</script>

{#if showModal}
    <div class="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center" 
         on:click={close}
         transition:fade={{ duration: 150 }}>
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 max-w-md w-full mx-4" 
             on:click|stopPropagation
             transition:fly={{ y: 20, duration: 200 }}>
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {#if helpContext === 'container'}
                        About Command Containers
                    {:else if helpContext === 'condition'}
                        About Conditions
                    {:else if helpContext === 'action'}
                        About Actions
                    {:else}
                        Help
                    {/if}
                </h3>
                <button class="text-gray-400 hover:text-gray-500" on:click={close}>
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            
            <div class="text-sm text-gray-600 dark:text-gray-300 space-y-3">
                {#if helpContext === 'container'}
                    <p>Command containers group conditions and actions together. When all conditions in a container are met, the actions will execute.</p>
                    <p><strong>IF containers</strong> are the starting point for any logical condition.</p>
                    <p><strong>ELSE IF containers</strong> are checked only if the previous IF or ELSE IF conditions were not met.</p>
                    <p><strong>ELSE containers</strong> contain actions that execute when none of the previous conditions were met.</p>
                {:else if helpContext === 'condition'}
                    <p>Conditions determine when your actions will be executed. They are evaluated based on market data and indicators.</p>
                    <p>Multiple conditions can be grouped with AND/OR operators.</p>
                    <p>You can add NOT to invert a condition's result.</p>
                {:else if helpContext === 'action'}
                    <p>Actions are the operations that will be performed when conditions are met, such as buying, selling, or setting stops.</p>
                    <p>Actions execute in the order they are listed from top to bottom.</p>
                {/if}
                
                <div class="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p class="text-xs text-gray-500 dark:text-gray-400">For more detailed help, check our <a href="/documentation" class="text-blue-500 hover:underline">documentation</a>.</p>
                </div>
            </div>
        </div>
    </div>
{/if} 