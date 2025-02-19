<script>
    import { createEventDispatcher } from "svelte";
    import { fade } from "svelte/transition";
    import Button from "../common/Button.svelte";
    import TradeTable from "../trades/TradeTable.svelte";
    import TransactionTable from "../transactions/TransactionTable.svelte";
    import TransactionModal from "../transactions/TransactionModal.svelte";
    import { transactionStore } from "$lib/stores/transactionStore";
    import { accountStore } from '$lib/stores/accountStore';
    import Loading from "$lib/components/common/Loading.svelte";
    import Modal from '../common/Modal.svelte';
    import { api } from '$lib/utils/api';
    import TradeViewModal from "../trades/TradeViewModal.svelte";
    import TradeModal from "../trades/TradeModal.svelte";

    const dispatch = createEventDispatcher();

    export let show = false;
    export let trades = [];
    export let transactions = [];
    export let displayDate = "";
    export let summary = {};
    export let loading = false;

    let showTransactionModal = false;
    let selectedTransaction = null;
    let showViewModal = false;
    let showEditModal = false;
    let selectedTrade = null;
    let showDeleteConfirmModal = false;
    let deleteContext = null;

    function formatCurrency(value) {
        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });
        return formatter.format(Number(value));
    }

    function handleTradeView(event) {
        selectedTrade = event.detail;
        showViewModal = true;
    }

    function handleTradeEdit(event) {
        selectedTrade = event.detail;
        showEditModal = true;
    }

    function handleEditTransaction(event) {
        selectedTransaction = event.detail;
        showTransactionModal = true;
    }

    function handleDelete(event) {
        showDeleteConfirmModal = true;
        deleteContext = event.detail;
    }

    async function confirmDelete() {
        if (deleteContext) {
            const { type, items, context } = deleteContext;
            try {
                if (context === 'trades') {
                    for (const tradeId of items) {
                        await api.deleteTrade(tradeId);
                    }
                } else if (context === 'transactions') {
                    for (const transactionId of items) {
                        await api.deleteTransaction(transactionId);
                    }
                }
                dispatch('refresh');
            } catch (err) {
                console.error('Error deleting items:', err);
            }
        }
        showDeleteConfirmModal = false;
        deleteContext = null;
    }

    function close() {
        show = false;
        dispatch('close');
    }
</script>

{#if show}
    <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" transition:fade>
        <div class="card w-full max-w-5xl mx-auto relative transform ease-out max-h-[90vh] flex flex-col">
            <!-- Header -->
            <div class="px-8 py-5 border-b border-light-border dark:border-0 flex justify-between items-center sticky top-0 bg-light-card dark:bg-dark-card rounded-t-xl backdrop-blur-lg bg-opacity-90 dark:bg-opacity-90 z-10">
                <div>
                    <h2 class="text-2xl font-bold bg-gradient-purple bg-clip-text text-transparent">
                        {displayDate}
                    </h2>
                </div>
                <button class="p-2 rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover text-light-text-muted dark:text-dark-text-muted" on:click={close}>
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto">
                <!-- Summary Stats -->
                <div class="px-8 pt-6">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <!-- P&L Card -->
                        <div class="card p-4">
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted mb-1">Total P&L</div>
                            <div class="text-xl font-bold {summary.pnl >= 0 ? 'text-green-500' : 'text-red-500'}">
                                {formatCurrency(summary.pnl)}
                            </div>
                        </div>

                        <!-- Win Rate Card -->
                        <div class="card p-4">
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted mb-1">Win Rate</div>
                            <div class="text-xl font-bold text-light-text dark:text-dark-text">
                                {summary.winRate}%
                            </div>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted mt-1">
                                {summary.wins}W / {summary.losses}L
                            </div>
                        </div>

                        <!-- ROI Card -->
                        <div class="card p-4">
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted mb-1">ROI</div>
                            <div class="text-xl font-bold text-light-text dark:text-dark-text">
                                {summary.roi}%
                            </div>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted mt-1">
                                Volume: {formatCurrency(summary.volume)}
                            </div>
                        </div>
                    </div>

                    <!-- Best/Worst Trades -->
                    {#if summary.bestTrade || summary.worstTrade}
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            {#if summary.bestTrade}
                                <div class="card p-4">
                                    <div class="text-sm text-light-text-muted dark:text-dark-text-muted mb-2">Best Trade</div>
                                    <div class="text-lg font-bold text-green-500">
                                        {formatCurrency(summary.bestTrade.pnl)}
                                    </div>
                                    <div class="text-sm text-light-text-muted dark:text-dark-text-muted mt-1">
                                        {summary.bestTrade.symbol}
                                    </div>
                                </div>
                            {/if}
                            {#if summary.worstTrade}
                                <div class="card p-4">
                                    <div class="text-sm text-light-text-muted dark:text-dark-text-muted mb-2">Worst Trade</div>
                                    <div class="text-lg font-bold text-red-500">
                                        {formatCurrency(summary.worstTrade.pnl)}
                                    </div>
                                    <div class="text-sm text-light-text-muted dark:text-dark-text-muted mt-1">
                                        {summary.worstTrade.symbol}
                                    </div>
                                </div>
                            {/if}
                        </div>
                    {/if}
                </div>

                <!-- Trade Tables -->
                <div class="px-8 pb-6">
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
                                on:delete={handleDelete}
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
                                on:delete={handleDelete}
                            />
                        </div>
                    {/if}

                    {#if transactions?.length > 0}
                        <div>
                            <h3 class="text-sm font-medium mb-2 text-light-text-muted dark:text-dark-text-muted">
                                Transactions
                            </h3>
                            <TransactionTable
                                {transactions}
                                isInModal={true}
                                readOnly={false}
                                hideEmptyState={true}
                                on:edit={handleEditTransaction}
                                on:delete={handleDelete}
                            />
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </div>
{/if}

<!-- Modals -->
<TradeViewModal
    bind:show={showViewModal}
    trade={selectedTrade}
    on:close={() => {
        showViewModal = false;
        selectedTrade = null;
    }}
/>

<TradeModal
    bind:show={showEditModal}
    trade={selectedTrade}
    on:tradeUpdated={() => {
        showEditModal = false;
        selectedTrade = null;
        dispatch('refresh');
    }}
/>

<TransactionModal
    show={showTransactionModal}
    transaction={selectedTransaction}
    on:close={() => {
        showTransactionModal = false;
        selectedTransaction = null;
    }}
    on:submit={() => {
        showTransactionModal = false;
        selectedTransaction = null;
        dispatch('refresh');
    }}
/>

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirmModal}
    <Modal
        show={showDeleteConfirmModal}
        title="Confirm Delete"
        on:close={() => showDeleteConfirmModal = false}
    >
        <div class="p-6">
            <p class="text-light-text dark:text-dark-text">
                {#if deleteContext?.type === 'selected'}
                    Are you sure you want to delete {deleteContext.items.length} selected items?
                {:else}
                    Are you sure you want to delete this item?
                {/if}
            </p>
            <div class="flex justify-end gap-4 mt-6">
                <Button
                    variant="secondary"
                    size="sm"
                    on:click={() => showDeleteConfirmModal = false}
                >
                    Cancel
                </Button>
                <Button
                    variant="danger"
                    size="sm"
                    on:click={confirmDelete}
                >
                    Delete
                </Button>
            </div>
        </div>
    </Modal>
{/if}

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-0 rounded-xl shadow-lg;
    }
</style>
