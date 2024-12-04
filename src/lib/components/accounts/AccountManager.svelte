<script>
    import { createEventDispatcher } from 'svelte';
    import { fade, fly } from 'svelte/transition';
    import { accountStore } from '$lib/stores/accountStore';
    import Button from '../common/Button.svelte';
    import Input from '../common/Input.svelte';
    import Loading from '../common/Loading.svelte';
  
    const dispatch = createEventDispatcher();
  
    let showNewAccountModal = false;
    let showEditAccountModal = false;
    let newAccountName = '';
    let editingAccount = null;
    let error = '';
  
    async function handleCreateAccount() {
      if (newAccountName.trim()) {
        try {
          error = '';
          await accountStore.createAccount({ name: newAccountName });
          newAccountName = '';
          showNewAccountModal = false;
        } catch (err) {
          error = err.message;
        }
      }
    }

    async function handleUpdateAccount() {
      if (editingAccount && editingAccount.name.trim()) {
        try {
          error = '';
          await accountStore.updateAccount(editingAccount._id, { name: editingAccount.name });
          showEditAccountModal = false;
          editingAccount = null;
        } catch (err) {
          error = err.message;
        }
      }
    }

    async function handleDeleteAccount(accountId) {
      if (confirm('Are you sure you want to delete this account? This will delete all trades associated with this account.')) {
        try {
          error = '';
          await accountStore.deleteAccount(accountId);
        } catch (err) {
          error = err.message;
        }
      }
    }

    function startEditAccount(account) {
      editingAccount = { ...account };
      showEditAccountModal = true;
    }
</script>

<div class="space-y-2">
    <!-- Error Message -->
    {#if error}
        <div class="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
            <div class="flex">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                </svg>
                <span>{error}</span>
            </div>
            <button 
                class="float-right text-red-500 hover:text-red-400"
                on:click={() => error = ''}
            >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        </div>
    {/if}

    <!-- Account List -->
    {#if $accountStore.loading}
        <div class="px-4 py-2">
            <Loading size="sm" message="Loading accounts..." />
        </div>
    {:else if $accountStore.accounts.length > 0}
        <div class="py-1">
            {#each $accountStore.accounts as account}
                <div class="group flex items-center justify-between px-4 py-2 hover:bg-light-hover dark:hover:bg-dark-hover transition-colors duration-200">
                    <button
                        class="flex-grow text-left text-sm text-light-text dark:text-dark-text hover:text-theme-500 dark:hover:text-theme-400 transition-colors duration-200"
                        class:font-bold={$accountStore.currentAccount?._id === account._id}
                        on:click={() => {
                            accountStore.setCurrentAccount(account._id);
                            dispatch('close');
                        }}
                    >
                        {account.name}
                    </button>
                    <div class="hidden group-hover:flex items-center ml-2 space-x-1">
                        <button
                            class="p-1.5 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 dark:hover:text-theme-400 hover:bg-light-card dark:hover:bg-dark-card transition-colors duration-200"
                            on:click|stopPropagation={() => startEditAccount(account)}
                            title="Edit Account"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                        </button>
                        <button
                            class="p-1.5 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-red-500 hover:bg-light-card dark:hover:bg-dark-card transition-colors duration-200"
                            on:click|stopPropagation={() => handleDeleteAccount(account._id)}
                            title="Delete Account"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    {:else}
        <div class="px-4 py-2 text-sm text-light-text-muted dark:text-dark-text-muted">
            No accounts yet
        </div>
    {/if}

    <!-- Add Account Button -->
    <div class="border-t border-light-border dark:border-dark-border px-4 py-2">
        <button
            class="w-full text-left px-3 py-2 rounded-lg text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover transition-colors duration-200 flex items-center"
            on:click|stopPropagation={() => showNewAccountModal = true}
        >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Add Account
        </button>
    </div>
</div>

<!-- New Account Modal -->
{#if showNewAccountModal}
    <div 
        class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all duration-100"
        on:click={() => {
            showNewAccountModal = false;
            newAccountName = '';
        }}
        transition:fade={{ duration: 200 }}
    >
        <div 
            class="card w-full max-w-md mx-auto relative transform transition-all duration-100 ease-out"
            on:click|stopPropagation
            in:fly={{ y: 20, duration: 300, delay: 150 }}
            out:fly={{ y: 20, duration: 200 }}
        >
            <!-- Header -->
            <div class="px-8 py-5 border-b border-light-border dark:border-dark-border flex justify-between items-center sticky top-0 bg-light-card dark:bg-dark-card rounded-t-xl backdrop-blur-lg bg-opacity-90 dark:bg-opacity-90 z-10">
                <h2 class="text-2xl font-bold bg-gradient-purple bg-clip-text text-transparent">New Account</h2>
                <button 
                    class="p-2 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover transition-all duration-200"
                    on:click={() => {
                        showNewAccountModal = false;
                        newAccountName = '';
                    }}
                >
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <!-- Content -->
            <div class="px-8 py-6">
                <form on:submit|preventDefault={handleCreateAccount}>
                    <Input
                        label="Account Name"
                        type="text"
                        bind:value={newAccountName}
                        required
                        placeholder="e.g., Binance Spot"
                    />
                </form>
            </div>

            <!-- Footer -->
            <div class="px-8 py-5 border-t border-light-border dark:border-dark-border flex justify-end gap-4 sticky bottom-0 bg-light-card dark:bg-dark-card rounded-b-xl backdrop-blur-lg bg-opacity-90 dark:bg-opacity-90 z-10">
                <Button 
                    type="button" 
                    variant="secondary" 
                    on:click={() => {
                        showNewAccountModal = false;
                        newAccountName = '';
                    }}
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

<!-- Edit Account Modal -->
{#if showEditAccountModal && editingAccount}
    <div 
        class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all duration-100"
        on:click={() => {
            showEditAccountModal = false;
            editingAccount = null;
        }}
        transition:fade={{ duration: 200 }}
    >
        <div 
            class="card w-full max-w-md mx-auto relative transform transition-all duration-100 ease-out"
            on:click|stopPropagation
            in:fly={{ y: 20, duration: 300, delay: 150 }}
            out:fly={{ y: 20, duration: 200 }}
        >
            <!-- Header -->
            <div class="px-8 py-5 border-b border-light-border dark:border-dark-border flex justify-between items-center sticky top-0 bg-light-card dark:bg-dark-card rounded-t-xl backdrop-blur-lg bg-opacity-90 dark:bg-opacity-90 z-10">
                <h2 class="text-2xl font-bold bg-gradient-purple bg-clip-text text-transparent">Edit Account</h2>
                <button 
                    class="p-2 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover transition-all duration-200"
                    on:click={() => {
                        showEditAccountModal = false;
                        editingAccount = null;
                    }}
                >
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <!-- Content -->
            <div class="px-8 py-6">
                <form on:submit|preventDefault={handleUpdateAccount}>
                    <Input
                        label="Account Name"
                        type="text"
                        bind:value={editingAccount.name}
                        required
                        placeholder="e.g., Binance Spot"
                    />
                </form>
            </div>

            <!-- Footer -->
            <div class="px-8 py-5 border-t border-light-border dark:border-dark-border flex justify-end gap-4 sticky bottom-0 bg-light-card dark:bg-dark-card rounded-b-xl backdrop-blur-lg bg-opacity-90 dark:bg-opacity-90 z-10">
                <Button 
                    type="button" 
                    variant="secondary" 
                    on:click={() => {
                        showEditAccountModal = false;
                        editingAccount = null;
                    }}
                >
                    Cancel
                </Button>
                <Button type="submit" variant="primary" on:click={handleUpdateAccount}>
                    Save Changes
                </Button>
            </div>
        </div>
    </div>
{/if}

<style>
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl shadow-xl transition-colors duration-200;
    }
</style>
