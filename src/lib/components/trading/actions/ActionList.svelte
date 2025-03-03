<script>
    import { createEventDispatcher } from 'svelte';
    import { fade } from 'svelte/transition';
    import ActionItem from './ActionItem.svelte';
    
    const dispatch = createEventDispatcher();
    
    // Props
    export let actions = [];
    export let containerDisabled = false;
    export let availableActions = [];
    
    // Local state for action menu dropdowns
    let actionMenuOpen = Array(actions.length).fill(false);
    
    // Toggle dropdown for a specific action
    function toggleActionMenu(index) {
        closeAllMenus();
        actionMenuOpen[index] = !actionMenuOpen[index];
    }
    
    // Close all menus
    function closeAllMenus() {
        actionMenuOpen = actionMenuOpen.map(() => false);
    }
    
    // Handle action events and forward them
    function handleActionAction(event, actionType, index) {
        dispatch(actionType, { ...event.detail, index });
        closeAllMenus();
    }
</script>

<div class="space-y-4 mb-4">
    {#each actions as action, i (action.id)}
        <ActionItem 
            {action}
            index={i}
            {containerDisabled}
            {availableActions}
            isMenuOpen={actionMenuOpen[i]}
            on:togglemenu={() => toggleActionMenu(i)}
            on:closemenu={closeAllMenus}
            on:toggledisabled={(e) => handleActionAction(e, 'toggledisabled', i)}
            on:edit={(e) => handleActionAction(e, 'editaction', i)}
            on:remove={(e) => handleActionAction(e, 'removeaction', i)}
        />
    {/each}
    
    <!-- Empty state message when no actions -->
    {#if actions.length === 0}
        <div class="p-4 border border-dashed border-light-border dark:border-dark-border rounded-lg bg-light-card dark:bg-dark-card text-center">
            <p class="text-light-text-muted dark:text-dark-text-muted text-sm">
                No actions added yet. Add an action to execute when conditions are met.
            </p>
        </div>
    {/if}
    
    <!-- Add action button -->
    <button
        class="w-full p-2 border border-dashed border-green-300 dark:border-green-700 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
        on:click={() => dispatch('addaction')}
    >
        <div class="flex items-center justify-center">
            <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Action
        </div>
    </button>
</div> 