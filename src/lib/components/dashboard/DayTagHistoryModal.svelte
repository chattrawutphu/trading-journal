<script>
    import { createEventDispatcher } from "svelte";
    import Modal from '../common/Modal.svelte';
    import { api } from '$lib/utils/api';
    import Loading from '../common/Loading.svelte';
    import { formatShortDate } from '$lib/utils/date';
    import Button from '../common/Button.svelte';
    import { fade } from "svelte/transition";
    import { dayConfigStore } from '$lib/stores/dayConfigStore';
    import DayConfigModal from './DayConfigModal.svelte';
    import { deleteModalStore } from '$lib/stores/modalStore';

    const dispatch = createEventDispatcher();

    export let show = false;
    export let tag = null;
    export let tagColor = null;
    export let accountId = null;
    export let onDaySelect = null;

    let loading = true;
    let error = null;
    let taggedDays = [];
    let summary = {
        totalTrades: 0,
        totalWins: 0,
        totalLosses: 0,
        totalPnL: 0
    };
    let showDayConfigModal = false;
    let selectedDayConfig = null;
    let selectedDate = null;

    // Add new state variables for table functionality
    let sortField = 'date';
    let sortDirection = 'desc';
    let selectedDays = [];
    let currentPage = 1;
    let itemsPerPage = 10;

    $: if (show && tag) {
        loadTaggedDays();
    }

    async function loadTaggedDays() {
        try {
            loading = true;
            error = null;
            const days = await api.getTaggedDays(tag);
            taggedDays = days.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            summary = taggedDays.reduce((acc, day) => ({
                totalTrades: acc.totalTrades + day.tradesCount,
                totalWins: acc.totalWins + (day.winCount || 0),
                totalLosses: acc.totalLosses + (day.lossCount || 0),
                totalPnL: acc.totalPnL + (day.totalPnL || 0)
            }), {
                totalTrades: 0,
                totalWins: 0,
                totalLosses: 0,
                totalPnL: 0
            });

        } catch (err) {
            error = err.message;
            console.error('Error loading tagged days:', err);
        } finally {
            loading = false;
        }
    }

    function handleDayClick(day) {
        if (onDaySelect) {
            onDaySelect(day);
        }
    }

    function handleClose() {
        show = false;
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

    async function handleConfigEdit(day) {
        selectedDayConfig = await dayConfigStore.loadConfig(accountId, day.date);
        selectedDate = day.date;
        showDayConfigModal = true;
    }

    async function handleConfigUpdated(event) {
        const updatedConfig = event.detail;
        if (updatedConfig) {
            // Refresh the data after config update
            await loadTaggedDays();
        }
        showDayConfigModal = false;
        selectedDayConfig = null;
        selectedDate = null;
    }

    function handleSort(field) {
        if (sortField === field) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortField = field;
            sortDirection = 'desc';
        }
    }

    function handleSelect(dayId) {
        selectedDays = selectedDays.includes(dayId) 
            ? selectedDays.filter(id => id !== dayId)
            : [...selectedDays, dayId];
    }

    async function handleDelete(day) {
        deleteModalStore.set({
            show: true,
            type: 'single',
            context: 'days',
            count: 1,
            itemName: `day ${formatShortDate(day.date)}`,
            onConfirm: async () => {
                try {
                    // Use the date directly from the day object
                    const formattedDate = day.date;
                    await dayConfigStore.deleteConfig(accountId, formattedDate);
                    await loadTaggedDays();
                } catch (error) {
                    console.error('Error deleting day:', error);
                }
            }
        });
    }

    async function handleDeleteSelected() {
        deleteModalStore.set({
            show: true,
            type: 'selected',
            context: 'days',
            count: selectedDays.length,
            itemName: 'days',
            onConfirm: async () => {
                try {
                    await Promise.all(
                        selectedDays.map(dayId => {
                            const day = taggedDays.find(d => d._id === dayId);
                            // Use the date directly from the day object
                            const formattedDate = day.date;
                            return dayConfigStore.deleteConfig(accountId, formattedDate);
                        })
                    );
                    selectedDays = [];
                    await loadTaggedDays();
                } catch (error) {
                    console.error('Error deleting selected days:', error);
                }
            }
        });
    }

    // Add sorting logic
    $: sortedDays = [...taggedDays].sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];

        if (sortField === 'date') {
            aValue = new Date(aValue).getTime();
            bValue = new Date(bValue).getTime();
        } else if (sortField === 'tradesCount' || sortField === 'winRate' || sortField === 'totalPnL') {
            aValue = Number(aValue) || 0;
            bValue = Number(bValue) || 0;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    // Add pagination logic
    $: totalPages = Math.ceil(sortedDays.length / itemsPerPage);
    $: paginatedDays = sortedDays.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
                        Tagged Days History
                    </h2>
                </div>
                <div class="flex items-center gap-4">
                    <button 
                        class="p-2 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover"
                        on:click={handleClose}
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
                        <h4 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Total Days</h4>
                        <p class="text-lg font-bold text-light-text dark:text-dark-text">
                            {taggedDays.length}
                        </p>
                    </div>
                    <div class="space-y-1">
                        <h4 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Total Trades</h4>
                        <p class="text-lg font-bold text-light-text dark:text-dark-text">
                            {summary.totalTrades}
                        </p>
                    </div>
                    <div class="space-y-1">
                        <h4 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Win Rate</h4>
                        <p class="text-lg font-bold text-light-text dark:text-dark-text">
                            {getWinRate(summary.totalWins, summary.totalWins + summary.totalLosses)}
                        </p>
                    </div>
                    <div class="space-y-1">
                        <h4 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Total P&L</h4>
                        <p class="text-lg font-bold {summary.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}">
                            {formatPnL(summary.totalPnL)}
                        </p>
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
                {:else if taggedDays.length === 0}
                    <div class="text-center py-12">
                        <p class="text-light-text-muted dark:text-dark-text-muted">
                            No days found with this tag
                        </p>
                    </div>
                {:else}
                    <div class="overflow-x-auto px-8 py-6">
                        <table class="w-full">
                            <thead>
                                <tr class="text-sm text-light-text-muted dark:text-dark-text-muted border-b border-light-border dark:border-dark-border">
                                    <th class="w-8 py-1 px-2 text-left font-medium">
                                        <input 
                                            type="checkbox" 
                                            class="checkbox"
                                            on:click={() => selectedDays = selectedDays.length === taggedDays.length ? [] : taggedDays.map(d => d._id)}
                                            checked={selectedDays.length === taggedDays.length && taggedDays.length > 0}
                                        />
                                    </th>
                                    <th class="py-1 px-2 text-left font-medium">
                                        <button 
                                            class="px-2 py-1 text-sm font-medium rounded-md hover:bg-theme-500/10 hover:text-theme-500 transition-colors
                                                   {sortField === 'date' ? 'bg-theme-500/10 text-theme-500' : ''}"
                                            on:click={() => handleSort('date')}
                                        >
                                            Date {sortField === 'date' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
                                        </button>
                                    </th>
                                    <th class="py-1 px-2 text-left font-medium">
                                        <button 
                                            class="px-2 py-1 text-sm font-medium rounded-md hover:bg-theme-500/10 hover:text-theme-500 transition-colors
                                                   {sortField === 'tradesCount' ? 'bg-theme-500/10 text-theme-500' : ''}"
                                            on:click={() => handleSort('tradesCount')}
                                        >
                                            Trades {sortField === 'tradesCount' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
                                        </button>
                                    </th>
                                    <th class="py-1 px-2 text-left font-medium">Win/Loss</th>
                                    <th class="py-1 px-2 text-center font-medium">
                                        <button 
                                            class="px-2 py-1 text-sm font-medium rounded-md hover:bg-theme-500/10 hover:text-theme-500 transition-colors
                                                   {sortField === 'winRate' ? 'bg-theme-500/10 text-theme-500' : ''}"
                                            on:click={() => handleSort('winRate')}
                                        >
                                            Win Rate {sortField === 'winRate' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
                                        </button>
                                    </th>
                                    <th class="py-1 px-2 text-right font-medium">
                                        <button 
                                            class="px-2 py-1 text-sm font-medium rounded-md hover:bg-theme-500/10 hover:text-theme-500 transition-colors
                                                   {sortField === 'totalPnL' ? 'bg-theme-500/10 text-theme-500' : ''}"
                                            on:click={() => handleSort('totalPnL')}
                                        >
                                            P&L {sortField === 'totalPnL' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
                                        </button>
                                    </th>
                                    <th class="py-1 px-2 text-right font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-light-border dark:divide-dark-border">
                                {#each paginatedDays as day}
                                    <tr class="hover:bg-light-hover/50 dark:hover:bg-dark-hover/50 transition-colors">
                                        <td class="py-1 px-2">
                                            <input 
                                                type="checkbox"
                                                class="checkbox"
                                                on:click={() => handleSelect(day._id)}
                                                checked={selectedDays.includes(day._id)}
                                            />
                                        </td>
                                        <td class="py-1 px-2 text-sm font-medium text-light-text dark:text-dark-text">
                                            {formatShortDate(day.date)}
                                        </td>
                                        <td class="py-1 px-2">
                                            <div class="flex items-center gap-1">
                                                <span class="px-2 py-1 text-sm rounded-full bg-light-hover/50 dark:bg-dark-hover/50 text-light-text dark:text-dark-text">
                                                    {day.tradesCount}
                                                </span>
                                            </div>
                                        </td>
                                        <td class="py-1 px-2">
                                            <div class="flex items-center gap-2">
                                                <span class="px-2 py-1 text-sm rounded-full bg-green-500/10 text-green-500">
                                                    {day.winCount || 0}W
                                                </span>
                                                <span class="px-2 py-1 text-sm rounded-full bg-red-500/10 text-red-500">
                                                    {day.lossCount || 0}L
                                                </span>
                                            </div>
                                        </td>
                                        <td class="py-1 px-2 text-center">
                                            <span class="px-2 py-1 text-sm rounded-full bg-light-hover/50 dark:bg-dark-hover/50 text-light-text dark:text-dark-text">
                                                {day.winRate}%
                                            </span>
                                        </td>
                                        <td class="py-1 px-2 text-right font-medium {day.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}">
                                            {formatPnL(day.totalPnL)}
                                        </td>
                                        <td class="py-1 px-2 text-right">
                                            <div class="flex items-center justify-end gap-1">
                                                <button 
                                                    class="icon-button text-theme-500 hover:text-theme-600"
                                                    on:click={() => handleDayClick(day)}
                                                    title="View day"
                                                >
                                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                                    </svg>
                                                </button>
                                                <button 
                                                    class="icon-button text-theme-500 hover:text-theme-600"
                                                    on:click={() => handleConfigEdit(day)}
                                                    title="Edit day"
                                                >
                                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                                    </svg>
                                                </button>
                                                <button 
                                                    class="icon-button text-red-500 hover:text-red-600"
                                                    on:click={() => handleDelete(day)}
                                                    title="Delete day"
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
                    </div>

                    <!-- Add table footer with pagination and bulk actions -->
                    <div class="px-8 py-4 border-t border-light-border dark:border-0">
                        <div class="flex justify-between items-center">
                            <div class="flex gap-2">
                                {#if selectedDays.length > 0}
                                    <button 
                                        class="btn btn-primary flex items-center gap-1"
                                        on:click={handleDeleteSelected}
                                        title="Delete selected days"
                                    >
                                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                        </svg>
                                        Delete Selected ({selectedDays.length})
                                    </button>
                                {/if}
                            </div>
                            {#if totalPages > 1}
                                <div class="flex items-center text-xs gap-2">
                                    <button class="pagination-btn" on:click={() => changePage(currentPage - 1)} disabled={currentPage === 1}>
                                        &larr;
                                    </button>
                                    <span class="text-light-text-muted dark:text-dark-text-muted">Page {currentPage} of {totalPages}</span>
                                    <button class="pagination-btn" on:click={() => changePage(currentPage + 1)} disabled={currentPage === totalPages}>
                                        &rarr;
                                    </button>
                                </div>
                            {/if}
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}

<!-- Add DayConfigModal -->
<DayConfigModal
    bind:show={showDayConfigModal}
    accountId={accountId}
    date={selectedDate}
    config={selectedDayConfig}
    on:configUpdated={handleConfigUpdated}
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

    /* Add styles from TradeTable */
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