<script>
    import { createEventDispatcher } from 'svelte';
    import { fade, fly } from 'svelte/transition';
    import Button from '$lib/components/common/Button.svelte';
    
    const dispatch = createEventDispatcher();
    
    // Props
    export let showModal = false;
    export let item;
    export let itemType;
    export let availableConditions = [];
    export let availableActions = [];
    
    // Get definition based on item type
    function getDefinition(id) {
        if (itemType === 'condition') {
            return availableConditions.find(c => c.id === id.split('_')[0]);
        } else {
            return availableActions.find(a => a.id === id.split('_')[0]);
        }
    }
    
    // Check if parameter should be shown based on conditions
    function shouldShowParam(param, item) {
        if (!param.showIf) return true;
        
        const dependentParam = item.params.find(p => p.name === param.showIf.field);
        return dependentParam && dependentParam.value === param.showIf.value;
    }
    
    // Close the modal
    function close() {
        dispatch('close');
    }
    
    // Save the edited item
    function save() {
        dispatch('save', { item });
    }
</script>

{#if showModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
         transition:fade={{ duration: 150 }}>
        <div class="bg-light-card dark:bg-dark-card rounded-lg shadow-xl w-full max-w-md p-4 max-h-[90vh] overflow-y-auto"
             transition:fly={{ y: 20, duration: 200 }}>
            <div class="flex items-center justify-between mb-4 pb-2 border-b border-light-border dark:border-dark-border">
                <h3 class="text-xl font-semibold text-light-text dark:text-dark-text flex items-center">
                    {#if itemType === 'condition'}
                        <div class="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mr-2 border border-blue-200 dark:border-blue-800">
                            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                    {:else}
                        <div class="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 flex items-center justify-center mr-2 border border-green-200 dark:border-green-800">
                            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                    {/if}
                    {item.name}
                </h3>
                <button class="text-light-text-muted dark:text-dark-text-muted hover:text-red-500 dark:hover:text-red-400" on:click={close}>
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            
            <!-- Add description display -->
            {#if getDefinition(item.id)?.description}
                <div class="mb-4 p-3 {itemType === 'condition' ? 'bg-blue-50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-300' : 'bg-green-50 dark:bg-green-900/10 text-green-800 dark:text-green-300'} rounded-md text-sm">
                    {getDefinition(item.id).description}
                </div>
            {/if}
            
            <!-- Improved parameter editing UI -->
            <div class="space-y-4">
                {#each item.params as param, paramIndex}
                    {#if shouldShowParam(param, item)}
                        <div class="form-group p-3 border border-light-border dark:border-dark-border rounded-lg bg-light-hover/50 dark:bg-dark-hover/50">
                            <label class="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5 flex items-center">
                                <span>{param.name}</span>
                                <span class="ml-1.5 text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-400">
                                    {param.type}
                                </span>
                            </label>
                            
                            <!-- More intuitive input fields by type -->
                            {#if param.type === 'number'}
                                <div class="flex items-center">
                                <input 
                                    type="number" 
                                    class="w-full p-2 rounded-md bg-white dark:bg-gray-700 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                                    bind:value={param.value}
                                    placeholder={param.default.toString()}
                                />
                                    <!-- Add increment/decrement buttons for number inputs -->
                                    <div class="flex flex-col ml-2">
                                        <button class="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                            on:click={() => param.value = (parseFloat(param.value) || 0) + 1}>
                                            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                                            </svg>
                                        </button>
                                        <button class="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                            on:click={() => param.value = Math.max(0, (parseFloat(param.value) || 0) - 1)}>
                                            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            {:else if param.type === 'text'}
                                <input 
                                    type="text" 
                                    class="w-full p-2 rounded-md bg-white dark:bg-gray-700 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                                    bind:value={param.value}
                                    placeholder={param.default}
                                />
                            {:else if param.type === 'time'}
                                <input 
                                    type="time" 
                                    class="w-full p-2 rounded-md bg-white dark:bg-gray-700 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                                    bind:value={param.value}
                                />
                            {:else if param.type === 'select'}
                                <select 
                                    class="w-full p-2 rounded-md bg-white dark:bg-gray-700 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                                    bind:value={param.value}
                                >
                                    {#each param.options as option}
                                        <option value={option}>{option}</option>
                                    {/each}
                                </select>
                            {/if}
                            
                            <!-- Parameter help text if available -->
                            {#if param.help}
                                <p class="mt-1 text-xs text-light-text-muted dark:text-dark-text-muted">{param.help}</p>
                            {/if}
                        </div>
                    {/if}
                {/each}
            </div>
            
            <!-- Action buttons -->
            <div class="flex justify-end space-x-2 mt-6">
                <Button variant="secondary" size="sm" on:click={close}>
                    Cancel
                </Button>
                <Button variant="primary" size="sm" on:click={save}>
                    Save Changes
                </Button>
            </div>
        </div>
    </div>
{/if} 