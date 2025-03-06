<script>
    import { onMount, onDestroy, afterUpdate } from 'svelte';
    import { createEventDispatcher } from 'svelte';
    
    const dispatch = createEventDispatcher();
    
    // Props
    export let containers = [];
    export let visibleContainers = new Set();
    export let activeContainerId = null;
    
    // State
    let miniMapVisible = true;
    let minimized = false;
    let miniMapContainer; // Reference to the container div for auto-scrolling
    
    // เพิ่มฟังก์ชันที่ format container type ให้สั้นลง
    function formatContainerType(type) {
        if (!type) return 'IF';
        switch(type) {
            case 'ELSE_IF': return 'ELIF';
            default: return type;
        }
    }
    
    // Process containers to build a hierarchical structure
    $: processedContainers = processContainerHierarchy(containers);
    
    // ติดตามการเปลี่ยนแปลงของ activeContainerId เพื่อ scroll ไปยัง active item
    $: if (activeContainerId && miniMapContainer) {
        setTimeout(() => {
            const activeElement = miniMapContainer.querySelector(`[data-container-id="${activeContainerId}"]`);
            if (activeElement) {
                activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 100); // Delay เล็กน้อยเพื่อให้แน่ใจว่า UI ได้ render แล้ว
    }
    
    function processContainerHierarchy(allContainers) {
        // First find all root containers (level 0)
        const roots = allContainers.filter(c => c.level === 0);
        
        // Then build the hierarchy by attaching children to their parents
        return roots.map(root => {
            const rootWithChildren = {
                ...root,
                children: buildChildrenTree(root, allContainers)
            };
            return rootWithChildren;
        });
    }
    
    function buildChildrenTree(parent, allContainers) {
        // Find direct children of this parent
        const directChildren = allContainers.filter(c => c.parentId === parent.id);
        
        // Recursively build the tree
        return directChildren.map(child => {
            return {
                ...child,
                children: buildChildrenTree(child, allContainers)
            };
        });
    }
    
    // Helper to check if a container is a child of another
    function isChildInContainer(child, parent) {
        // Simple check if child's parentId matches parent's id
        return child.parentId === parent.id;
    }
    
    function scrollToContainer(id) {
        const containerElement = document.querySelector(`[data-container-id="${id}"]`);
        if (containerElement) {
            containerElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
    function toggleMinimize() {
        minimized = !minimized;
    }
    
    function toggleVisibility() {
        miniMapVisible = !miniMapVisible;
    }
    
    // Function to get container type badge class
    function getContainerTypeClass(containerType) {
        switch(containerType) {
            case 'IF': return 'bg-blue-500 text-white';
            case 'ELSE_IF': return 'bg-purple-500 text-white';
            case 'ELSE': return 'bg-green-500 text-white';
            default: return 'bg-gray-500 text-white';
        }
    }
    
    // Function to handle click on a mini map item
    function handleContainerClick(containerId) {
        dispatch('selectcontainer', { containerId });
    }
    
    // Recursive function to render container and its children
    function renderContainer(container, level = 0) {
        const levelIndent = level * 0.5; // Reduced indentation for mini map
        const isActive = container.id === activeContainerId;
        
        return `
            <div class="mini-map-item">
                <div 
                    class="flex items-center mb-1 cursor-pointer hover:opacity-80"
                    style="margin-left: ${levelIndent}rem;"
                    on:click={() => handleContainerClick(container.id)}
                >
                    <div class="mini-map-indicator ${getContainerTypeClass(container.containerType)} 
                              ${isActive ? 'ring-2 ring-white' : ''} 
                              ${container.disabled ? 'opacity-50' : ''}">
                    </div>
                    <div class="mini-map-label">
                        ${container.containerType}
                    </div>
                </div>
                ${container.children && container.children.length > 0 
                    ? container.children.map(child => renderContainer(child, level + 1)).join('')
                    : ''}
            </div>
        `;
    }
    
    // Function to get indentation based on level
    function getIndentation(level) {
        return level * 1.25; // 1.25rem per level of depth
    }
    
    // ติดตามการเปลี่ยนแปลงของ containers และอัพเดท UI
    $: if (containers) {
        // Force rerender when containers change
        setTimeout(() => {
            if (miniMapContainer) {
                // You could add any custom logic here
                console.log("MiniMap containers updated:", containers.length);
            }
        }, 0);
    }
    
    // Check if a container is visible on screen and make it flash
    function highlightVisibleContainer(id) {
        const element = miniMapContainer?.querySelector(`[data-container-id="${id}"]`);
        if (element) {
            element.classList.add('highlight-pulse');
            setTimeout(() => {
                element.classList.remove('highlight-pulse');
            }, 2000);
        }
    }
    
    // Track when visibleContainers change
    $: if (visibleContainers && miniMapContainer) {
        // Highlight newly visible containers
        visibleContainers.forEach(id => {
            highlightVisibleContainer(id);
        });
    }
</script>

<div class="fixed bottom-4 right-4 z-50 command-mini-map {miniMapVisible ? '' : 'hidden'} 
    {minimized ? 'w-12 h-12 rounded-full' : 'w-64 max-h-[50vh]'} 
    bg-white dark:bg-gray-800 shadow-lg border border-light-border dark:border-dark-border 
    transition-all duration-200 overflow-hidden">
    
    {#if minimized}
        <!-- Minimized state - just an icon -->
        <button class="w-full h-full flex items-center justify-center text-light-text dark:text-dark-text"
                on:click={toggleMinimize}>
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
        </button>
    {:else}
        <!-- Expanded mini-map -->
        <div class="flex justify-between items-center p-2 border-b border-light-border dark:border-dark-border bg-light-hover dark:bg-dark-hover">
            <h4 class="text-sm font-medium text-light-text dark:text-dark-text">Command Navigator</h4>
            <div>
                <button class="p-1 text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 dark:hover:text-theme-400"
                        on:click={toggleMinimize}
                        title="Minimize">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>
        </div>
        
        <div bind:this={miniMapContainer} class="overflow-y-auto max-h-[calc(50vh-40px)] p-2">
            {#if containers.length === 0}
                <div class="text-center p-4 text-light-text-muted dark:text-dark-text-muted">
                    No command containers found
                </div>
            {:else}
                <div class="space-y-1">
                    <!-- Root containers -->
                    {#each containers.filter(c => !c.parentId) as container}
                        <div class="mini-map-item">
                            <!-- Container button with level-based indentation -->
                            <button class="flex items-center w-full text-left px-2 py-1.5 rounded-md 
                                {visibleContainers.has(container.id) ? 'bg-theme-100 dark:bg-theme-900/30 text-theme-800 dark:text-theme-300' : 'hover:bg-light-hover dark:hover:bg-dark-hover text-light-text dark:text-dark-text'}
                                {container.id === activeContainerId ? 'ring-1 ring-theme-500' : ''}"
                                on:click={() => scrollToContainer(container.id)}
                                data-container-id={container.id}>
                                
                                <!-- Container type badge -->
                                <span class="mr-2 px-1.5 py-0.5 rounded text-xs font-bold {getContainerTypeClass(container.type || container.containerType)}">
                                    {formatContainerType(container.type || container.containerType)}
                                </span>
                                
                                <!-- Container name -->
                                <span class="truncate text-xs font-medium flex-1">
                                    {container.name || 'Command Group'}
                                </span>
                            </button>
                            
                            <!-- Child containers -->
                            <div class="ml-3 pl-3 border-l border-gray-200 dark:border-gray-700 mt-1 space-y-0.5">
                                {#each containers.filter(c => c.parentId === container.id) as child}
                                    <div class="child-item">
                                        <button class="flex items-center w-full text-left px-2 py-1 rounded-md 
                                            {visibleContainers.has(child.id) ? 'bg-theme-100 dark:bg-theme-900/30 text-theme-800 dark:text-theme-300' : 'hover:bg-light-hover dark:hover:bg-dark-hover text-light-text dark:text-dark-text'}
                                            {child.id === activeContainerId ? 'ring-1 ring-theme-500' : ''}"
                                            on:click={() => scrollToContainer(child.id)}
                                            data-container-id={child.id}>
                                            
                                            <!-- Container type badge for child -->
                                            <span class="mr-2 px-1.5 py-0.5 rounded text-xs font-bold {getContainerTypeClass(child.type || child.containerType)}">
                                                {formatContainerType(child.type || child.containerType)}
                                            </span>
                                            
                                            <span class="truncate text-xs">
                                                {child.name || 'Command Group'}
                                            </span>
                                        </button>
                                        
                                        <!-- Grandchildren (recursive) -->
                                        {#if containers.some(c => c.parentId === child.id)}
                                            <div class="ml-3 pl-3 border-l border-gray-200 dark:border-gray-700 mt-1 space-y-0.5">
                                                {#each containers.filter(c => c.parentId === child.id) as grandchild}
                                                    <!-- Similar structure for grandchildren with type badge -->
                                                    <button class="flex items-center w-full text-left px-2 py-1 rounded-md 
                                                        {visibleContainers.has(grandchild.id) ? 'bg-theme-100 dark:bg-theme-900/30 text-theme-800 dark:text-theme-300' : 'hover:bg-light-hover dark:hover:bg-dark-hover text-light-text dark:text-dark-text'}
                                                        {grandchild.id === activeContainerId ? 'ring-1 ring-theme-500' : ''}"
                                                        on:click={() => scrollToContainer(grandchild.id)}
                                                        data-container-id={grandchild.id}>
                                                        
                                                        <!-- Type badge for grandchild -->
                                                        <span class="mr-2 px-1.5 py-0.5 rounded text-xs font-bold {getContainerTypeClass(grandchild.type || grandchild.containerType)}">
                                                            {formatContainerType(grandchild.type || grandchild.containerType)}
                                                        </span>
                                                        
                                                        <span class="truncate text-xs">
                                                            {grandchild.name || 'Command Group'}
                                                        </span>
                                                    </button>
                                                {/each}
                                            </div>
                                        {/if}
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    .command-mini-map {
        border-radius: 8px;
        transition: all 0.2s ease-in-out;
    }
    
    /* For smooth animations */
    .command-mini-map.hidden {
        opacity: 0;
        transform: translateY(20px);
        pointer-events: none;
    }
    
    .mini-map-item {
        transition: background-color 0.15s ease;
    }
    
    /* Container connection styles */
    .children-container::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 2px;
    }
    
    .child-container-item {
        position: relative;
    }
    
    .command-mini-map {
        font-family: monospace;
        min-width: 180px;
    }
    
    .mini-map-indicator {
        height: 8px;
        width: 8px;
        border-radius: 2px;
        margin-right: 6px;
    }
    
    .mini-map-label {
        font-size: 10px;
        color: #e5e7eb;
    }
    
    /* Add a highlight animation for new or updated containers */
    @keyframes pulse-highlight {
        0% { background-color: rgba(var(--color-theme-500-rgb), 0.1); }
        50% { background-color: rgba(var(--color-theme-500-rgb), 0.3); }
        100% { background-color: rgba(var(--color-theme-500-rgb), 0.1); }
    }
    
    .highlight-pulse {
        animation: pulse-highlight 1.5s ease-in-out;
    }
</style> 