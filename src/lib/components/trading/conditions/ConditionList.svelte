<script>
    import { createEventDispatcher } from 'svelte';
    import { fade } from 'svelte/transition';
    import ConditionItem from './ConditionItem.svelte';
    import LogicalOperator from '../common/LogicalOperator.svelte';
    
    const dispatch = createEventDispatcher();
    
    // Props
    export let conditions = [];
    export let conditionOperators = [];
    export let containerDisabled = false;
    export let availableConditions = [];
    
    // Local state for the condition menu dropdowns
    let conditionMenuOpen = Array(conditions.length).fill(false);
    
    // Toggle dropdown for a specific condition
    function toggleConditionMenu(index) {
        closeAllMenus();
        conditionMenuOpen[index] = !conditionMenuOpen[index];
    }
    
    // Close all menus
    function closeAllMenus() {
        conditionMenuOpen = conditionMenuOpen.map(() => false);
    }
    
    // Toggle operator
    function toggleOperator(event) {
        const { index, value } = event.detail;
        dispatch('operatortoggle', { index, value });
    }
    
    // Handle condition events and forward them
    function handleConditionAction(event, actionType, index) {
        dispatch(actionType, { ...event.detail, index });
        closeAllMenus();
    }
</script>

<div class="space-y-4 mb-4">
    {#each conditions as condition, i (condition.id)}
        <div class="relative">
            <!-- Show logical operator between conditions -->
            {#if i > 0}
                <LogicalOperator 
                    operator={conditionOperators[i-1]} 
                    index={i-1}
                    on:toggle={toggleOperator}
                />
            {/if}
            
            <ConditionItem 
                {condition}
                index={i}
                {containerDisabled}
                {availableConditions}
                isMenuOpen={conditionMenuOpen[i]}
                on:togglemenu={() => toggleConditionMenu(i)}
                on:closemenu={closeAllMenus}
                on:togglenot={(e) => handleConditionAction(e, 'togglenot', i)}
                on:toggledisabled={(e) => handleConditionAction(e, 'toggledisabled', i)}
                on:edit={(e) => handleConditionAction(e, 'editcondition', i)}
                on:remove={(e) => handleConditionAction(e, 'removecondition', i)}
            />
        </div>
    {/each}
    
    <!-- Empty state message when no conditions -->
    {#if conditions.length === 0}
        <div class="p-4 border border-dashed border-light-border dark:border-dark-border rounded-lg bg-light-card dark:bg-dark-card text-center">
            <p class="text-light-text-muted dark:text-dark-text-muted text-sm">
                No conditions added yet. Add a condition to specify when actions should execute.
            </p>
        </div>
    {/if}
    
    <!-- Add condition button -->
    <button
        class="w-full p-2 border border-dashed border-blue-300 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        on:click={() => dispatch('addcondition')}
    >
        <div class="flex items-center justify-center">
            <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Condition
        </div>
    </button>
</div> 