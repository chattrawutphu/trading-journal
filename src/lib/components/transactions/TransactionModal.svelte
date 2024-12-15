<script>
    import { createEventDispatcher } from "svelte";
    import Button from "../common/Button.svelte";
    import Input from "../common/Input.svelte";
    import { transactionStore } from "$lib/stores/transactionStore";
    import { accountStore } from '$lib/stores/accountStore';
    import { transactionCacheStore } from "$lib/stores/transactionCache";
    import { transactionDate } from '$lib/stores/transactionDateStore';

    const dispatch = createEventDispatcher();

    export let show = false;
    export let type = "deposit"; // Can be "deposit" or "withdraw"
    export let accountId = null; // Ensure accountId is initialized
    export let transaction = null; // Ensure transaction prop is handled

    console.log("Account ID:", accountId); // Log accountId for debugging

    let transactionAmount = 0;
    let transactionDateInput;

    // Use the store's value for transactionDateInput
    $: transactionDateInput = $transactionDate 
        ? new Date($transactionDate).toLocaleString('sv-SE', { hour12: false }).slice(0, 16) 
        : new Date().toLocaleString('sv-SE', { hour12: false }).slice(0, 16);

    let transactionNote = '';

    if (transaction) {
        transactionAmount = transaction.amount;
        transactionDateInput = new Date(transaction.date).toLocaleString('sv-SE', { hour12: false }).slice(0, 16);
        transactionNote = transaction.note;
    }

    async function handleSubmit() {
        if (transactionAmount > 0) {
            try {
                const transactionType = type === "deposit" ? "deposit" : "withdrawal";
                await transactionStore.createTransaction(
                    accountId, // Use accountId prop
                    transactionType,
                    transactionAmount,
                    new Date(transactionDateInput),
                    transactionNote
                );
                await accountStore.setCurrentAccount(accountId);
                transactionCacheStore.clearCache(accountId);
                await transactionStore.fetchTransactions(accountId);
                dispatch("close");
                dispatch("transactionUpdated", { accountId });
                transactionAmount = 0;
                transactionDateInput = new Date().toLocaleString('sv-SE', { hour12: false }).slice(0, 16); // Reset to current local date and time
                transactionNote = '';
            } catch (err) {
                console.error(err);
            }
        }
    }

    function closeModal() {
        transactionDate.set(null);
        dispatch("close");
    }
</script>

{#if show}
    <div class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
        <div class="card w-full max-w-md mx-auto relative transform ease-out">
            <div class="px-8 py-5 border-b border-light-border dark:border-dark-border flex justify-between items-center sticky top-0 bg-light-card dark:bg-dark-card rounded-t-xl bg-opacity-90 dark:bg-opacity-90 z-10">
                <h2 class="text-2xl font-bold text-light-text dark:text-dark-text">{type === "deposit" ? "Deposit" : "Withdraw"}</h2>
                <button class="p-2 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover transition-all duration-200" on:click={closeModal}>
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div class="px-8 py-6 space-y-4">
                <form on:submit|preventDefault={handleSubmit}>
                    <Input label="Amount" type="number" bind:value={transactionAmount} min="0" step="0.01" placeholder="0.00" />
                    <Input label="Date" type="datetime-local" bind:value={transactionDateInput} max={new Date().toLocaleString('sv-SE', { hour12: false }).slice(0, 16)} />
                    <Input label="Note" type="text" bind:value={transactionNote} placeholder="Add a note..." />
                </form>
            </div>
            <div class="px-8 py-5 border-t border-light-border dark:border-dark-border flex justify-end gap-4 sticky bottom-0 bg-light-card dark:bg-dark-card rounded-b-xl bg-opacity-90 dark:bg-opacity-90 z-10">
                <Button type="button" variant="secondary" on:click={closeModal}>
                    Cancel
                </Button>
                <Button type="submit" variant="primary" on:click={handleSubmit}>
                    {type === "deposit" ? "Deposit" : "Withdraw"}
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
