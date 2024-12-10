<script>
    import { createEventDispatcher } from "svelte";
    import { fade, fly } from "svelte/transition";
    import Button from "../common/Button.svelte";
    import TradeTable from "../trades/TradeTable.svelte";
    import TransactionTable from "../transactions/TransactionTable.svelte";
    import TransactionModal from "../transactions/TransactionModal.svelte";
    import { transactionStore } from '$lib/stores/transactionStore';
    import Loading from '$lib/components/common/Loading.svelte';

    const dispatch = createEventDispatcher();

    export let show = false;
    export let trades = [];
    export let transactions = [];
    export let date = "";
    export let displayDate = "";
    export let accountId;

    let showTransactionModal = false;
    let selectedTransaction = null;
    let loading = false;
    let error = null;

    $: if (show && accountId) {
        loadTransactions();
    }

    async function loadTransactions() {
        loading = true;
        error = null;
        try {
            await transactionStore.fetchTransactions(accountId);
            // Filter transactions for the selected date
            const selectedDate = new Date(date);
            selectedDate.setHours(0, 0, 0, 0);
            const nextDay = new Date(selectedDate);
            nextDay.setDate(nextDay.getDate() + 1);
            
            transactions = $transactionStore.transactions.filter(t => {
                const transDate = new Date(t.date);
                return transDate >= selectedDate && transDate < nextDay;
            });
        } catch (err) {
            error = err.message;
        } finally {
            loading = false;
        }
    }

    function close() {
        show = false;
        dispatch('close');
        transactions = [];
    }

    function handleNewTrade() {
        // Format date for date input (YYYY-MM-DD)
        const formattedDate = new Date(date);
        formattedDate.setHours(12, 0, 0, 0); // Set to start of day
        dispatch("newTrade", formattedDate.toISOString().slice(0, 10));
        close();
    }

    function formatDate(dateStr) {
        const options = {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        };
        return new Date(dateStr).toLocaleString(undefined, options);
    }

    function handleEditTransaction(event) {
        selectedTransaction = event.detail;
        showTransactionModal = true;
    }

    function handleTransactionSubmit(event) {
        dispatch("editTransaction", event.detail);
        showTransactionModal = false;
    }

    function handleEdit(transaction) {
        dispatch('edit', transaction);
    }

    function handleDelete(transactionId) {
        dispatch('delete', transactionId);
    }

    $: openTrades = trades.filter((trade) => trade.status === "OPEN");
    $: closedTrades = trades.filter((trade) => trade.status === "CLOSED");
</script>

{#if show}
    <div
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        transition:fade={{ duration: 150 }}
    >
        <div class="card w-full max-w-4xl mx-auto relative transform ease-out">
            <!-- Header -->
            <div
                class="px-8 py-5 border-b border-light-border dark:border-dark-border flex justify-between items-center sticky top-0 bg-light-card dark:bg-dark-card rounded-t-xl backdrop-blur-lg bg-opacity-90 dark:bg-opacity-90 z-10"
            >
                <h2
                    class="text-2xl font-bold bg-gradient-purple bg-clip-text text-transparent"
                >
                    {displayDate || formatDate(date)}
                </h2>
                <div class="flex items-center gap-4">
                    <Button variant="primary" on:click={handleNewTrade}>
                        <svg
                            class="w-5 h-5 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 4v16m8-8H4"
                            />
                        </svg>
                        New Trade
                    </Button>
                    <button
                        class="p-2 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover transition-all duration-200"
                        on:click={close}
                    >
                        <svg
                            class="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Content -->
            <div class="px-8 py-6 max-h-[calc(100vh-16rem)] overflow-y-auto">
                {#if openTrades.length > 0}
                    <div class="mb-6">
                        <h3
                            class="text-lg font-semibold mb-3 text-light-text dark:text-dark-text"
                        >
                            Open Trades
                        </h3>
                        <TradeTable
                            trades={openTrades}
                            type="open"
                            on:view
                            on:edit
                            on:delete
                            on:favorite
                            on:disable
                        />
                    </div>
                {/if}

                {#if closedTrades.length > 0}
                    <div class="mb-6">
                        <h3
                            class="text-lg font-semibold mb-3 text-light-text dark:text-dark-text"
                        >
                            Closed Trades
                        </h3>
                        <TradeTable
                            trades={closedTrades}
                            type="closed"
                            on:view
                            on:edit
                            on:delete
                            on:favorite
                            on:disable
                        />
                    </div>
                {/if}

                {#if loading}
                    <Loading message="Loading Transactions..." overlay={true} />
                {:else if error}
                    <div class="text-red-500">{error}</div>
                {:else}
                    <div class="mb-6">
                        <h3 class="text-lg font-semibold mb-3 text-light-text dark:text-dark-text">
                            Transactions
                        </h3>
                        <TransactionTable 
                            accountId={accountId} 
                            transactions={transactions} 
                            readOnly={false}
                            on:edit={handleEdit}
                            on:delete={handleDelete}
                        />
                    </div>
                {/if}

                {#if trades.length === 0 && transactions?.length === 0}
                    <div
                        class="text-center py-8 text-light-text-muted dark:text-dark-text-muted"
                    >
                        No trades or transactions found for this day
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}

<TransactionModal
    show={showTransactionModal}
    transaction={selectedTransaction}
    on:submit={handleTransactionSubmit}
    on:close={() => (showTransactionModal = false)}
/>

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl shadow-xl transition-colors duration-200;
    }
</style>
