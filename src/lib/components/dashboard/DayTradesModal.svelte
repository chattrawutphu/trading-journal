<script>
    import { createEventDispatcher } from "svelte";
    import { fade, fly } from "svelte/transition";
    import Button from "../common/Button.svelte";
    import TradeTable from "../trades/TradeTable.svelte";
    import TransactionTable from "../transactions/TransactionTable.svelte";
    import TransactionModal from "../transactions/TransactionModal.svelte";
    import { transactionStore } from "$lib/stores/transactionStore";
    import { transactionCacheStore } from "$lib/stores/transactionCache";
    import { accountStore } from '$lib/stores/accountStore';
    import Loading from "$lib/components/common/Loading.svelte";
    import Input from "$lib/components/common/Input.svelte";

    const dispatch = createEventDispatcher();

    export let show = false;
    export let trades = [];
    export let transactions = [];
    export let date = "";
    export let displayDate = "";
    export let accountId;
    export let loading = false; // เพิ่มสถานะ loading

    let showTransactionModal = false;
    let selectedTransaction = null;
    let error = null;

    let transactionAmount = 0;
    let transactionDateInput = new Date().toISOString().split('T')[0];
    let transactionNote = '';
    let showDepositModal = false;
    let showWithdrawModal = false;

    $: if (show && accountId) {
        loadTransactions();
    }

    async function loadTransactions() {
        if ($transactionCacheStore[accountId]) {
            transactions = filterTransactionsByDate($transactionCacheStore[accountId], date);
            return;
        }

        loading = true;
        error = null;

        try {
            await transactionStore.fetchTransactions(accountId);
            transactionCacheStore.setCache(accountId, $transactionStore.transactions);
            transactions = filterTransactionsByDate($transactionStore.transactions, date);
        } catch (err) {
            error = err.message;
        } finally {
            loading = false;
        }
    }

    function filterTransactionsByDate(transactionList, date) {
        if (!Array.isArray(transactionList)) {
            console.error('transactionList is not an array:', transactionList);
            return [];
        }
        return transactionList.filter(transaction => {
            const transactionDate = new Date(transaction.date).toISOString().split('T')[0];
            return transactionDate === date;
        });
    }

    function close() {
        show = false;
        dispatch("close");
        transactions = [];
    }

    function handleNewTrade() {
        const formattedDate = new Date(date).toISOString().slice(0, 10);
        dispatch("newTrade", formattedDate);
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
        dispatch("edit", transaction);
    }

    function handleDelete(transactionId) {
        dispatch("delete", transactionId);
    }

    function handleDeleteConfirm(event) {
        dispatch('deleteConfirm', event.detail);
    }

    async function handleDeposit() {
        if (transactionAmount > 0) {
            try {
                await transactionStore.createTransaction(
                    $accountStore.currentAccount._id,
                    'deposit',
                    transactionAmount,
                    new Date(transactionDateInput),
                    transactionNote
                );
                await accountStore.setCurrentAccount($accountStore.currentAccount._id);
                transactionCacheStore.clearCache($accountStore.currentAccount._id);
                await transactionStore.fetchTransactions($accountStore.currentAccount._id);
                showDepositModal = false;
                transactionAmount = 0;
                transactionDateInput = new Date().toISOString().split('T')[0];
                transactionNote = '';
            } catch (err) {
                console.error(err);
            }
        }
    }

    async function handleWithdraw() {
        if (transactionAmount > 0) {
            try {
                await transactionStore.createTransaction(
                    $accountStore.currentAccount._id,
                    'withdrawal',
                    transactionAmount,
                    new Date(transactionDateInput),
                    transactionNote
                );
                await accountStore.setCurrentAccount($accountStore.currentAccount._id);
                transactionCacheStore.clearCache($accountStore.currentAccount._id);
                await transactionStore.fetchTransactions($accountStore.currentAccount._id);
                showWithdrawModal = false;
                transactionAmount = 0;
                transactionDateInput = new Date().toISOString().split('T')[0];
                transactionNote = '';
            } catch (err) {
                console.error(err);
            }
        }
    }

    $: openTrades = trades.filter((trade) => trade.status === "OPEN");
    $: closedTrades = trades.filter((trade) => trade.status === "CLOSED");
</script>

{#if loading}
    <Loading message="Loading..." overlay={true} />
{:else if error}
    <div class="text-red-500">{error}</div>
{:else if show}
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
                    <Button variant="primary" size="sm" on:click={() => showDepositModal = true}>
                        Deposit
                    </Button>
                    <Button variant="primary" size="sm" on:click={() => showWithdrawModal = true}>
                        Withdraw
                    </Button>
                    <Button variant="primary" size="sm" on:click={handleNewTrade}>
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
                            on:deleteConfirm={handleDeleteConfirm}
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
                            on:deleteConfirm={handleDeleteConfirm}
                        />
                    </div>
                {/if}

                <div class="mb-6">
                    <h3
                        class="text-lg font-semibold mb-3 text-light-text dark:text-dark-text"
                    >
                        Transactions
                    </h3>
                    <TransactionTable
                        {accountId}
                        {transactions}
                        readOnly={false}
                        on:edit={handleEdit}
                        on:delete={handleDelete}
                        on:deleteConfirm={handleDeleteConfirm}
                    />
                </div>

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

<!-- Deposit Modal -->
{#if showDepositModal}
    <div class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
        <div class="card w-full max-w-md mx-auto relative transform ease-out">
            <div class="px-8 py-5 border-b border-light-border dark:border-dark-border flex justify-between items-center sticky top-0 bg-light-card dark:bg-dark-card rounded-t-xl bg-opacity-90 dark:bg-opacity-90 z-10">
                <h2 class="text-2xl font-bold text-light-text dark:text-dark-text">Deposit</h2>
                <button class="p-2 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover transition-all duration-200" on:click={() => showDepositModal = false}>
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div class="px-8 py-6 space-y-4">
                <form on:submit|preventDefault={handleDeposit}>
                    <Input label="Amount" type="number" bind:value={transactionAmount} min="0" step="0.01" placeholder="0.00" />
                    <Input label="Date" type="datetime-local" bind:value={transactionDateInput} />
                    <Input label="Note" type="text" bind:value={transactionNote} placeholder="Add a note..." />
                </form>
            </div>
            <div class="px-8 py-5 border-t border-light-border dark:border-dark-border flex justify-end gap-4 sticky bottom-0 bg-light-card dark:bg-dark-card rounded-b-xl bg-opacity-90 dark:bg-opacity-90 z-10">
                <Button type="button" variant="secondary" on:click={() => showDepositModal = false}>
                    Cancel
                </Button>
                <Button type="submit" variant="primary" on:click={handleDeposit}>
                    Deposit
                </Button>
            </div>
        </div>
    </div>
{/if}

<!-- Withdraw Modal -->
{#if showWithdrawModal}
    <div class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
        <div class="card w-full max-w-md mx-auto relative transform ease-out">
            <div class="px-8 py-5 border-b border-light-border dark:border-dark-border flex justify-between items-center sticky top-0 bg-light-card dark:bg-dark-card rounded-t-xl bg-opacity-90 dark:bg-opacity-90 z-10">
                <h2 class="text-2xl font-bold text-light-text dark:text-dark-text">Withdraw</h2>
                <button class="p-2 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover transition-all duration-200" on:click={() => showWithdrawModal = false}>
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div class="px-8 py-6 space-y-4">
                <form on:submit|preventDefault={handleWithdraw}>
                    <Input label="Amount" type="number" bind:value={transactionAmount} min="0" step="0.01" placeholder="0.00" />
                    <Input label="Date" type="datetime-local" bind:value={transactionDateInput} />
                    <Input label="Note" type="text" bind:value={transactionNote} placeholder="Add a note..." />
                </form>
            </div>
            <div class="px-8 py-5 border-t border-light-border dark:border-dark-border flex justify-end gap-4 sticky bottom-0 bg-light-card dark:bg-dark-card rounded-b-xl bg-opacity-90 dark:bg-opacity-90 z-10">
                <Button type="button" variant="secondary" on:click={() => showWithdrawModal = false}>
                    Cancel
                </Button>
                <Button type="submit" variant="primary" on:click={handleWithdraw}>
                    Withdraw
                </Button>
            </div>
        </div>
    </div>
{/if}

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl shadow-xl;
    }
</style>
