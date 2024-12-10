<!-- src/lib/components/trades/TradeOptionSelect.svelte -->
<script>
    import { onMount } from 'svelte';
    import { createEventDispatcher } from 'svelte';
    import { clickOutside } from '$lib/utils/clickOutside';
    import { fade } from 'svelte/transition';
    import { accountSymbolStore } from '$lib/stores/accountSymbolStore';
    import { userStrategyStore } from '$lib/stores/userStrategyStore';
    import Button from '../common/Button.svelte';

    const dispatch = createEventDispatcher();

    export let type = 'SYMBOL'; // SYMBOL or STRATEGY
    export let value = '';
    export let placeholder = 'Select an option';
    export let required = false;
    export let accountId = null;

    let isOpen = false;
    let searchTerm = '';
    let editingOption = null;
    let options = [];
    let loading = false;
    let error = '';

    $: {
        if (type === 'SYMBOL') {
            options = accountId ? $accountSymbolStore.symbols.map(symbol => ({ value: symbol })) : [];
            loading = $accountSymbolStore.loading;
            error = $accountSymbolStore.error;
        } else {
            options = $userStrategyStore.strategies.map(strategy => ({ value: strategy }));
            loading = $userStrategyStore.loading;
            error = $userStrategyStore.error;
        }
    }

    $: filteredOptions = options
        .filter(opt => opt.value.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));

    $: if (value && !options.some(opt => opt.value === value)) {
        searchTerm = value;
    }

    onMount(() => {
        if (type === 'SYMBOL' && accountId) {
            accountSymbolStore.loadSymbols(accountId);
        } else if (type === 'STRATEGY') {
            userStrategyStore.loadStrategies();
        }
        // Initialize searchTerm with current value
        searchTerm = value;
    });

    async function handleSelect(option) {
        value = option.value;
        searchTerm = option.value;
        isOpen = false;
        dispatch('change', { value: option.value });
    }

    async function handleCreate() {
        if (!searchTerm.trim()) return;
        try {
            if (type === 'SYMBOL' && accountId) {
                await accountSymbolStore.addSymbol(accountId, searchTerm.trim());
                value = searchTerm.trim();
                searchTerm = value;
                isOpen = false;
                dispatch('change', { value });
            } else if (type === 'STRATEGY') {
                await userStrategyStore.addStrategy(searchTerm.trim());
                value = searchTerm.trim();
                searchTerm = value;
                isOpen = false;
                dispatch('change', { value });
            }
        } catch (err) {
            console.error('Failed to create option:', err);
        }
    }

    async function handleUpdate(option) {
        if (!searchTerm.trim() || searchTerm === option.value) {
            editingOption = null;
            return;
        }
        try {
            if (type === 'SYMBOL' && accountId) {
                await accountSymbolStore.removeSymbol(accountId, option.value);
                await accountSymbolStore.addSymbol(accountId, searchTerm.trim());
                if (value === option.value) {
                    value = searchTerm.trim();
                }
            } else if (type === 'STRATEGY') {
                const strategies = $userStrategyStore.strategies.filter(s => s !== option.value);
                strategies.push(searchTerm.trim());
                await userStrategyStore.updateStrategies(strategies);
                if (value === option.value) {
                    value = searchTerm.trim();
                }
            }
            searchTerm = value;
            editingOption = null;
        } catch (err) {
            console.error('Failed to update option:', err);
        }
    }

    async function handleDelete(option, event) {
        event.stopPropagation();
        if (!confirm(`Are you sure you want to delete this ${type.toLowerCase()}?`)) return;
        try {
            if (type === 'SYMBOL' && accountId) {
                // Don't allow deleting if it's the last symbol
                if (options.length <= 1) return;
                await accountSymbolStore.removeSymbol(accountId, option.value);
            } else if (type === 'STRATEGY') {
                await userStrategyStore.removeStrategy(option.value);
            }
            if (value === option.value) {
                value = '';
                searchTerm = '';
            }
        } catch (err) {
            console.error('Failed to delete option:', err);
        }
    }

    function startEditing(option, event) {
        event.stopPropagation();
        editingOption = option;
        searchTerm = option.value;
    }

    function handleInput() {
        if (!isOpen) isOpen = true;
        if (!editingOption) {
            // Only update value and dispatch change when not in editing mode
            // This prevents interference with typing
            if (searchTerm.trim() === '') {
                value = '';
                dispatch('change', { value: '' });
            }
        }
    }

    function handleClickOutside() {
        isOpen = false;
        editingOption = null;
        // Reset searchTerm to current value if no match found
        if (!options.some(opt => opt.value.toLowerCase() === searchTerm.toLowerCase())) {
            searchTerm = value;
        }
    }

    function handleKeydown(event) {
        if (event.key === 'Enter') {
            if (editingOption) {
                handleUpdate(editingOption);
            } else if (searchTerm && !filteredOptions.some(opt => opt.value.toLowerCase() === searchTerm.toLowerCase())) {
                handleCreate();
            } else if (filteredOptions.length === 1) {
                handleSelect(filteredOptions[0]);
            }
        } else if (event.key === 'Escape') {
            isOpen = false;
            editingOption = null;
            searchTerm = value;
        } else if (event.key === 'ArrowDown' && filteredOptions.length > 0) {
            event.preventDefault();
            const firstOption = filteredOptions[0];
            handleSelect(firstOption);
        }
    }
</script>

<div class="relative" use:clickOutside on:clickoutside={handleClickOutside}>
    <!-- Input Field -->
    <div class="relative">
        <input
            type="text"
            {required}
            bind:value={searchTerm}
            on:input={handleInput}
            on:focus={() => isOpen = true}
            on:keydown={handleKeydown}
            {placeholder}
            class="input w-full pr-10 bg-light-bg dark:bg-dark-bg"
        />
        <div class="absolute inset-y-0 right-0 flex items-center pr-3">
            <button
                type="button"
                class="text-light-text-muted dark:text-dark-text-muted hover:text-light-text-muted dark:hover:text-dark-text transition-colors duration-200"
                on:click={() => isOpen = !isOpen}
            >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
            </button>
        </div>
    </div>

    <!-- Dropdown -->
    {#if isOpen}
        <div 
            class="absolute z-50 w-full mt-1 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg shadow-lg divide-y divide-light-border dark:divide-dark-border max-h-[300px] overflow-auto"
            transition:fade={{ duration: 100 }}
        >
            {#if loading}
                <div class="p-4 text-center text-light-text-muted dark:text-dark-text-muted">
                    Loading...
                </div>
            {:else if error}
                <div class="p-4 text-center text-red-500">
                    {error}
                </div>
            {:else}
                <!-- Options List -->
                {#if filteredOptions.length > 0}
                    <div class="max-h-[200px] overflow-y-auto">
                        {#each filteredOptions as option}
                            <div class="group relative hover:bg-light-hover dark:hover:bg-dark-hover transition-colors duration-200">
                                {#if editingOption?.value === option.value}
                                    <div class="flex items-center p-2">
                                        <input
                                            type="text"
                                            bind:value={searchTerm}
                                            on:keydown={handleKeydown}
                                            class="input flex-1 mr-2 bg-light-bg dark:bg-dark-bg"
                                        />
                                        <div class="flex space-x-1">
                                            <Button 
                                                variant="primary"
                                                size="sm"
                                                on:click={() => handleUpdate(option)}
                                            >
                                                Save
                                            </Button>
                                            <Button 
                                                variant="secondary"
                                                size="sm"
                                                on:click={() => {
                                                    editingOption = null;
                                                    searchTerm = value;
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                {:else}
                                    <div class="flex items-center justify-between px-4 py-2">
                                        <div 
                                            class="flex-1 text-light-text-muted dark:text-dark-text cursor-pointer"
                                            on:click={() => handleSelect(option)}
                                        >
                                            {option.value}
                                        </div>
                                        <div class="hidden group-hover:flex items-center space-x-1">
                                            <button
                                                type="button"
                                                class="p-1 text-light-text-muted dark:text-dark-text-muted hover:text-light-text-muted dark:hover:text-dark-text"
                                                on:click={(e) => startEditing(option, e)}
                                            >
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                                </svg>
                                            </button>
                                            <button
                                                type="button"
                                                class="p-1 text-light-text-muted dark:text-dark-text-muted hover:text-red-500"
                                                on:click={(e) => handleDelete(option, e)}
                                            >
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <div class="p-4 text-center text-light-text-muted dark:text-dark-text-muted">
                        No options found
                    </div>
                {/if}

                <!-- Add New Option Button -->
                <div class="p-4 bg-light-card dark:bg-dark-card border-t border-light-border dark:border-dark-border">
                    {#if searchTerm.trim() && !filteredOptions.some(opt => opt.value.toLowerCase() === searchTerm.trim().toLowerCase())}
                        <Button 
                            variant="primary"
                            class="w-full"
                            on:click={handleCreate}
                        >
                            <div class="flex items-center justify-center">
                                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                </svg>
                                Add "{searchTerm.trim()}"
                            </div>
                        </Button>
                    {:else}
                        <div class="text-sm text-light-text-muted dark:text-dark-text-muted text-center">
                            Type to add new {type.toLowerCase()}
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
    {/if}
</div>

<style lang="postcss">
    /* Ensure input background color matches theme */
    :global(.input) {
        background-color: var(--bg-color) !important;
        color: var(--text-color) !important;
        border-color: var(--border-color) !important;
    }

    /* Dropdown styling */
    .absolute {
        background-color: var(--bg-color);
        border-color: var(--border-color);
    }

    button:hover {
        background-color: var(--hover-color);
    }
</style>
