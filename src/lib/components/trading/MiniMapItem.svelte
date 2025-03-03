<script>
    // Props
    export let container;
    export let level = 0;
    export let activeContainerId = null;
    
    // Function to get container type class for styling
    function getContainerTypeClass(containerType) {
        switch(containerType) {
            case 'IF': return 'bg-blue-500';
            case 'ELSE_IF': return 'bg-purple-500';
            case 'ELSE': return 'bg-green-500';
            default: return 'bg-gray-500';
        }
    }
    
    // Events
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();
    
    function handleClick() {
        dispatch('select', { containerId: container.id });
    }
    
    // Calculate indentation based on level
    $: indent = `margin-left: ${level * 0.75}rem;`;
</script>

<div style={indent} class="mini-map-container">
    <div class="flex items-center mb-1 cursor-pointer hover:opacity-80"
         on:click={handleClick}>
        <!-- Type indicator -->
        <div class="h-3 w-3 rounded-sm mr-1.5 {getContainerTypeClass(container.containerType)} 
                  {container.id === activeContainerId ? 'ring-2 ring-white' : ''} 
                  {container.disabled ? 'opacity-50' : ''}">
        </div>
        
        <!-- Label -->
        <div class="text-xs text-gray-300 {container.id === activeContainerId ? 'text-white font-medium' : ''}">
            {container.containerType}
            {#if container.name && container.name !== 'Command Group'}
                <span class="opacity-75">: {container.name}</span>
            {/if}
        </div>
    </div>
    
    <!-- Render children recursively -->
    {#if container.children && container.children.length > 0}
        {#each container.children as childContainer}
            <svelte:self 
                container={childContainer} 
                level={level + 1} 
                {activeContainerId}
                on:select
            />
        {/each}
    {/if}
</div> 