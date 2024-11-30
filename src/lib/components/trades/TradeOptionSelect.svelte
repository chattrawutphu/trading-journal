<!-- src/lib/components/trades/TradeOptionSelect.svelte -->
<script>
    import { createEventDispatcher, onMount } from 'svelte';
    import { tradeOptionStore } from '$lib/stores/tradeOptionStore';
    import Button from '../common/Button.svelte';
    import Input from '../common/Input.svelte';
    import Loading from '../common/Loading.svelte';

    export let type = 'SYMBOL'; // or 'STRATEGY'
    export let value = '';
    export let placeholder = '';
    export let required = false;

    const dispatch = createEventDispatcher();
    let showDropdown = false;
    let showAddModal = false;
    let searchTerm = '';
    let newOptionValue = '';
    let editingOption = null;
    let dropdownRef;
    let inputRef;

    $: options = type === 'SYMBOL' ? $tradeOptionStore.symbols : $tradeOptionStore.strategies;
    $: filteredOptions = searchTerm
        ? options.filter(opt => 
            opt.value.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : options;
    $: selectedOption = options.find(opt => opt.value === value);

    onMount(async () => {
        await tradeOptionStore.loadOptions();
        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    });

    function handleClickOutside(event) {
        if (dropdownRef && !dropdownRef.contains(event.target) && 
            (!inputRef || !inputRef.contains(event.target))) {
            showDropdown = false;
        }
    }

    async function handleSelect(option) {
        value = option.value;
        dispatch('change', value);
        showDropdown = false;
        await tradeOptionStore.incrementUsage(option._id);
    }

    async function handleCreate() {
        if (newOptionValue.trim()) {
            try {
                const option = await tradeOptionStore.createOption(type, newOptionValue);
                value = option.value;
                dispatch('change', value);
                newOptionValue = '';
                showAddModal = false;
            } catch (error) {
                console.error('Failed to create option:', error);
            }
        }
    }

    async function handleUpdate() {
        if (editingOption && editingOption.value.trim()) {
            try {
                await tradeOptionStore.updateOption(editingOption._id, editingOption.value);
                if (value === editingOption.oldValue) {
                    value = editingOption.value;
                    dispatch('change', value);
                }
                editingOption = null;
            } catch (error) {
                console.error('Failed to update option:', error);
            }
        }
    }

    async function handleDelete(option) {
        if (confirm(`Are you sure you want to delete this ${type.toLowerCase()}?`)) {
            try {
                await tradeOptionStore.deleteOption(option._id);
                if (value === option.value) {
                    value = '';
                    dispatch('change', value);
                }
            } catch (error) {
                console.error('Failed to delete option:', error);
            }
        }
    }

    function startEdit(option) {
        editingOption = { 
            ...option,
            oldValue: option.value
        };
    }
</script>

<div class="relative" bind:this={dropdownRef}>
    <!-- Input Field -->
    <div class="relative">
        <input
            type="text"
            bind:this={inputRef}
            readonly
            {value}
            {placeholder}
            {required}
            class="w-full bg-slate-700 border border-slate-600 rounded-lg p-2 text-sm focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            on:click={() => showDropdown = !showDropdown}
        />
        <div class="absolute inset-y-0 right-0 flex items-center pr-2">
            <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
        </div>
    </div>

    <!-- Dropdown -->
    {#if showDropdown}
        <div class="absolute z-50 w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-lg">
            <!-- Search and Add -->
            <div class="p-2 border-b border-slate-600 space-y-2">
                <input
                    type="text"
                    bind:value={searchTerm}
                    placeholder="Search..."
                    class="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                    class="w-full text-left px-2 py-1 text-sm text-blue-400 hover:bg-slate-600 rounded-lg flex items-center"
                    on:click={() => showAddModal = true}
                >
                    <i class="fas fa-plus-circle mr-2"></i>
                    Add New {type}
                </button>
            </div>

            <!-- Options List -->
            <div class="max-h-60 overflow-y-auto">
                {#if $tradeOptionStore.loading}
                    <div class="p-2">
                        <Loading size="sm" message="Loading options..." />
                    </div>
                {:else if filteredOptions.length === 0}
                    <div class="p-2 text-sm text-slate-400 text-center">
                        No options found
                    </div>
                {:else}
                    {#each filteredOptions as option}
                        <div class="flex items-center justify-between px-4 py-2 hover:bg-slate-600">
                            <button
                                class="flex-grow text-left text-sm text-slate-300 hover:text-white"
                                class:font-bold={value === option.value}
                                on:click={() => handleSelect(option)}
                            >
                                {option.value}
                            </button>
                            <div class="flex items-center space-x-2">
                                <button
                                    class="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-slate-500"
                                    on:click|stopPropagation={() => startEdit(option)}
                                    title="Edit"
                                >
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button
                                    class="text-red-400 hover:text-red-300 p-1 rounded hover:bg-slate-500"
                                    on:click|stopPropagation={() => handleDelete(option)}
                                    title="Delete"
                                >
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    {/each}
                {/if}
            </div>
        </div>
    {/if}
</div>

<!-- Add Modal -->
{#if showAddModal}
    <div class="fixed inset-0 bg-black bg-opacity-70 z-[100] flex items-center justify-center">
        <div class="bg-slate-800 rounded-lg w-full max-w-md mx-4 p-6">
            <h2 class="text-2xl font-bold gradient-text mb-4">New {type}</h2>
            <form on:submit|preventDefault={handleCreate} class="space-y-4">
                <Input
                    label={type}
                    type="text"
                    bind:value={newOptionValue}
                    required
                    placeholder={`Enter new ${type.toLowerCase()}`}
                />
                <div class="flex justify-end gap-4">
                    <Button 
                        type="button" 
                        variant="secondary" 
                        on:click={() => {
                            showAddModal = false;
                            newOptionValue = '';
                        }}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary">
                        Create
                    </Button>
                </div>
            </form>
        </div>
    </div>
{/if}

<!-- Edit Modal -->
{#if editingOption}
    <div class="fixed inset-0 bg-black bg-opacity-70 z-[100] flex items-center justify-center">
        <div class="bg-slate-800 rounded-lg w-full max-w-md mx-4 p-6">
            <h2 class="text-2xl font-bold gradient-text mb-4">Edit {type}</h2>
            <form on:submit|preventDefault={handleUpdate} class="space-y-4">
                <Input
                    label={type}
                    type="text"
                    bind:value={editingOption.value}
                    required
                    placeholder={`Enter ${type.toLowerCase()}`}
                />
                <div class="flex justify-end gap-4">
                    <Button 
                        type="button" 
                        variant="secondary" 
                        on:click={() => editingOption = null}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary">
                        Save Changes
                    </Button>
                </div>
            </form>
        </div>
    </div>
{/if}

<style>
    .gradient-text {
        background: linear-gradient(45deg, #3b82f6, #8b5cf6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
</style>
