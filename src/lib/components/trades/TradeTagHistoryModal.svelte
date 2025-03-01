<script>
    import { createEventDispatcher } from "svelte";
    import { fade } from "svelte/transition";
    import Button from "../common/Button.svelte";
    import Modal from '../common/Modal.svelte';
    import TradeTable from "./TradeTable.svelte";
    import { api } from '$lib/utils/api';
    import { formatShortDate } from '$lib/utils/date';
    import { tradeTagStore } from '$lib/stores/tradeTagStore';
    import Loading from '../common/Loading.svelte';
    import { deleteModalStore } from '$lib/stores/modalStore';
    import TagConfigModal from '../dashboard/TagConfigModal.svelte';

    const dispatch = createEventDispatcher();

    export let show = false;
    export let tag = '';
    export let tagColor = null;
    export let accountId;

    let trades = [];
    let loading = false;
    let error = null;
    let tagHistory = null;
    let showTagConfigModal = false;

    // Add new state variables for table functionality
    let sortField = 'date';
    let sortDirection = 'desc';
    let selectedTrades = [];
    let currentPage = 1;
    let itemsPerPage = 10;

    let summary = {
        totalTrades: 0,
        totalWins: 0,
        totalLosses: 0,
        totalPnL: 0
    };

    let totalUnrealizedPnL = null;
    let isLoadingUnrealizedPnL = true;

    $: if (show && tag) {
        loadTrades();
        loadTagHistory();
        resetUnrealizedPnL();
    }

    async function loadTrades() {
        loading = true;
        error = null;
        try {
            trades = await api.getTaggedTrades(accountId, tag);
            
            // Calculate summary statistics
            summary = trades.reduce((acc, trade) => ({
                totalTrades: acc.totalTrades + 1,
                totalWins: acc.totalWins + (trade.pnl >= 0 ? 1 : 0),
                totalLosses: acc.totalLosses + (trade.pnl < 0 ? 1 : 0),
                totalPnL: acc.totalPnL + (trade.pnl || 0)
            }), {
                totalTrades: 0,
                totalWins: 0,
                totalLosses: 0,
                totalPnL: 0
            });
        } catch (err) {
            console.error('Error loading trades:', err);
            error = 'Failed to load trades. Please try again.';
        } finally {
            loading = false;
        }
    }

    async function loadTagHistory() {
        if (tag) {
            try {
                tagHistory = await api.getTagHistory(tag);
            } catch (err) {
                console.error('Error loading tag history:', err);
            }
        }
    }

    function handleTradeView(event) {
        dispatch('view', event.detail);
    }

    function handleTradeEdit(event) {
        dispatch('edit', event.detail);
    }

    function handleTradeFavorite(event) {
        dispatch('favorite', event.detail);
    }

    function handleTradeDelete(event) {
        dispatch('delete', event.detail);
    }

    function handleSort(field) {
        if (sortField === field) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortField = field;
            sortDirection = 'desc';
        }
    }

    function handleSelect(tradeId) {
        selectedTrades = selectedTrades.includes(tradeId) 
            ? selectedTrades.filter(id => id !== tradeId)
            : [...selectedTrades, tradeId];
    }

    function formatPnL(value) {
        if (!value) return '$0.00';
        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        return formatter.format(value);
    }

    function getWinRate(wins, total) {
        if (!total) return '0%';
        return `${Math.round((wins / total) * 100)}%`;
    }

    async function handleTagConfigEdit() {
        showTagConfigModal = true;
    }

    async function handleTagConfigUpdated(event) {
        const updatedHistory = event.detail;
        if (updatedHistory) {
            tagHistory = updatedHistory;
            if (updatedHistory.tag !== tag) {
                tag = updatedHistory.tag;
                await loadTrades();
            }
            dispatch('tagHistoryUpdated', updatedHistory);
        }
        showTagConfigModal = false;
    }

    async function handleDeleteSelected() {
        deleteModalStore.set({
            show: true,
            type: 'selected',
            context: 'trades',
            count: selectedTrades.length,
            itemName: `${selectedTrades.length} trades`,
            onConfirm: async () => {
                try {
                    await Promise.all(selectedTrades.map(tradeId => 
                        api.deleteTrade(accountId, tradeId)
                    ));
                    selectedTrades = [];
                    await loadTrades();
                } catch (error) {
                    console.error('Error deleting selected trades:', error);
                }
            }
        });
    }

    function resetUnrealizedPnL() {
        totalUnrealizedPnL = null;
        isLoadingUnrealizedPnL = true;
    }

    function handleUnrealizedPnLUpdate(event) {
        const { total, isLoading } = event.detail;
        totalUnrealizedPnL = total;
        isLoadingUnrealizedPnL = isLoading;
    }

    // Add sorting logic
    $: sortedTrades = [...trades].sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];

        if (sortField === 'date') {
            aValue = new Date(aValue).getTime();
            bValue = new Date(bValue).getTime();
        } else if (sortField === 'pnl') {
            aValue = Number(aValue) || 0;
            bValue = Number(bValue) || 0;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    // Add pagination logic
    $: totalPages = Math.ceil(sortedTrades.length / itemsPerPage);
    $: paginatedTrades = sortedTrades.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    function changePage(page) {
        if (page >= 1 && page <= totalPages) {
            currentPage = page;
        }
    }
</script>

{#if show}
    <div class="fixed modal inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
         transition:fade={{ duration: 150 }}>
        <div class="card w-full max-w-4xl mx-auto relative transform ease-out max-h-[90vh] flex flex-col">
            <!-- Header -->
            <div class="px-8 py-5 border-b border-light-border dark:border-0 flex justify-between items-center bg-light-card dark:bg-dark-card rounded-t-xl backdrop-blur-lg bg-opacity-90 dark:bg-opacity-90 z-10">
                <div class="flex items-center gap-4">
                    <div class="flex items-center gap-1 px-3 py-1.5 rounded-full {tagColor.bg} {tagColor.text}">
                        <span class="text-sm font-medium">{tag}</span>
                    </div>
                    <h2 class="text-xl font-bold text-light-text dark:text-dark-text">
                        Tag Details
                    </h2>
                </div>
                <div class="flex items-center gap-4">
                    <Button variant="secondary" size="xs" on:click={handleTagConfigEdit}>
                        <svg class="w-5 h-5 md:w-3 md:h-3 mr-0 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                        <span class="hidden md:flex">Edit</span>
                    </Button>
                    <button 
                        class="p-2 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover"
                        on:click={() => dispatch('close')}
                    >
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Summary Stats -->
            <div class="px-8 py-4 border-b border-light-border dark:border-0 bg-light-hover/30 dark:bg-dark-hover/30">
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="space-y-1">
                        <h4 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Total Trades</h4>
                        <p class="text-lg font-bold text-light-text dark:text-dark-text">
                            {summary.totalTrades}
                        </p>
                    </div>
                    <div class="space-y-1">
                        <h4 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Win/Loss</h4>
                        <p class="text-lg font-bold text-light-text dark:text-dark-text">
                            {summary.totalWins}W/{summary.totalLosses}L
                        </p>
                    </div>
                    <div class="space-y-1">
                        <h4 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Win Rate</h4>
                        <p class="text-lg font-bold text-light-text dark:text-dark-text">
                            {getWinRate(summary.totalWins, summary.totalWins + summary.totalLosses)}
                        </p>
                    </div>
                    <div class="space-y-1">
                        <h4 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">
                            {trades.filter(t => t.status === "OPEN").length > 0 ? 'Realized P&L' : 'Total P&L'}
                        </h4>
                        <p class="text-lg font-bold {summary.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}">
                            {formatPnL(summary.totalPnL)}
                        </p>
                    </div>
                    {#if trades.filter(t => t.status === "OPEN").length > 0}
                        <div class="space-y-1">
                            <h4 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Unrealized P&L</h4>
                            <p class="text-lg font-bold">
                                {#if isLoadingUnrealizedPnL || totalUnrealizedPnL === null}
                                    <span class="text-light-text-muted dark:text-dark-text-muted">Loading...</span>
                                {:else}
                                    <span class="text-yellow-500">{formatPnL(totalUnrealizedPnL)}</span>
                                {/if}
                            </p>
                        </div>
                    {/if}
                </div>
                <!-- Notes Section -->
                <div class="flex justify-between items-start gap-8 mt-4">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                            <svg class="w-4 h-4 text-light-text-muted dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                            <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Notes</h3>
                        </div>
                        {#if tagHistory?.note?.replace(/<[^>]*>/g, '').trim()}
                        <div class="prose prose-sm max-w-none text-light-text dark:text-dark-text rich-text-content">
                            {@html tagHistory.note}
                        </div>
                        {:else}
                        <div class="flex items-center gap-2 text-sm text-light-text-muted dark:text-dark-text-muted">
                            <span>No notes yet.</span>
                            <button 
                                class="text-theme-500 hover:text-theme-600 dark:hover:text-theme-400 underline"
                                on:click={handleTagConfigEdit}
                            >
                                Add notes
                            </button>
                        </div>
                        {/if}
                    </div>
                </div>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto">
                {#if loading}
                    <div class="flex items-center justify-center py-12">
                        <Loading />
                    </div>
                {:else if error}
                    <div class="text-center py-12">
                        <p class="text-red-500">{error}</p>
                    </div>
                {:else if trades.length === 0}
                    <div class="text-center py-12">
                        <p class="text-light-text-muted dark:text-dark-text-muted">
                            No trades found with this tag
                        </p>
                    </div>
                {:else}
                    <div class="px-8 py-6">
                        {#if trades.filter(t => t.status === "OPEN").length > 0}
                            <div class="mb-6">
                                <h3 class="text-sm font-medium mb-2 text-light-text-muted dark:text-dark-text-muted">
                                    Open Trades
                                </h3>
                                <TradeTable
                                    trades={trades.filter(t => t.status === "OPEN")}
                                    type="open"
                                    isInModal={true}
                                    on:view={handleTradeView}
                                    on:edit={handleTradeEdit}
                                    on:favorite={handleTradeFavorite}
                                    on:disable
                                    on:delete={handleTradeDelete}
                                    on:deleted={loadTrades}
                                    on:unrealizedPnLUpdate={handleUnrealizedPnLUpdate}
                                />
                            </div>
                        {/if}

                        {#if trades.filter(t => t.status === "CLOSED").length > 0}
                            <div class="mb-6">
                                <h3 class="text-sm font-medium mb-2 text-light-text-muted dark:text-dark-text-muted">
                                    Closed Trades
                                </h3>
                                <TradeTable
                                    trades={trades.filter(t => t.status === "CLOSED")}
                                    type="closed"
                                    isInModal={true}
                                    on:view={handleTradeView}
                                    on:edit={handleTradeEdit}
                                    on:favorite={handleTradeFavorite}
                                    on:disable
                                    on:delete={handleTradeDelete}
                                    on:deleted={loadTrades}
                                />
                            </div>
                        {/if}
                    </div>

                    <!-- Add table footer with bulk actions -->
                    <div class="px-8 py-4 border-t border-light-border dark:border-0">
                        <div class="flex justify-between items-center">
                            <div class="flex gap-2">
                                {#if selectedTrades.length > 0}
                                    <button 
                                        class="btn btn-primary flex items-center gap-1"
                                        on:click={handleDeleteSelected}
                                        title="Delete selected trades"
                                    >
                                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                        </svg>
                                        Delete Selected ({selectedTrades.length})
                                    </button>
                                {/if}
                            </div>
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}

<!-- Add TagConfigModal -->
<TagConfigModal
    bind:show={showTagConfigModal}
    {tag}
    config={tagHistory}
    on:configUpdated={handleTagConfigUpdated}
/>

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-0 rounded-xl shadow-xl;
    }

    :global(.modal) {
        overscroll-behavior: contain;
    }

    /* Table styles */
    table {
        border-collapse: separate;
        border-spacing: 0;
    }

    th {
        position: sticky;
        top: 0;
        background: var(--color-light-card);
        z-index: 10;
    }

    :global(.dark) th {
        background: var(--color-dark-card);
    }

    .icon-button {
        @apply p-1 rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover text-sm;
    }

    .btn {
        @apply px-2 py-1 text-xs rounded-lg font-medium;
    }

    .btn-primary {
        @apply bg-theme-500 text-white hover:bg-theme-600;
    }

    .pagination-btn {
        @apply w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 
               text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 
               disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:cursor-not-allowed;
    }
</style> 