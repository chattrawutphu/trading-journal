<script>
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import Button from "$lib/components/common/Button.svelte";
    import Modal from "$lib/components/common/Modal.svelte";
    import CommandContainer from "$lib/components/trading/CommandContainer.svelte";
    import VisualScriptPreview from "$lib/components/trading/VisualScriptPreview.svelte";
    
    // State variables
    let strategy = null;
    let strategyId = "";
    let error = "";
    let containers = [];
    let showCodePreview = false;
    let generatedCode = "";
    let showCopied = false;
    
    // Drag and drop state
    let isDragging = false;
    let draggedItem = null;
    let draggedItemType = null; // 'container', 'condition', 'action'
    let draggedItemIndex = -1;
    let draggedItemParentIndex = -1; // For nested items
    let draggedChildIndex = -1; // For child containers being dragged
    let dropTarget = null;
    let dropTargetType = null; // 'before', 'after', 'inside'
    let dropTargetIndex = -1;
    let dropTargetParentIndex = -1;
    
    onMount(() => {
        // Get strategy ID from URL
        strategyId = $page.params.id;
        
        // Load strategy from localStorage
        const storedStrategies = localStorage.getItem('draftStrategies') 
            ? JSON.parse(localStorage.getItem('draftStrategies')) 
            : {};
        
        if (storedStrategies[strategyId]) {
            strategy = storedStrategies[strategyId];
            
            // Initialize containers
            if (strategy.script && strategy.script.containers) {
                containers = strategy.script.containers;
            } else {
                // Create default container if none exists
                containers = [{
                    id: `container_${Date.now()}`,
                    name: 'Main Command Group',
                    conditions: [],
                    actions: [],
                    children: []
                }];
                
                // Update strategy with the new container
                strategy.script = { containers };
                saveStrategy();
            }
        } else {
            error = "Strategy not found";
        }
        
        // เพิ่ม global event listeners
        document.addEventListener('dragover', handleGlobalDragOver);
        document.addEventListener('drop', handleGlobalDrop);
        
        return () => {
            // Cleanup event listeners when component unmounts
            document.removeEventListener('dragover', handleGlobalDragOver);
            document.removeEventListener('drop', handleGlobalDrop);
        };
    });
    
    // Save strategy to localStorage
    function saveStrategy() {
        if (!strategy) return;
        
        strategy.script = { containers };
        strategy.lastUpdated = new Date().toISOString();
        
        const storedStrategies = localStorage.getItem('draftStrategies') 
            ? JSON.parse(localStorage.getItem('draftStrategies')) 
            : {};
        
        storedStrategies[strategyId] = strategy;
        localStorage.setItem('draftStrategies', JSON.stringify(storedStrategies));
    }
    
    // Add a new container
    function addContainer() {
        const newContainer = {
            id: `container_${Date.now()}`,
            name: 'Command Group',
            conditions: [],
            actions: [],
            children: []
        };
        
        containers = [...containers, newContainer];
        saveStrategy();
    }
    
    // Handle container update
    function handleContainerUpdate(event) {
        const { index, container } = event.detail;
        containers[index] = container;
        saveStrategy();
    }
    
    // Handle container removal
    function handleContainerRemove(event) {
        const { index } = event.detail;
        containers = containers.filter((_, i) => i !== index);
        saveStrategy();
    }
    
    // Generate preview code
    function generatePreviewCode() {
        // Convert nested containers to a flatter structure for the preview
        const flattenedScript = {
            name: strategy.name,
            conditions: [],
            actions: []
        };
        
        // Helper function to flatten containers
        function flattenContainer(container) {
            flattenedScript.conditions = [...flattenedScript.conditions, ...container.conditions];
            flattenedScript.actions = [...flattenedScript.actions, ...container.actions];
            
            if (container.children && container.children.length > 0) {
                container.children.forEach(child => flattenContainer(child));
            }
        }
        
        // Process all containers
        containers.forEach(container => {
            flattenContainer(container);
        });
        
        return flattenedScript;
    }
    
    // Handle closing code preview modal
    function closeCodePreview() {
        showCodePreview = false;
    }
    
    // Save and exit
    function saveAndExit() {
        saveStrategy();
        goto('/trading-bot');
    }
    
    // Cancel and go back
    function cancel() {
        goto('/trading-bot');
    }
    
    // Drag and drop functions
    
    // Start dragging an item
    function handleDragStart(item, type, index, parentIndex = -1) {
        isDragging = true;
        draggedItem = item;
        draggedItemType = type;
        draggedItemIndex = index;
        draggedItemParentIndex = parentIndex;
        draggedChildIndex = -1; // Reset for normal containers
    }
    
    // Handle dragging a child container
    function handleChildDragStart(event) {
        const { parentIndex, childIndex, container } = event.detail;
        
        isDragging = true;
        draggedItem = container;
        draggedItemType = 'container';
        draggedItemParentIndex = parentIndex; // Parent container index
        draggedChildIndex = childIndex; // Child container index
        draggedItemIndex = -1; // Not a top-level container
    }
    
    // Handle drag over event
    function handleDragOver(event, item, type, index, parentIndex = -1) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        
        if (!isDragging) return;
        
        // Don't allow dropping on itself
        if (draggedItemType === 'container' && draggedItemIndex === index && draggedItemParentIndex === parentIndex) {
            return;
        }
        
        // Calculate drop position
        const rect = event.currentTarget.getBoundingClientRect();
        const mouseY = event.clientY - rect.top;
        const positionRatio = mouseY / rect.height; // Use Y position for vertical positioning
        
        // Determine drop target type based on position
        if (draggedItemType === 'container' && type === 'container') {
            if (positionRatio < 0.33) {
                // Drop before the current container
                dropTargetType = 'before';
            } else if (positionRatio > 0.67) {
                // Drop after the current container
                dropTargetType = 'after';
            } else {
                // Drop as a child of the current container
                dropTargetType = 'inside';
            }
        } else if ((draggedItemType === 'condition' || draggedItemType === 'action') && type === 'container') {
            // Dropping a condition or action into a container
            dropTargetType = 'inside';
        }
        
        dropTarget = item;
        dropTargetIndex = index;
        dropTargetParentIndex = parentIndex;
    }
    
    // Handle drop event - improved to work with global drops
    function handleDrop(event) {
        event.preventDefault();
        
        if (!isDragging) {
            resetDragState();
            return;
        }
        
        // If we have a valid drop target and type, process the drop regardless of where it happens
        if (dropTarget && dropTargetType) {
            console.log('Processing drop:', dropTargetType, 'target index:', dropTargetIndex);
            
            // Handle container drops
            if (draggedItemType === 'container') {
                let containerToMove = null;
                
                // Skip if trying to drop on itself
                if (draggedItemParentIndex === dropTargetParentIndex && 
                    draggedItemIndex === dropTargetIndex && 
                    dropTargetType !== 'inside') {
                    resetDragState();
                    return;
                }
                
                // Remove container from its current position
                if (draggedItemParentIndex === -1) {
                    // Top-level container
                    containerToMove = {...containers[draggedItemIndex]};
                    containers = containers.filter((_, i) => i !== draggedItemIndex);
                } else if (draggedChildIndex !== -1) {
                    // Child container
                    containerToMove = {...containers[draggedItemParentIndex].children[draggedChildIndex]};
                    containers[draggedItemParentIndex].children = containers[draggedItemParentIndex].children.filter((_, i) => i !== draggedChildIndex);
                }
                
                if (!containerToMove) {
                    console.error('No container to move');
                    resetDragState();
                    return;
                }
                
                // Add container to its new position
                if (dropTargetType === 'before') {
                    if (dropTargetParentIndex === -1) {
                        // Insert before a top-level container
                        containers = [
                            ...containers.slice(0, dropTargetIndex),
                            containerToMove,
                            ...containers.slice(dropTargetIndex)
                        ];
                    } else {
                        // Insert before a nested container
                        const parentContainer = containers[dropTargetParentIndex];
                        parentContainer.children = [
                            ...parentContainer.children.slice(0, dropTargetIndex),
                            containerToMove,
                            ...parentContainer.children.slice(dropTargetIndex)
                        ];
                    }
                } else if (dropTargetType === 'after') {
                    if (dropTargetParentIndex === -1) {
                        // Insert after a top-level container
                        containers = [
                            ...containers.slice(0, dropTargetIndex + 1),
                            containerToMove,
                            ...containers.slice(dropTargetIndex + 1)
                        ];
                    } else {
                        // Insert after a nested container
                        const parentContainer = containers[dropTargetParentIndex];
                        parentContainer.children = [
                            ...parentContainer.children.slice(0, dropTargetIndex + 1),
                            containerToMove,
                            ...parentContainer.children.slice(dropTargetIndex + 1)
                        ];
                    }
                } else if (dropTargetType === 'inside') {
                    // Add as a child
                    if (!dropTarget.children) {
                        dropTarget.children = [];
                    }
                    dropTarget.children = [...dropTarget.children, containerToMove];
                }
                
                // Force update and save
                containers = [...containers];
                saveStrategy();
            }
        }
        
        // Clear all visual states and reset drag state
        document.querySelectorAll('.dragover').forEach(el => {
            el.classList.remove('dragover');
        });
        
        resetDragState();
    }
    
    // Reset drag state with comprehensive cleanup
    function resetDragState() {
        // Clear visual indicators
        document.querySelectorAll('.dragover, .current-drop-target').forEach(el => {
            el.classList.remove('dragover', 'current-drop-target');
        });
        
        // Reset all state variables
        isDragging = false;
        draggedItem = null;
        draggedItemType = null;
        draggedItemIndex = -1;
        draggedItemParentIndex = -1;
        draggedChildIndex = -1;
        dropTarget = null;
        dropTargetType = null;
        dropTargetIndex = -1;
        dropTargetParentIndex = -1;
    }
    
    // Handle drag end with improved cleanup
    function handleDragEnd() {
        // If there's a valid drop target when drag ends, process the drop
        if (isDragging && dropTarget && dropTargetType) {
            console.log('Processing drop on drag end:', dropTargetType, 'at index:', dropTargetIndex);
            // Create a synthetic event
            const event = new Event('drop', { bubbles: true });
            handleDrop(event);
        } else {
            // Just reset the state
            resetDragState();
        }
    }
    
    // Global drag handlers - improved to better handle drops outside editor
    function handleGlobalDragOver(event) {
        event.preventDefault();
        if (!isDragging) return;
        event.dataTransfer.dropEffect = 'move';
    }
    
    function handleGlobalDrop(event) {
        event.preventDefault();
        
        // For debugging - allow seeing if the global drop handler was called
        console.log('Global drop event triggered');
        
        if (!isDragging) {
            resetDragState();
            return;
        }
        
        // Process drop if we have valid drop target information
        if (dropTarget && dropTargetType) {
            console.log('Global drop with valid target:', dropTargetType, 'at index:', dropTargetIndex);
            handleDrop(event);
        } else {
            console.log('Global drop without valid target - resetting state');
            resetDragState();
        }
    }
    
    // Keep track of drop target position to allow drops outside the editor
    function updateDropTargetState(item, type, index, parentIndex = -1) {
        dropTarget = item;
        dropTargetType = type;
        dropTargetIndex = index;
        dropTargetParentIndex = parentIndex;
        
        // Add a visual indicator to show the current drop target
        document.querySelectorAll('.current-drop-target').forEach(el => {
            el.classList.remove('current-drop-target');
        });
        
        // Find the relevant container and add a class to highlight it
        const containerElement = document.querySelector(`[data-container-index="${index}"]`);
        if (containerElement) {
            containerElement.classList.add('current-drop-target');
        }
    }
</script>

<div class="editor-container relative" 
    on:dragover={handleGlobalDragOver}
    on:drop={handleGlobalDrop}
>
    <div class="container mx-auto p-4 max-w-6xl">
        <div class="mb-6 flex items-center justify-between">
            <div>
                <h1 class="text-2xl font-bold text-light-text dark:text-dark-text">Visual Strategy Editor</h1>
                {#if strategy}
                    <p class="text-light-text-muted dark:text-dark-text-muted">{strategy.name} - {strategy.symbol}</p>
                {/if}
            </div>
            <div class="flex space-x-2">
                <Button variant="secondary" size="sm" on:click={cancel}>
                    Cancel
                </Button>
                <Button variant="primary" size="sm" on:click={saveAndExit}>
                    Save & Exit
                </Button>
            </div>
        </div>
        
        {#if error}
            <div class="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-400">
                {error}
            </div>
        {/if}
        
        <!-- Usage hint -->
        <div class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-md text-blue-600 dark:text-blue-400">
            <div class="flex items-start gap-2">
                <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                    <p class="font-medium mb-1">Drag and drop tips:</p>
                    <ul class="list-disc list-inside text-sm space-y-1">
                        <li>Drag containers to reorder them</li>
                        <li>Drag child containers to move them out of their parent</li>
                        <li>Drop on the top/bottom of a container to position before/after</li>
                        <li>Drop in the middle of a container to nest it inside</li>
                    </ul>
                </div>
            </div>
        </div>
        
        {#if strategy}
            <div class="mb-4 flex items-center justify-between">
                <div>
                    <Button variant="secondary" size="sm" on:click={addContainer}>
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Command Group
                    </Button>
                </div>
                <div>
                    <Button variant="outline" size="sm" on:click={() => showCodePreview = true}>
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                        Preview Code
                    </Button>
                </div>
            </div>
            
            <div class="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-sm p-4">
                {#if containers.length === 0}
                    <div class="p-6 border border-dashed border-light-border dark:border-dark-border rounded-md text-center text-light-text-muted dark:text-dark-text-muted">
                        No command groups added. Click "Add Command Group" to create one.
                    </div>
                {:else}
                    <div class="relative">
                        <!-- Container for absolute positioned drop indicators -->
                        {#if isDragging}
                            <!-- First drop zone (before first container) -->
                            <div 
                                class="drop-indicator before-first-container {dropTargetIndex === 0 && dropTargetType === 'before' ? 'active' : ''}"
                                on:dragover={(e) => {
                                    e.preventDefault();
                                    if (isDragging && draggedItemType === 'container') {
                                        // Update global drop state
                                        updateDropTargetState(containers[0], 'before', 0, -1);
                                    }
                                }}
                                on:drop={handleDrop}
                            ></div>
                        {/if}
                        
                        {#each containers as container, i}
                            <div 
                                class="relative command-container-wrapper {i > 0 ? 'mt-4' : ''} {isDragging ? 'dragging-active' : ''}"
                                data-container-index={i}
                                on:dragover={(e) => {
                                    e.preventDefault();
                                    if (!isDragging) return;
                                    
                                    // Calculate drop position
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const mouseY = e.clientY - rect.top;
                                    const positionRatio = mouseY / rect.height;
                                    
                                    // Don't allow dropping on itself
                                    if (draggedItemType === 'container' && draggedItemIndex === i && draggedItemParentIndex === -1) {
                                        return;
                                    }
                                    
                                    let dropType = null;
                                    
                                    if (positionRatio < 0.33) {
                                        dropType = 'before';
                                    } else if (positionRatio > 0.67) {
                                        dropType = 'after';
                                    } else {
                                        dropType = 'inside';
                                    }
                                    
                                    // Update global drop state
                                    updateDropTargetState(container, dropType, i, -1);
                                }}
                                on:dragenter={(e) => {
                                    e.preventDefault();
                                    if (isDragging && draggedItemType === 'container') {
                                        e.currentTarget.classList.add('dragover');
                                    }
                                }}
                                on:dragleave={(e) => {
                                    e.preventDefault();
                                    if (isDragging) {
                                        e.currentTarget.classList.remove('dragover');
                                    }
                                }}
                                on:drop={handleDrop}
                            >
                                <!-- Drop indicator lines - Improved visibility -->
                                {#if isDragging && dropTarget === container && dropTargetIndex === i && dropTargetParentIndex === -1}
                                    {#if dropTargetType === 'before'}
                                        <div class="absolute top-0 left-0 right-0 h-2 -mt-1 bg-theme-500 z-10 drop-indicator-line"></div>
                                    {:else if dropTargetType === 'after'}
                                        <div class="absolute bottom-0 left-0 right-0 h-2 -mb-1 bg-theme-500 z-10 drop-indicator-line"></div>
                                    {:else if dropTargetType === 'inside'}
                                        <div class="absolute inset-0 border-2 border-theme-500 rounded-lg z-10 pointer-events-none opacity-70"></div>
                                    {/if}
                                {/if}
                                
                                <div 
                                    class="command-container-drag-handle"
                                    draggable="true"
                                    on:dragstart={(e) => {
                                        e.dataTransfer.effectAllowed = 'move';
                                        handleDragStart(container, 'container', i);
                                    }}
                                    on:dragend={(e) => {
                                        handleDragEnd();
                                        // Remove any lingering dragover classes
                                        document.querySelectorAll('.dragover').forEach(el => {
                                            el.classList.remove('dragover');
                                        });
                                    }}
                                >
                                    <CommandContainer 
                                        {container}
                                        index={i}
                                        nestingLevel={0}
                                        on:update={handleContainerUpdate}
                                        on:remove={handleContainerRemove}
                                        on:childDragStart={handleChildDragStart}
                                        on:dragend={handleDragEnd}
                                    />
                                </div>
                                
                                <!-- Drop zone after this container (only shown when dragging) -->
                                {#if isDragging}
                                    <div 
                                        class="drop-indicator after-container {dropTarget === container && dropTargetIndex === i && dropTargetType === 'after' ? 'active' : ''}"
                                        on:dragover={(e) => {
                                            e.preventDefault();
                                            if (isDragging && draggedItemType === 'container') {
                                                dropTargetType = 'after';
                                                dropTargetIndex = i;
                                                dropTargetParentIndex = -1;
                                                dropTarget = container;
                                            }
                                        }}
                                        on:drop={handleDrop}
                                    ></div>
                                {/if}
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
            
            <!-- Code Preview Modal -->
            <Modal 
                bind:show={showCodePreview} 
                width="2xl"
                title="Generated Code Preview" 
                on:close={closeCodePreview}
            >
                <div class="p-4">
                    <VisualScriptPreview script={generatePreviewCode()} />
                </div>
                
                <div slot="footer" class="flex justify-end p-4 border-t border-light-border dark:border-dark-border">
                    <Button variant="primary" on:click={closeCodePreview}>Close</Button>
                </div>
            </Modal>
        {/if}
    </div>
</div>

<style>
    .command-container-wrapper {
        position: relative;
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    
    .command-container-wrapper:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .command-container-drag-handle {
        cursor: grab;
    }
    
    .command-container-drag-handle:active {
        cursor: grabbing;
    }
    
    .child-container-wrapper {
        position: relative;
        cursor: grab;
    }
    
    .child-container-wrapper:active {
        cursor: grabbing;
    }
    
    .drop-indicator-line {
        pointer-events: none;
        animation: pulse 1.5s infinite;
    }
    
    .drop-zone {
        border: 2px dashed rgba(125, 125, 125, 0.4);
        border-radius: 0.5rem;
        padding: 1rem;
        margin: 0.5rem 0;
        text-align: center;
        color: rgba(125, 125, 125, 0.7);
        transition: all 0.2s ease;
    }
    
    .drop-zone.active {
        border-color: var(--theme-color);
        background-color: rgba(var(--theme-color-rgb), 0.1);
    }
    
    @keyframes pulse {
        0% { opacity: 0.6; }
        50% { opacity: 1; }
        100% { opacity: 0.6; }
    }
    
    /* Drop indicators */
    .drop-indicator {
        position: absolute;
        left: 0;
        right: 0;
        height: 8px;
        background-color: rgba(var(--theme-color-rgb), 0.1);
        z-index: 20;
        pointer-events: auto;
        transition: all 0.15s ease;
        /* Add a subtle glow to help visibility */
        box-shadow: 0 0 10px rgba(var(--theme-color-rgb), 0.1);
    }
    
    .drop-indicator.active {
        background-color: rgba(var(--theme-color-rgb), 0.6);
        height: 12px;
        box-shadow: 0 0 10px rgba(var(--theme-color-rgb), 0.5);
    }
    
    .before-first-container {
        top: -5px;
    }
    
    .after-container {
        bottom: -5px;
    }
    
    /* Update other drop indicators to avoid extra space */
    .container-drop-before, 
    .container-drop-after {
        margin: 0;
        height: 0;
        position: absolute;
        left: 0;
        right: 0;
        z-index: 10;
        pointer-events: none;
    }
    
    .container-drop-before {
        top: 0;
    }
    
    .container-drop-after {
        bottom: 0;
    }
    
    .container-drop-inside {
        background-color: transparent;
        position: absolute;
        inset: 0;
        margin: 0;
        padding: 0;
        z-index: 5;
        pointer-events: none;
    }
    
    .command-container-wrapper.dragover {
        box-shadow: 0 0 0 2px var(--theme-color);
        z-index: 5;
    }
    
    .command-container-wrapper.dragging-active {
        position: relative;
        z-index: 1;
    }
    
    .command-container-wrapper.dragging-active::before {
        content: '';
        position: absolute;
        inset: -4px; /* เพิ่มพื้นที่รับ drop events */
        z-index: -1;
        pointer-events: none;
    }
    
    .drop-indicator-line {
        pointer-events: none;
        animation: pulse 1.5s infinite;
        height: 3px !important;
        margin: 0 !important;
    }
    
    /* Style for the editor container to catch events */
    .editor-container {
        min-height: 300px;
        width: 100%;
    }
    
    /* Current drop target highlight */
    .command-container-wrapper.current-drop-target {
        box-shadow: 0 0 0 2px var(--theme-color);
        outline: 2px dashed var(--theme-color);
        outline-offset: 2px;
        z-index: 5;
    }
</style> 