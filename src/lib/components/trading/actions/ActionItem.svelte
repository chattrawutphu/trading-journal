<script>
    import { createEventDispatcher } from 'svelte';
    import { fade } from 'svelte/transition';
    
    const dispatch = createEventDispatcher();
    
    // Props
    export let action;
    export let index;
    export let containerDisabled = false;
    export let availableActions = [];
    
    // Dropdown state
    export let isMenuOpen = false;
    
    // Function to get definition
    export function getActionDefinition(actionId) {
        return availableActions.find(a => a.id === actionId.split('_')[0]);
    }
    
    // Format parameter value for display
    function formatParamValue(param) {
        if (param.type === 'select') {
            return param.value || param.default;
        } else if (param.type === 'number') {
            return (param.value ?? param.default).toString();
        } else {
            return param.value || param.default || '';
        }
    }
    
    // Check if parameter should be shown based on conditions
    function shouldShowParam(param, item) {
        if (!param.showIf) return true;
        
        const dependentParam = item.params.find(p => p.name === param.showIf.field);
        return dependentParam && dependentParam.value === param.showIf.value;
    }
    
    // Component actions
    function toggleDisabled() {
        dispatch('toggledisabled', { index });
    }
    
    function editAction() {
        dispatch('edit', { action, index });
    }
    
    function removeAction() {
        dispatch('remove', { index });
    }
    
    // Handle clicks on dropdown items
    function handleDropdownAction(action) {
        switch(action) {
            case 'edit':
                editAction();
                break;
            case 'toggledisabled':
                toggleDisabled();
                break;
            case 'remove':
                removeAction();
                break;
        }
        // Close the dropdown after action
        dispatch('closemenu');
    }
</script>

<div class="p-0 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30 border border-green-200 dark:border-green-800 rounded-lg shadow-sm flex justify-between items-stretch relative action-item overflow-hidden">
    <!-- Left color indicator -->
    <div class="w-1.5 bg-green-400 dark:bg-green-500"></div>
    
    <!-- Content with status indicators -->
    <div class="flex-1 p-3 {action.disabled || containerDisabled ? 'opacity-60' : ''}">
        <div class="font-medium text-sm text-light-text dark:text-dark-text flex items-center">
            <!-- Icon indicator -->
            <svg class="w-4 h-4 mr-1.5 text-green-500 dark:text-green-400" 
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            
            <!-- Action name -->
            <span class="{action.disabled || containerDisabled ? 'line-through text-red-500 dark:text-red-400' : ''}">{action.name}</span>
        </div>
        
        <!-- Description text -->
        {#if getActionDefinition(action.id)?.description}
            <div class="mt-1 text-xs text-light-text-muted dark:text-dark-text-muted italic {action.disabled || containerDisabled ? 'line-through text-red-400/80 dark:text-red-300/80' : ''}">
                {getActionDefinition(action.id).description}
            </div>
        {/if}
        
        <!-- Parameters -->
        <div class="mt-1 text-xs text-light-text-muted dark:text-dark-text-muted {action.disabled || containerDisabled ? 'line-through text-red-400 dark:text-red-300' : ''}">
            {#each action.params as param}
                {#if shouldShowParam(param, action)}
                    <span class="inline-flex items-center mr-2 px-1.5 py-0.5 rounded-md bg-light-hover/50 dark:bg-dark-hover/50">
                        <span class="font-medium mr-1">{param.name}:</span> {formatParamValue(param)}
                    </span>
                {/if}
            {/each}
        </div>
    </div>
    
    <!-- Dropdown menu -->
    <div class="flex items-center pr-2">
        <!-- Action dropdown toggle button -->
        <button 
            class="p-1.5 rounded-md text-light-text-muted dark:text-dark-text-muted hover:text-green-500 dark:hover:text-green-400 hover:bg-light-hover dark:hover:bg-dark-hover dropdown-toggle"
            on:click|stopPropagation={() => dispatch('togglemenu', { index })}
            title="Action options"
        >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
        </button>
        
        {#if isMenuOpen}
            <div 
                class="absolute right-0 top-full mt-1 w-40 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50 dropdown-menu"
                transition:fade={{ duration: 100 }}
            >
                <div class="py-1" role="menu" aria-orientation="vertical">
                    <!-- Edit option -->
                    <button 
                        class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        on:click|stopPropagation={() => handleDropdownAction('edit')}
                    >
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Action
                    </button>
                    
                    <!-- Toggle Disabled option -->
                    <button 
                        class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        on:click|stopPropagation={() => handleDropdownAction('toggledisabled')}
                    >
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        {action.disabled ? 'Enable' : 'Disable'}
                    </button>
                    
                    <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                    
                    <!-- Delete option -->
                    <button 
                        class="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        on:click|stopPropagation={() => handleDropdownAction('remove')}
                    >
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                    </button>
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    /* Add any specific styles needed for this component */
    .action-item {
        position: relative;
    }
</style> 