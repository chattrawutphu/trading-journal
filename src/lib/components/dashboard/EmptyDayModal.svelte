<script>
    import { createEventDispatcher } from 'svelte';
    import { fade, fly } from 'svelte/transition';
    import Button from '../common/Button.svelte';
    import Input from '../common/Input.svelte';
    import { transactionStore } from '$lib/stores/transactionStore';
    import { accountStore } from '$lib/stores/accountStore';
    import { transactionCacheStore } from '$lib/stores/transactionCache';

    const dispatch = createEventDispatcher();

    export let show = false;
    export let date = '';

    // Get current date in YYYY-MM-DD format for max attribute
    const maxDate = new Date().toISOString().slice(0, 10);

    let transactionAmount = 0;
    let transactionDateInput = new Date().toISOString().split('T')[0];
    let transactionNote = '';
    let showDepositModal = false;
    let showWithdrawModal = false;

    function close() {
        show = false;
    }

    function handleNewTrade() {
        // Format date for date input (YYYY-MM-DD)
        const formattedDate = new Date(date);
        formattedDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
        dispatch('newTrade', formattedDate.toISOString().slice(0, 10));
        close();
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
</script>

{#if show}
    <div 
        class="fixed inset-0 bg-black/50  z-50 flex items-center justify-center p-4 "
        transition:fade={{ duration: 150 }}>
        <div 
            class="card w-full max-w-lg mx-auto relative transform  ease-out">
            <!-- Header -->
            <div class="px-8 py-5 border-b border-light-border dark:border-dark-border flex justify-between items-center sticky top-0 bg-light-card dark:bg-dark-card rounded-t-xl backdrop-blur-lg bg-opacity-90 dark:bg-opacity-90 z-10">
                <h2 class="text-2xl font-bold bg-gradient-purple bg-clip-text text-transparent">New Trade</h2>
                <button 
                    class="p-2 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover transition-all duration-200"
                    on:click={close}
                >
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <!-- Content -->
            <div class="px-8 py-6">
                <div class="text-center">
                    <svg on:click={handleNewTrade} class="w-16 h-16 mx-auto mb-4 text-light-text-muted dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                    </svg>
                    <p class="text-light-text-muted dark:text-dark-text mb-6">
                        No trades recorded for this day. Would you like to add one?
                    </p>
                </div>
            </div>
            <div class="px-8 py-6 hidden">
                <Input
                    type="date"
                    label="Entry Date"
                    bind:value={date}
                    required
                    max={maxDate}
                />
            </div>

            <!-- Footer -->
            <div class="px-8 py-5 border-t border-light-border dark:border-dark-border flex justify-between gap-4 sticky bottom-0 bg-light-card dark:bg-dark-card rounded-b-xl backdrop-blur-lg bg-opacity-90 dark:bg-opacity-90 z-10">
                <div>
                    <Button variant="primary" size="sm" on:click={() => showDepositModal = true}>
                        Deposit
                    </Button>
                    <Button variant="primary" size="sm" on:click={() => showWithdrawModal = true}>
                        Withdraw
                    </Button>
                </div>
                <Button variant="primary" size="sm" on:click={handleNewTrade}>
                    Create Trade
                </Button>
            </div>
        </div>
    </div>
{/if}

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
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl shadow-xl ;
    }
</style>
