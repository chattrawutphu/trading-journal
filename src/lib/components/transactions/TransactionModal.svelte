<script>
    import { createEventDispatcher } from "svelte";
    import Button from "../common/Button.svelte";
    import Input from "../common/Input.svelte";
    import { transactionStore } from "$lib/stores/transactionStore";
    import { accountStore } from '$lib/stores/accountStore';
    import { transactionDate } from '$lib/stores/transactionDateStore';
    import { loadingStore } from '$lib/stores/loadingStore';
    import { goto } from '$app/navigation';
    import { subscriptionStore } from '$lib/stores/subscriptionStore';
    import { SUBSCRIPTION_TYPES } from '$lib/config/subscription';
    import LimitReachedModal from '../common/LimitReachedModal.svelte';

    const dispatch = createEventDispatcher();

    export let show = false;
    export let transaction = null;
    export let accountId;
    export let type = 'deposit';
    export let initialDate = null;

    let showLimitWarning = false;
    let showLimitError = false;
    let dailyTransactionCount = 0;
    let loadingCount = false;

    // เพิ่มตัวแปรเพื่อเก็บค่าเริ่มต้น
    let initialFormData = null;

    let error = null;

    // สร้างฟังก์ชันสำหรับสร้างฟอร์มเริ่มต้น
    function createInitialForm() {
        return {
            date: initialDate ? formatDateTimeLocal(initialDate) : getCurrentDateTime(),
            type: type,
            amount: '',
            note: '',
        };
    }

    let form = createInitialForm();

    // อัพเดทฟอร์มเมื่อมี transaction (เฉพาะครั้งแรก)
    $: if (transaction && !initialFormData) {
        initialFormData = {
            ...transaction,
            date: formatDateTimeLocal(transaction.date),
            type: transaction.type || type,
            amount: transaction.amount || '',
            note: transaction.note || '',
        };
        form = { ...initialFormData };
    }

    // รีเซ็ตฟอร์มเมื่อ type หรือ initialDate เปลี่ยน (เฉพาะกรณีสร้างใหม่)
    $: {
        if (!transaction && !initialFormData) {
            form.type = type;
            form.date = initialDate ? formatDateTimeLocal(initialDate) : getCurrentDateTime();
        }
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

    // เพิ่มฟังก์ชันสำหรับนับจำนวน transactions ในวันนั้น
    async function countDailyTransactions(date) {
        if (!accountId || loadingCount) return 0;
        
        try {
            loadingCount = true;
            const transactions = await transactionStore.getTransactions(accountId);
            const targetDate = new Date(date).toISOString().split('T')[0];
            
            const count = transactions.filter(transaction => {
                const transactionDate = new Date(transaction.date).toISOString().split('T')[0];
                return transactionDate === targetDate;
            }).length;
            
            return count;
        } catch (error) {
            console.error('Error counting daily transactions:', error);
            return 0;
        } finally {
            loadingCount = false;
        }
    }

    async function handleSubmit() {
        if (form.amount <= 0) return;

        try {
            loadingStore.set(true);
            
            // เช็ค limit เฉพาะเมื่อสร้าง transaction ใหม่
            if (!transaction && $subscriptionStore.type === SUBSCRIPTION_TYPES.BASIC) {
                const count = await countDailyTransactions(form.date);
                dailyTransactionCount = count;

                if (count >= 4) {
                    showLimitError = true;
                    loadingStore.set(false);
                    return;
                }
                
                if (count >= 3) {
                    showLimitWarning = true;
                    loadingStore.set(false);
                    return;
                }
            }

            await submitTransaction();
        } catch (err) {
            console.error('Error in handleSubmit:', err);
        } finally {
            loadingStore.set(false);
        }
    }

    function handleLimitWarningClose(shouldProceed) {
        showLimitWarning = false;
        if (shouldProceed) {
            submitTransaction();
        }
    }

    // แยกฟังก์ชันสำหรับการ submit transaction
    async function submitTransaction() {
        try {
            error = null;
            const transactionType = form.type === "deposit" ? "deposit" : "withdrawal";
            
            if (transaction) {
                await transactionStore.updateTransaction(transaction._id, {
                    type: transactionType,
                    amount: form.amount,
                    date: new Date(form.date),
                    note: form.note
                });
            } else {
                await transactionStore.createTransaction(
                    accountId,
                    transactionType,
                    form.amount,
                    new Date(form.date),
                    form.note
                );
            }

            transactionDate.set(null);
            await accountStore.setCurrentAccount(accountId);
            await transactionStore.fetchTransactions(accountId);
            
            // รีเซ็ตค่าทั้งหมดก่อนปิด modal
            resetForm();
            transaction = null;
            initialFormData = null;
            showLimitWarning = false;
            showLimitError = false;
            dailyTransactionCount = 0;

            dispatch("close");
            dispatch("transactionUpdated", { accountId });
            
            show = false;
            goto(window.location.pathname);

            // Dispatch events
            window.dispatchEvent(new CustomEvent('transactionupdate'));
            window.dispatchEvent(new CustomEvent('transactionupdated'));
        } catch (err) {
            console.error('Transaction Error:', err);
            error = err.message;
            return;
        }
    }

    function upgradePlan() {
        goto('/settings/subscription');
    }

    // เพิ่มฟังก์ชันสำหรับรีเซ็ตฟอร์ม
    function resetForm() {
        initialFormData = null;
        form = createInitialForm();
        error = null;
    }

    function closeModal() {
        show = false;
        // รีเซ็ตค่าทั้งหมดหลังจากปิด modal
        setTimeout(() => {
            transactionDate.set(null);
            resetForm();
            transaction = null;
            initialFormData = null;
            showLimitWarning = false;
            showLimitError = false;
            dailyTransactionCount = 0;
            dispatch("close");
        }, 150); // รอให้ animation เสร็จก่อนรีเซ็ตค่า
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
                {#if error}
                    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                        <span class="block sm:inline">
                            {#if error.includes('Insufficient balance')}
                                You cannot withdraw more than your current balance
                            {:else}
                                {error}
                            {/if}
                        </span>
                    </div>
                {/if}
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

<!-- Warning Modal (3 transactions) -->
{#if showLimitWarning}
    <LimitReachedModal
        show={showLimitWarning}
        title="Daily Transaction Limit"
        description="You've used 3 of 4 daily transactions. You can delete existing transactions to add new ones, or upgrade to Pro for unlimited transactions."
        upgradeText="Upgrade to Pro"
        cancelText="Cancel"
        showContinueButton={true}
        width="md"
        on:close={() => handleLimitWarningClose(false)}
        on:continue={() => handleLimitWarningClose(true)}
        on:upgrade={upgradePlan}
    />
{/if}

<!-- Error Modal (4 transactions) -->
{#if showLimitError}
    <LimitReachedModal
        show={showLimitError}
        title="Transaction Limit Reached"
        description="Daily limit reached (4/4). Delete existing transactions to add new ones, or upgrade to Pro for unlimited transactions."
        upgradeText="Upgrade to Pro"
        cancelText="Close"
        width="md"
        on:close={() => showLimitError = false}
        on:upgrade={upgradePlan}
    />
{/if}

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-0 rounded-xl shadow-xl;
    }
</style>
