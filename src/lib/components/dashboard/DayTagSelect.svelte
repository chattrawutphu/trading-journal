<script>
    import { createEventDispatcher, onMount } from 'svelte';
    import { clickOutside } from '$lib/utils/clickOutside';
    import { fade } from 'svelte/transition';
    import Button from '../common/Button.svelte';
    import { dayTagStore } from '$lib/stores/dayTagStore';

    const dispatch = createEventDispatcher();

    export let value = '';
    export let placeholder = 'Select a tag';
    export let required = false;
    export let disabled = false;
    export let loading = false;
    export let error = '';

    let isOpen = false;
    let searchTerm = '';
    let editingTag = null;
    let editValue = '';

    $: filteredTags = !editingTag ? $dayTagStore.tags
        .filter(tag => tag.value.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
        : $dayTagStore.tags;

    $: if (value && !$dayTagStore.tags.some(tag => tag.value === value) && !editingTag) {
        searchTerm = value;
    }

    function handleInput() {
        if (disabled) return;
        if (!isOpen) isOpen = true;
        if (!editingTag) {
            if (searchTerm.trim() === '') {
                value = '';
                dispatch('change', { value: '' });
            }
        }
    }

    function handleSelect(tag) {
        if (disabled) return;
        if (!tag || !tag.value) return;
        
        value = tag.value;
        searchTerm = tag.value;
        isOpen = false;
        dispatch('change', { value: tag.value });
    }

    async function handleCreate() {
        if (disabled) return;
        const trimmedValue = searchTerm.trim();
        if (!trimmedValue) return;
        
        try {
            const newTag = await dayTagStore.addTag(trimmedValue);
            if (newTag && newTag.value) {
                value = newTag.value;
                searchTerm = value;
                isOpen = false;
                dispatch('change', { value: newTag.value });
            }
        } catch (err) {
            console.error('Failed to create tag:', err);
        }
    }

    async function handleUpdate(tag) {
        if (!tag || !tag.value || !editValue.trim()) {
            editingTag = null;
            editValue = '';
            return;
        }
        
        if (editValue.trim() === tag.value) {
            editingTag = null;
            editValue = '';
            return;
        }

        try {
            await dayTagStore.deleteTag(tag._id);
            const newTag = await dayTagStore.addTag(editValue.trim());
            if (value === tag.value) {
                value = newTag.value;
            }
            searchTerm = value;
            editingTag = null;
            editValue = '';
            dispatch('change', { value: newTag.value });
        } catch (err) {
            console.error('Failed to update tag:', err);
        }
    }

    async function handleDelete(tag, event) {
        event.stopPropagation();
        if (!confirm('Are you sure you want to delete this tag?')) return;
        try {
            await dayTagStore.deleteTag(tag._id);
            if (value === tag.value) {
                value = '';
                searchTerm = '';
                dispatch('change', { value: '' });
            }
        } catch (err) {
            console.error('Failed to delete tag:', err);
        }
    }

    function startEditing(tag, event) {
        event.stopPropagation();
        editingTag = tag;
        editValue = tag.value;
        if (!isOpen) isOpen = true;
    }

    function handleClickOutside() {
        isOpen = false;
        if (editingTag) {
            searchTerm = editingTag.value;
            editingTag = null;
            editValue = '';
        } else if (!$dayTagStore.tags.some(tag => tag.value.toLowerCase() === searchTerm.toLowerCase())) {
            searchTerm = value;
        }
    }

    function handleKeydown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            if (editingTag) {
                handleUpdate(editingTag);
            } else if (searchTerm && !filteredTags.some(tag => tag.value.toLowerCase() === searchTerm.toLowerCase())) {
                handleCreate();
            } else if (filteredTags.length === 1) {
                handleSelect(filteredTags[0]);
            }
        } else if (event.key === 'Escape') {
            event.preventDefault();
            if (editingTag) {
                searchTerm = editingTag.value;
                editingTag = null;
                editValue = '';
            } else {
                isOpen = false;
                searchTerm = value;
            }
        }
    }
</script>

<div class="relative {disabled ? 'opacity-50' : ''}" use:clickOutside on:clickoutside={handleClickOutside}>
    <!-- Input Field -->
    <div class="relative">
        <input
            type="text"
            {required}
            bind:value={searchTerm}
            on:input={handleInput}
            on:focus={() => !disabled && (isOpen = true)}
            on:keydown={handleKeydown}
            {placeholder}
            {disabled}
            class="input w-full pr-8 px-2.5 py-1.5 h-8 text-sm bg-light-bg dark:bg-dark-bg border border-light-border dark:border-0 rounded-md
                {disabled ? 'cursor-not-allowed' : ''}"
        />
        <div class="absolute inset-y-0 right-0 flex items-center pr-2">
            <button
                type="button"
                class="text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text"
                on:click={() => !disabled && (isOpen = !isOpen)}
                {disabled}
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
            </button>
        </div>
    </div>

    <!-- Dropdown -->
    {#if isOpen && !disabled}
        <div class="absolute z-50 w-full mt-1 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-0 rounded-md shadow-lg divide-y divide-light-border dark:divide-dark-border max-h-[240px] overflow-auto"
            transition:fade={{ duration: 100 }}
        >
            {#if loading}
                <div class="p-2 text-center text-sm text-light-text-muted dark:text-dark-text-muted">
                    Loading...
                </div>
            {:else if error}
                <div class="p-2 text-center text-sm text-red-500">
                    {error}
                </div>
            {/if}

            <!-- Options List -->
            {#if filteredTags.length > 0}
                <div class="max-h-[160px] overflow-y-auto">
                    {#each filteredTags as tag}
                        <div class="group relative hover:bg-light-hover dark:hover:bg-dark-hover">
                            {#if editingTag?.value === tag.value}
                                <div class="flex items-center p-1.5">
                                    <input
                                        type="text"
                                        bind:value={editValue}
                                        on:keydown={handleKeydown}
                                        class="input flex-1 mr-1.5 px-2.5 py-1.5 h-8 text-sm bg-light-bg dark:bg-dark-bg rounded-md"
                                        autofocus
                                    />
                                    <div class="flex space-x-1">
                                        <Button 
                                            variant="primary"
                                            size="sm"
                                            on:click={() => handleUpdate(tag)}
                                        >
                                            Save
                                        </Button>
                                        <Button 
                                            variant="secondary"
                                            size="sm"
                                            on:click={() => {
                                                editingTag = null;
                                                editValue = '';
                                                searchTerm = value;
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            {:else}
                                <div class="flex items-center justify-between px-2 py-1.5">
                                    <div 
                                        class="flex-1 text-sm text-light-text-muted dark:text-dark-text cursor-pointer flex items-center justify-between"
                                        on:click={() => handleSelect(tag)}
                                    >
                                        <span>{tag.value}</span>
                                        {#if tag.usageCount > 0}
                                            <span class="text-xs text-light-text-muted dark:text-dark-text-muted px-2 py-0.5 rounded-full bg-light-hover/50 dark:bg-dark-hover/50">
                                                {tag.usageCount} {tag.usageCount === 1 ? 'day' : 'days'}
                                            </span>
                                        {/if}
                                    </div>
                                    <div class="hidden group-hover:flex items-center space-x-1">
                                        <button
                                            type="button"
                                            class="p-1 text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text"
                                            on:click={(e) => startEditing(tag, e)}
                                        >
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                            </svg>
                                        </button>
                                        <button
                                            type="button"
                                            class="p-1 text-light-text-muted dark:text-dark-text-muted hover:text-red-500"
                                            on:click={(e) => handleDelete(tag, e)}
                                        >
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            {:else}
                <div class="p-2 text-center text-sm text-light-text-muted dark:text-dark-text-muted">
                    No tags found
                </div>
            {/if}

            <!-- Add New Tag Button -->
            <div class="p-2 bg-light-card dark:bg-dark-card border-t border-light-border dark:border-0">
                {#if searchTerm.trim() && !editingTag && !filteredTags.some(tag => tag.value.toLowerCase() === searchTerm.trim().toLowerCase())}
                    <Button 
                        variant="primary"
                        class="w-full"
                        on:click={handleCreate}
                    >
                        <div class="flex items-center justify-center">
                            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                            </svg>
                            Add "{searchTerm.trim()}"
                        </div>
                    </Button>
                {:else}
                    <div class="text-sm text-light-text-muted dark:text-dark-text-muted text-center">
                        Type to add new tag
                    </div>
                {/if}
            </div>
        </div>
    {/if}
</div>

<style lang="postcss">
    :global(.input) {
        background-color: var(--bg-color) !important;
        color: var(--text-color) !important;
        border-color: var(--border-color) !important;
    }

    .absolute {
        background-color: var(--bg-color);
        border-color: var(--border-color);
    }

    button:hover {
        background-color: var(--hover-color);
    }

    :global(.input[disabled]) {
        cursor: not-allowed;
    }
</style> 