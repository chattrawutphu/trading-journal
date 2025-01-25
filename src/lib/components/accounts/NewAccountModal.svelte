<script>
    import { createEventDispatcher } from 'svelte';
    import { accountStore } from '$lib/stores/accountStore';
    import Modal from '../common/Modal.svelte';
    import Button from '../common/Button.svelte';
    import Toast from '../common/Toast.svelte';

    export let show = false;
    const dispatch = createEventDispatcher();

    let accountName = '';
    let initialBalance = 0;
    let loading = false;
    let error = '';
    
    // เพิ่ม toast state
    let showToast = false;
    let toastMessage = '';
    let toastType = 'success';

    async function handleSubmit() {
        if (!accountName.trim()) {
            error = 'Account name is required';
            return;
        }

        loading = true;
        error = '';

        try {
            await accountStore.createAccount({
                name: accountName,
                initialBalance: parseFloat(initialBalance) || 0
            });

            // แสดง toast แจ้งเตือนสำเร็จ
            toastType = 'success';
            toastMessage = 'Account created successfully!';
            showToast = true;

            // รอ 2 วินาที
            await new Promise(resolve => setTimeout(resolve, 2000));

            // รีเฟรช layout
            dispatch('refreshLayout');
            
            // ปิด modal และ reset form
            show = false;
            accountName = '';
            initialBalance = 0;

        } catch (err) {
            error = err.message;
            toastType = 'error';
            toastMessage = error;
            showToast = true;
        } finally {
            loading = false;
        }
    }

    function handleClose() {
        show = false;
        accountName = '';
        initialBalance = 0;
        error = '';
        dispatch('close');
    }
</script>

<Toast 
    bind:show={showToast}
    message={toastMessage}
    type={toastType}
    duration={3000}
/>

<Modal bind:show on:close={handleClose}>
    <div class="w-full max-w-md mx-auto">
        <!-- Header -->
        <div class="px-8 py-5 border-b border-light-border dark:border-dark-border">
            <h2 class="text-2xl font-bold bg-gradient-purple bg-clip-text text-transparent">
                New Trading Account
            </h2>
        </div>

        <!-- Error Message -->
        {#if error}
            <div class="px-8 pt-6">
                <div class="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg">
                    <div class="flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                        </svg>
                        <span class="text-sm font-medium">{error}</span>
                    </div>
                </div>
            </div>
        {/if}

        <!-- Content -->
        <div class="px-8 py-6">
            <form class="space-y-4" on:submit|preventDefault={handleSubmit}>
                <div class="space-y-4">
                    <div>
                        <label for="accountName" class="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                            Account Name
                        </label>
                        <input
                            id="accountName"
                            type="text"
                            bind:value={accountName}
                            required
                            class="input w-full h-9 text-sm"
                            placeholder="e.g., Binance Spot"
                        />
                    </div>

                    <div>
                        <label for="initialBalance" class="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                            Initial Balance
                        </label>
                        <input
                            id="initialBalance"
                            type="number"
                            bind:value={initialBalance}
                            class="input w-full h-9 text-sm"
                            placeholder="0"
                            step="0.01"
                            min="0"
                        />
                    </div>
                </div>

                <!-- Footer -->
                <div class="pt-4 flex justify-end gap-3">
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        type="button"
                        on:click={handleClose}
                    >
                        Cancel
                    </Button>
                    <Button 
                        variant="primary" 
                        size="sm" 
                        type="submit"
                        loading={loading}
                    >
                        {#if loading}
                            <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                            </svg>
                            Creating...
                        {:else}
                            Create Account
                        {/if}
                    </Button>
                </div>
            </form>
        </div>
    </div>
</Modal>

<style lang="postcss">
    :global(.modal-content) {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-0 rounded-xl shadow-xl;
        width: 100%;
        max-width: 28rem;
    }
</style>
