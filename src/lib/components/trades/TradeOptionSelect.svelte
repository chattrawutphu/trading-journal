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

    export let type = 'SYMBOL'; // SYMBOL or STRATEGY or TAG
    export let value = '';
    export let placeholder = 'Select an option';
    export let required = false;
    export let accountId = null;
    export let options = [];
    export let loading = false;
    export let error = '';
    export let disabled = false;

    let isOpen = false;
    let searchTerm = '';
    let editingOption = null;
    let editValue = ''; // New state for edit mode

    $: {
        if (type === 'SYMBOL') {
            options = accountId ? $accountSymbolStore.symbols.map(symbol => ({ value: symbol })) : [];
            loading = $accountSymbolStore.loading;
            error = $accountSymbolStore.error;
        } else if (type === 'STRATEGY') {
            options = $userStrategyStore.strategies.map(strategy => ({ value: strategy }));
            loading = $userStrategyStore.loading;
            error = $userStrategyStore.error;
        } else if (type === 'TAG') {
            // ใช้ options ที่ส่งมาจาก props
        }
    }

    $: filteredOptions = !editingOption ? options
        .filter(opt => opt.value.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
        : options;

    $: if (value && !options.some(opt => opt.value === value) && !editingOption) {
        searchTerm = value;
    }

    onMount(() => {
        if (type === 'SYMBOL' && accountId) {
            accountSymbolStore.loadSymbols(accountId);
        } else if (type === 'STRATEGY') {
            userStrategyStore.loadStrategies();
        }
        searchTerm = value;
    });

    function validateInputLength(value, type) {
        if (!value) return '';
        
        const maxLength = type === 'SYMBOL' ? 16 : 50;
        return value.slice(0, maxLength);
    }

    function handleInput() {
        if (disabled) return;
        if (!isOpen) isOpen = true;
        
        searchTerm = validateInputLength(searchTerm, type);
        
        if (!editingOption) {
            if (searchTerm.trim() === '') {
                value = '';
                if (type !== 'TAG') {
                    dispatch('change', { value: '' });
                }
            }
        }
    }

    function handleSelect(option) {
        if (disabled) return;
        if (!option.value) return;
        
        value = option.value;
        searchTerm = option.value;
        isOpen = false;
        dispatch('change', { value: option.value });
    }

    async function handleCreate() {
        if (disabled) return;
        const trimmedValue = searchTerm.trim();
        if (!trimmedValue || trimmedValue.length === 0) return;

        const validatedValue = validateInputLength(trimmedValue, type);
        
        try {
            if (type === 'SYMBOL' && accountId) {
                await accountSymbolStore.addSymbol(accountId, validatedValue);
            } else if (type === 'STRATEGY') {
                await userStrategyStore.addStrategy(validatedValue);
            } else if (type === 'TAG') {
                if (validatedValue) {
                    dispatch('change', { value: validatedValue });
                }
                isOpen = false;
                return;
            }
            value = validatedValue;
            searchTerm = value;
            isOpen = false;
            dispatch('change', { value });
        } catch (err) {
            console.error('Failed to create option:', err);
        }
    }

    async function handleUpdate(option) {
        if (!editValue.trim() || editValue === option.value) {
            editingOption = null;
            editValue = '';
            return;
        }

        const validatedValue = validateInputLength(editValue.trim(), type);
        
        try {
            if (type === 'SYMBOL' && accountId) {
                await accountSymbolStore.removeSymbol(accountId, option.value);
                await accountSymbolStore.addSymbol(accountId, validatedValue);
                if (value === option.value) {
                    value = validatedValue;
                }
            } else if (type === 'STRATEGY') {
                const strategies = $userStrategyStore.strategies.filter(s => s !== option.value);
                strategies.push(validatedValue);
                await userStrategyStore.updateStrategies(strategies);
                if (value === option.value) {
                    value = validatedValue;
                }
            }
            searchTerm = value;
            editingOption = null;
            editValue = '';
            dispatch('change', { value });
        } catch (err) {
            console.error('Failed to update option:', err);
        }
    }

    async function handleDelete(option, event) {
        event.stopPropagation();
        if (!confirm(`Are you sure you want to delete this ${type.toLowerCase()}?`)) return;
        try {
            if (type === 'SYMBOL' && accountId) {
                if (options.length <= 1) return;
                await accountSymbolStore.removeSymbol(accountId, option.value);
            } else if (type === 'STRATEGY') {
                await userStrategyStore.removeStrategy(option.value);
            }
            if (value === option.value) {
                value = '';
                searchTerm = '';
                dispatch('change', { value: '' });
            }
        } catch (err) {
            console.error('Failed to delete option:', err);
        }
    }

    function startEditing(option, event) {
        event.stopPropagation();
        editingOption = option;
        editValue = option.value;
        if (!isOpen) isOpen = true;
    }

    function handleClickOutside() {
        isOpen = false;
        if (editingOption) {
            searchTerm = editingOption.value;
            editingOption = null;
            editValue = '';
        } else if (!options.some(opt => opt.value.toLowerCase() === searchTerm.toLowerCase())) {
            if (type === 'TAG' && !value) {
                searchTerm = '';
            } else {
                searchTerm = value;
            }
        }
    }

    function handleKeydown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            if (editingOption) {
                handleUpdate(editingOption);
            } else if (searchTerm && !filteredOptions.some(opt => opt.value.toLowerCase() === searchTerm.toLowerCase())) {
                handleCreate();
            } else if (filteredOptions.length === 1) {
                handleSelect(filteredOptions[0]);
            }
        } else if (event.key === 'Escape') {
            event.preventDefault();
            if (editingOption) {
                searchTerm = editingOption.value;
                editingOption = null;
                editValue = '';
            } else {
                isOpen = false;
                searchTerm = value;
            }
        } else if (event.key === 'ArrowDown' && filteredOptions.length > 0 && !editingOption) {
            event.preventDefault();
            const firstOption = filteredOptions[0];
            handleSelect(firstOption);
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
            maxlength={type === 'SYMBOL' ? 16 : 50}
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
        <div class="absolute z-50 w-full mt-1 bg-light-bg overflow-hidden dark:bg-dark-bg border border-light-border dark:border-0 rounded-md shadow-lg divide-y divide-light-border dark:divide-dark-border max-h-[240px] overflow-auto"
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
            {#if filteredOptions.length > 0}
                <div class="max-h-[160px] overflow-y-auto">
                    {#each filteredOptions as option}
                        <div class="group relative hover:bg-light-hover dark:hover:bg-dark-hover">
                            {#if editingOption?.value === option.value}
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
                                            on:click={() => handleUpdate(option)}
                                        >
                                            Save
                                        </Button>
                                        <Button 
                                            variant="secondary"
                                            size="sm"
                                            on:click={() => {
                                                editingOption = null;
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
                                        class="flex-1 text-sm text-light-text-muted dark:text-dark-text cursor-pointer truncate mr-2"
                                        title={option.value}
                                        on:click={() => handleSelect(option)}
                                    >
                                        {option.value}
                                        {#if option.usageCount > 0}
                                            <span class="ml-1 text-xs text-light-text-muted dark:text-dark-text-muted">
                                                ({option.usageCount})
                                            </span>
                                        {/if}
                                    </div>
                                    <div class="hidden group-hover:flex items-center space-x-1 flex-shrink-0">
                                        <button
                                            type="button"
                                            class="p-1 text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text"
                                            on:click={(e) => startEditing(option, e)}
                                        >
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                            </svg>
                                        </button>
                                        <button
                                            type="button"
                                            class="p-1 text-light-text-muted dark:text-dark-text-muted hover:text-red-500"
                                            on:click={(e) => handleDelete(option, e)}
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
                    No options found
                </div>
            {/if}

            <!-- Add New Option Button -->
            <div class="p-1.5 bg-light-card dark:bg-dark-card border-t border-light-border dark:border-0">
                {#if searchTerm.trim() && !editingOption && !filteredOptions.some(opt => opt.value.toLowerCase() === searchTerm.trim().toLowerCase())}
                    <Button 
                        variant="primary"
                        size="xs"
                        class="w-full overflow-hidden"
                        on:click={handleCreate}
                    >
                        <div class="flex items-center w-full">
                            <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                            </svg>
                            <span class="truncate ml-1 flex-1 text-center" title='Add "{searchTerm.trim()}"'>
                                Add "{searchTerm.trim()}"
                            </span>
                        </div>
                    </Button>
                {:else}
                    <div class="text-xs text-light-text-muted dark:text-dark-text-muted text-center">
                        Type to add new {type.toLowerCase()}
                    </div>
                {/if}
            </div>
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

    /* แก้ไข style สำหรับ disabled state ให้มี opacity เท่ากับฟิลด์อื่นๆ */
    :global(.input[disabled]) {
        cursor: not-allowed;
    }

    /* เพิ่ม style สำหรับปุ่ม Add */
    :global(.button-xs) {
        @apply py-1 px-2 text-xs;
    }

    /* จำกัดความกว้างของข้อความในปุ่ม */
    :global(.button-xs .truncate) {
        max-width: calc(100% - 1.5rem); /* หักความกว้างของไอคอน + padding */
    }

    /* ป้องกันการ scroll */
    :global(.button-xs) {
        @apply overflow-hidden whitespace-nowrap;
    }
</style>
