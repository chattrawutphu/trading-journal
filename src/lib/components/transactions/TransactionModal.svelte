<script>
    import { createEventDispatcher } from "svelte";
    import Button from "../common/Button.svelte";
    import Input from "../common/Input.svelte";
    import { transactionStore } from "$lib/stores/transactionStore";
    import { accountStore } from '$lib/stores/accountStore';
    import { transactionDate } from '$lib/stores/transactionDateStore';
    import { loadingStore } from '$lib/stores/loadingStore';
    import { goto } from '$app/navigation';

    const dispatch = createEventDispatcher();

    export let show = false;
    export let transaction = null;
    export let accountId;
    export let type = 'deposit';

    let form = {
        date: getCurrentDateTime(),
        type: type,
        amount: '',
        note: '',
    };

    // เพิ่ม reactive statement เพื่ออัพเดต form เมื่อ transaction เปลี่ยน
    $: if (transaction) {
        form = {
            ...form,
            ...transaction,
            date: formatDateTimeLocal(transaction.date),
            type: transaction.type || type,
            amount: transaction.amount || '',
            note: transaction.note || '',
        };
    }

    function formatDateTimeLocal(dateInput) {
        let date;
        if (dateInput instanceof Date) {
            date = dateInput;
        } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
            date = new Date(dateInput);
        } else {
            date = new Date();
        }

        if (isNaN(date.getTime())) {
            date = new Date();
        }

        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - (offset * 60 * 1000));
        return localDate.toISOString().slice(0,16);
    }

    function getCurrentDateTime() {
        const now = new Date();
        now.setSeconds(0, 0);
        return now.toLocaleString('sv-SE', { hour12: false }).slice(0, 16);
    }

    async function handleSubmit() {
        if (form.amount > 0) {
            try {
                loadingStore.set(true);

                const transactionType = form.type === "deposit" ? "deposit" : "withdrawal";
                await transactionStore.createTransaction(
                    accountId,
                    transactionType,
                    form.amount,
                    new Date(form.date),
                    form.note
                );

                // เคลียร์ transactionDateStore หลังจากบันทึก transaction
                transactionDate.set(null);
                await accountStore.setCurrentAccount(accountId);
                await transactionStore.fetchTransactions(accountId);
                
                dispatch("close");
                dispatch("transactionUpdated", { accountId });
                
                form.amount = 0;
                form.date = getCurrentDateTime();
                form.note = '';

                // Refresh the current page
                goto(window.location.pathname);
            } catch (err) {
                console.error(err);
            } finally {
                loadingStore.set(false);
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
            <div class="px-8 py-5 border-b border-light-border dark:border-0 flex justify-between items-center sticky top-0 bg-light-card dark:bg-dark-card rounded-t-xl bg-opacity-90 dark:bg-opacity-90 z-10">
                <h2 class="text-2xl font-bold text-light-text dark:text-dark-text">{form.type === "deposit" ? "Deposit" : "Withdraw"}</h2>
                <button class="p-2 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover " on:click={closeModal}>
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div class="px-8 py-6 space-y-4">
                <form on:submit|preventDefault={handleSubmit}>
                    <div class="input-wrapper">
                        <Input
                            label="Amount"
                            type="number"
                            bind:value={form.amount}
                            placeholder="Enter amount"
                        />
                    </div>
                    <div class="input-wrapper">
                        <Input
                            label="Date"
                            type="datetime-local"
                            bind:value={form.date}
                        />
                    </div>
                    <div class="input-wrapper">
                        <Input
                            label="Note"
                            bind:value={form.note}
                            placeholder="Add a note (optional)"
                        />
                    </div>
                </form>
            </div>
            <div class="px-8 py-5 border-t border-light-border dark:border-0 flex justify-end gap-4 sticky bottom-0 bg-light-card dark:bg-dark-card rounded-b-xl bg-opacity-90 dark:bg-opacity-90 z-10">
                <Button type="button" variant="secondary" on:click={closeModal}>
                    Cancel
                </Button>
                <Button type="submit" variant="primary" on:click={handleSubmit}>
                    {form.type === "deposit" ? "Deposit" : "Withdraw"}
                </Button>
            </div>
        </div>
    </div>
{/if}

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-0 rounded-xl shadow-xl;
    }
</style>
