<script>
    import { createEventDispatcher } from 'svelte';
    import { formatCurrency } from '$lib/utils/formatters';
    import Modal from '../common/Modal.svelte';

    const dispatch = createEventDispatcher();

    export let trades = [];
    export let type = 'closed'; // 'open' or 'closed'

    let sortField = type === 'closed' ? 'exitDate' : 'entryDate';
    let sortDirection = 'desc';
    let selectedTrades = [];
    let showModal = false;
    let deleteAll = false;

    function formatDate(dateStr) {
        const options = { 
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(dateStr).toLocaleString(undefined, options);
    }

    function getStatusClass(status) {
        return status === 'OPEN' ? 'text-yellow-500' : 'text-green-500';
    }

    function getSideClass(side) {
        return side === 'LONG' ? 'text-green-500' : 'text-red-500';
    }

    function getSortIcon(field) {
        if (sortField !== field) return '↕';
        return sortDirection === 'asc' ? '↑' : '↓';
    }

    function handleSort(field) {
        if (sortField === field) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortField = field;
            sortDirection = 'desc';
        }
    }

    $: sortedTrades = [...trades].sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];

        if (sortField === 'entryPrice' || sortField === 'exitPrice' || sortField === 'amount' || sortField === 'quantity' || sortField === 'pnl') {
            aValue = Number(aValue) || 0;
            bValue = Number(bValue) || 0;
        } else if (sortField === 'entryDate' || sortField === 'exitDate') {
            aValue = new Date(aValue).getTime();
            bValue = new Date(bValue).getTime();
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    function handleSelect(tradeId) {
        if (selectedTrades.includes(tradeId)) {
            selectedTrades = selectedTrades.filter(id => id !== tradeId);
        } else {
            selectedTrades = [...selectedTrades, tradeId];
        }
    }

    async function handleDeleteSelected() {
        deleteAll = false;
        showModal = true;
    }

    async function handleDeleteAll() {
        deleteAll = true;
        showModal = true;
    }

    async function confirmDelete() {
        showModal = false;
        if (deleteAll) {
            dispatch('deleteAll');
        } else {
            dispatch('deleteSelected', selectedTrades);
        }
        selectedTrades = [];
    }
</script>

<div class="overflow-x-auto">
    <table class="w-full">
        <thead>
            <tr class="border-b border-light-border dark:border-dark-border">
                <th class="w-8 text-left py-2 px-4 font-medium text-light-text-muted dark:text-dark-text-muted">
                    <input 
                        type="checkbox" 
                        class="custom-checkbox"
                        on:click={() => selectedTrades = selectedTrades.length === trades.length ? [] : trades.map(t => t._id)}
                        checked={selectedTrades.length === trades.length}
                    />
                </th>
                <th class="text-left py-2 px-4 font-medium text-light-text-muted dark:text-dark-text-muted">
                    <button class="flex items-center gap-1 hover:text-theme-500" on:click={() => handleSort('symbol')}>
                        Symbol
                        <span class="text-xs">{getSortIcon('symbol')}</span>
                    </button>
                </th>
                <th class="text-left py-2 px-4 font-medium text-light-text-muted dark:text-dark-text-muted">
                    <button class="flex items-center gap-1 hover:text-theme-500" on:click={() => handleSort('side')}>
                        Side
                        <span class="text-xs">{getSortIcon('side')}</span>
                    </button>
                </th>
                {#if type === 'open'}
                    <th class="text-left py-2 px-4 font-medium text-light-text-muted dark:text-dark-text-muted">
                        <button class="flex items-center gap-1 hover:text-theme-500" on:click={() => handleSort('entryDate')}>
                            Entry Date
                            <span class="text-xs">{getSortIcon('entryDate')}</span>
                        </button>
                    </th>
                    <th class="text-right py-2 px-4 font-medium text-light-text-muted dark:text-dark-text-muted">
                        <button class="flex items-center gap-1 hover:text-theme-500 ml-auto" on:click={() => handleSort('entryPrice')}>
                            Entry Price
                            <span class="text-xs">{getSortIcon('entryPrice')}</span>
                        </button>
                    </th>
                    <th class="text-right py-2 px-4 font-medium text-light-text-muted dark:text-dark-text-muted">
                        <button class="flex items-center gap-1 hover:text-theme-500 ml-auto" on:click={() => handleSort('amount')}>
                            Amount
                            <span class="text-xs">{getSortIcon('amount')}</span>
                        </button>
                    </th>
                    <th class="text-right py-2 px-4 font-medium text-light-text-muted dark:text-dark-text-muted">
                        <button class="flex items-center gap-1 hover:text-theme-500 ml-auto" on:click={() => handleSort('quantity')}>
                            Quantity
                            <span class="text-xs">{getSortIcon('quantity')}</span>
                        </button>
                    </th>
                {:else}
                    <th class="text-left py-2 px-4 font-medium text-light-text-muted dark:text-dark-text-muted">
                        <button class="flex items-center gap-1 hover:text-theme-500" on:click={() => handleSort('exitDate')}>
                            Exit Date
                            <span class="text-xs">{getSortIcon('exitDate')}</span>
                        </button>
                    </th>
                    <th class="text-right py-2 px-4 font-medium text-light-text-muted dark:text-dark-text-muted">
                        <button class="flex items-center gap-1 hover:text-theme-500 ml-auto" on:click={() => handleSort('entryPrice')}>
                            Entry/Exit
                            <span class="text-xs">{getSortIcon('entryPrice')}</span>
                        </button>
                    </th>
                    <th class="text-right py-2 px-4 font-medium text-light-text-muted dark:text-dark-text-muted">
                        <button class="flex items-center gap-1 hover:text-theme-500 ml-auto" on:click={() => handleSort('pnl')}>
                            P&L
                            <span class="text-xs">{getSortIcon('pnl')}</span>
                        </button>
                    </th>
                {/if}
                <th class="text-right py-2 px-4 font-medium text-light-text-muted dark:text-dark-text-muted">Actions</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-light-border dark:divide-dark-border">
            {#each sortedTrades as trade}
                <tr class="hover:bg-light-hover dark:hover:bg-dark-hover ">
                    <td class="w-8 py-2 px-4 text-right">
                        <input 
                            type="checkbox"
                            class="custom-checkbox"
                            on:click={() => handleSelect(trade._id)}
                            checked={selectedTrades.includes(trade._id)}
                        />
                    </td>
                    <td class="py-2 px-4">
                        <div class="flex items-center gap-2">
                            {#if trade.favorite}
                                <svg class="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                </svg>
                            {/if}
                            <span class="font-medium text-light-text-muted dark:text-dark-text">{trade.symbol}</span>
                        </div>
                    </td>
                    <td class="py-2 px-4">
                        <span class={getSideClass(trade.side)}>{trade.side}</span>
                    </td>
                    {#if type === 'open'}
                        <td class="py-2 px-4 text-light-text-muted dark:text-dark-text">{formatDate(trade.entryDate)}</td>
                        <td class="py-2 px-4 text-right text-light-text-muted dark:text-dark-text">{formatCurrency(trade.entryPrice)}</td>
                        <td class="py-2 px-4 text-right text-light-text-muted dark:text-dark-text">{formatCurrency(trade.amount)}</td>
                        <td class="py-2 px-4 text-right text-light-text-muted dark:text-dark-text">{trade.quantity}</td>
                    {:else}
                        <td class="py-2 px-4 text-light-text-muted dark:text-dark-text">{formatDate(trade.exitDate)}</td>
                        <td class="py-2 px-4 text-right">
                            <div class="flex flex-col text-light-text-muted dark:text-dark-text">
                                <span>{formatCurrency(trade.entryPrice)} / {formatCurrency(trade.exitPrice)}</span>
                            </div>
                        </td>
                        <td class="py-2 px-4 text-right">
                            <span class={trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                                {formatCurrency(trade.pnl)}
                            </span>
                        </td>
                    {/if}
                    <td class="py-2 px-4">
                        <div class="flex justify-end gap-2">
                            <button 
                                class="icon-button text-theme-500 hover:text-theme-600"
                                on:click={() => dispatch('view', trade)}
                                title="View details"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                </svg>
                            </button>
                            <button 
                                class="icon-button text-theme-500 hover:text-theme-600"
                                on:click={() => dispatch('edit', trade)}
                                title="Edit trade"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                            </button>
                            <button 
                                class="icon-button text-theme-500 hover:text-theme-600"
                                on:click={() => dispatch('favorite', trade._id)}
                                title={trade.favorite ? 'Remove from favorites' : 'Add to favorites'}
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                                </svg>
                            </button>
                            <button 
                                class="icon-button text-red-500 hover:text-red-600"
                                on:click={() => handleSelect(trade._id)}
                                title="Delete trade"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
    <div class="flex justify-start gap-2 p-2 px-4 mt-2">
        {#if selectedTrades.length > 0}
            <button 
                class="btn btn-primary flex items-center gap-1"
                on:click={handleDeleteSelected}
                title="Delete selected trades"
            >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                Delete Selected
            </button>
        {/if}
        <button 
            class="btn btn-secondary flex items-center gap-1"
            on:click={handleDeleteAll}
            title="Delete all trades"
        >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            Delete All
        </button>
    </div>
</div>

<Modal bind:show={showModal} title="Confirm Deletion">
    <p>Are you sure you want to {deleteAll ? 'delete all trades' : 'delete the selected trades'}?</p>
    <div class="flex justify-end gap-2 mt-4">
        <button class="btn btn-secondary" on:click={() => showModal = false}>Cancel</button>
        <button class="btn btn-primary" on:click={confirmDelete}>Confirm</button>
    </div>
</Modal>

<style lang="postcss">
    .icon-button {
        @apply p-1 rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover ;
    }

    .btn {
        @apply px-2 py-1 text-xs rounded-lg font-medium;
    }

    .btn-primary {
        @apply bg-theme-500 text-white hover:bg-theme-600;
    }

    .btn-secondary {
        @apply bg-gray-500 text-white hover:bg-gray-600;
    }

    .custom-checkbox {
        @apply appearance-none h-4 w-4 border border-gray-300 rounded-sm bg-white checked:bg-theme-500 checked:border-transparent focus:outline-none transition duration-200 align-top bg-no-repeat bg-center bg-contain float-left mr-2 cursor-pointer;
    }
</style>
