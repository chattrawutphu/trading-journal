<script>
    import { fade, fly } from 'svelte/transition';
    import { createEventDispatcher } from 'svelte';
    import { accountStore } from '$lib/stores/accountStore';
    import Button from '../common/Button.svelte';
    import Input from '../common/Input.svelte';

    const dispatch = createEventDispatcher();

    export let show = false;
    
    let newAccountName = '';
    let newAccountBalance = 0;
    let error = '';

    async function handleCreateAccount() {
        if (newAccountName.trim()) {
            try {
                error = '';
                await accountStore.createAccount({ 
                    name: newAccountName,
                    balance: parseFloat(newAccountBalance) || 0
                });
                newAccountName = '';
                newAccountBalance = 0;
                dispatch('close');
            } catch (err) {
                error = err.message;
            }
        }
    }

    function handleClose() {
        newAccountName = '';
        newAccountBalance = 0;
        dispatch('close');
    }
</script>

{#if show}
    <div 
        class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
        transition:fade={{ duration: 150 }}>
        <div 
            class="card w-full max-w-md mx-auto relative transform ease-out"
        >
            <!-- Header -->
            <div class="px-8 py-5 border-b border-light-border dark:border-0 flex justify-between items-center sticky top-0 bg-light-card dark:bg-dark-card rounded-t-xl bg-opacity-90 dark:bg-opacity-90 z-10">
                <h2 class="text-2xl font-bold bg-gradient-purple bg-clip-text text-transparent">New Account</h2>
                <button 
                    class="p-2 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover "
                    on:click={handleClose}
                >
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <!-- Error Message -->
            {#if error}
                <div class="px-8 pt-6">
                    <div class="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
                        <div class="flex">
                            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                            </svg>
                            <span>{error}</span>
                        </div>
                    </div>
                </div>
            {/if}

            <!-- Content -->
            <div class="px-8 py-6 space-y-4">
                <form on:submit|preventDefault={handleCreateAccount}>
                    <Input
                        label="Account Name"
                        type="text"
                        bind:value={newAccountName}
                        required
                        placeholder="e.g., Binance Spot"
                    />
                    <Input
                        label="Initial Balance"
                        type="number"
                        bind:value={newAccountBalance}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                    />
                </form>
            </div>

            <!-- Footer -->
            <div class="px-8 py-5 border-t border-light-border dark:border-0 flex justify-end gap-4 sticky bottom-0 bg-light-card dark:bg-dark-card rounded-b-xl bg-opacity-90 dark:bg-opacity-90 z-10">
                <Button 
                    type="button" 
                    variant="secondary" 
                    on:click={handleClose}
                >
                    Cancel
                </Button>
                <Button type="submit" variant="primary" on:click={handleCreateAccount}>
                    Create Account
                </Button>
            </div>
        </div>
    </div>
{/if}

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-0 rounded-xl shadow-xl ;
    }
</style>
