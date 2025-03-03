<script>
    import { createEventDispatcher } from 'svelte';
    import { fade } from 'svelte/transition';
    
    const dispatch = createEventDispatcher();
    
    // Props
    export let condition;
    export let index;
    export let containerDisabled = false;
    export let availableConditions = [];
    
    // Dropdown state
    export let isMenuOpen = false;
    
    // Function to get definition
    export function getConditionDefinition(conditionId) {
        return availableConditions.find(c => c.id === conditionId.split('_')[0]);
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
    function toggleNot() {
        dispatch('togglenot', { index });
    }
    
    function toggleDisabled() {
        dispatch('toggledisabled', { index });
    }
    
    function editCondition() {
        dispatch('edit', { condition, index });
    }
    
    function removeCondition() {
        dispatch('remove', { index });
    }
    
    // Handle clicks on dropdown items
    function handleDropdownAction(action) {
        switch(action) {
            case 'togglenot':
                toggleNot();
                break;
            case 'edit':
                editCondition();
                break;
            case 'toggledisabled':
                toggleDisabled();
                break;
            case 'remove':
                removeCondition();
                break;
        }
        // Close the dropdown after action
        dispatch('closemenu');
    }
</script>

<div class="p-0 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg shadow-sm flex justify-between items-stretch relative condition-item overflow-hidden">
    <!-- Left color indicator -->
    <div class="w-1.5 bg-blue-400 dark:bg-blue-500"></div>
    
    <!-- Content with status indicators -->
    <div class="flex-1 p-3 {condition.disabled || containerDisabled ? 'opacity-60' : ''}">
        <div class="font-medium text-sm text-light-text dark:text-dark-text flex items-center">
            <!-- Icon indicator -->
            <svg class="w-4 h-4 mr-1.5 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            
            <!-- Condition name -->
            <span class="{condition.disabled || containerDisabled ? 'line-through text-red-500 dark:text-red-400' : ''}">
                {condition.not ? 'NOT ' : ''}{condition.name}
            </span>
        </div>
        
        <!-- Condition definition description text -->
        {#if getConditionDefinition(condition.id)?.description}
            <div class="mt-1 text-xs text-light-text-muted dark:text-dark-text-muted italic {condition.disabled || containerDisabled ? 'line-through text-red-400/80 dark:text-red-300/80' : ''}">
                {getConditionDefinition(condition.id).description}
            </div>
        {/if}
        
        <!-- Parameters -->
        <div class="mt-1 text-xs text-light-text-muted dark:text-dark-text-muted {condition.disabled || containerDisabled ? 'line-through text-red-400 dark:text-red-300' : ''}">
            {#each condition.params.filter(p => shouldShowParam(p, condition)) as param}
                <span class="inline-flex items-center mr-2 px-1.5 py-0.5 rounded-md bg-light-hover/50 dark:bg-dark-hover/50">
                    <span class="font-medium mr-1">{param.name}:</span> {formatParamValue(param)}
                </span>
            {/each}
        </div>
    </div>

    <!-- Dropdown menu -->
    <div class="relative flex items-center">
        <button 
            class="p-1.5 rounded-md text-light-text-muted dark:text-dark-text-muted hover:text-blue-500 dark:hover:text-blue-400 hover:bg-light-hover dark:hover:bg-dark-hover dropdown-toggle"
            on:click|stopPropagation={() => dispatch('togglemenu', { index })}
            title="Condition options"
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
                    <!-- Add Toggle NOT option to the dropdown menu -->
                    <button 
                        class="flex items-center w-full px-4 py-2 text-sm {condition.not ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'} hover:bg-gray-100 dark:hover:bg-gray-700"
                        on:click|stopPropagation={() => handleDropdownAction('togglenot')}
                    >
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        {condition.not ? 'Remove NOT' : 'Add NOT'}
                    </button>
                    
                    <!-- Edit option -->
                    <button 
                        class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        on:click|stopPropagation={() => handleDropdownAction('edit')}
                    >
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Condition
                    </button>
            
                    <!-- Toggle Disabled option -->
                    <button 
                        class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        on:click|stopPropagation={() => handleDropdownAction('toggledisabled')}
                    >
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        {condition.disabled ? 'Enable' : 'Disable'}
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
    .condition-item {
        position: relative;
    }
</style> 