<!-- src/lib/components/accounts/AccountManager.svelte -->
<script>
    import { createEventDispatcher } from 'svelte';
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
        <div class="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-2 rounded text-sm">
            {error}
            <button 
                class="ml-2 text-red-500 hover:text-red-400"
                on:click={() => error = ''}
            >
                <i class="fas fa-times"></i>
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
                <div class="flex items-center justify-between px-4 py-2 hover:bg-slate-600">
                    <button
                        class="flex-grow text-left text-sm text-slate-300 hover:text-white"
                        class:font-bold={$accountStore.currentAccount?._id === account._id}
                        on:click={() => {
                            accountStore.setCurrentAccount(account._id);
                            dispatch('close');
                        }}
                    >
                        {account.name}
                    </button>
                    <div class="flex items-center ml-2">
                        <button
                            class="text-blue-400 hover:text-blue-300 p-2 rounded-lg hover:bg-slate-500 flex items-center"
                            on:click|stopPropagation={() => startEditAccount(account)}
                            title="Edit Account"
                        >
                            <i class="fas fa-pencil text-lg"></i>
                        </button>
                        <button
                            class="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-slate-500 flex items-center"
                            on:click|stopPropagation={() => handleDeleteAccount(account._id)}
                            title="Delete Account"
                        >
                            <i class="fas fa-trash-alt text-lg"></i>
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    {:else}
        <div class="px-4 py-2 text-sm text-slate-400">
            No accounts yet
        </div>
    {/if}

    <!-- Add Account Button -->
    <div class="border-t border-slate-600 px-4 py-2">
        <button
            class="w-full text-left px-2 py-1 text-sm text-blue-400 hover:bg-slate-600 rounded-lg flex items-center"
            on:click|stopPropagation={() => showNewAccountModal = true}
        >
            <i class="fas fa-plus-circle mr-2"></i>
            Add Account
        </button>
    </div>
</div>

<!-- New Account Modal -->
{#if showNewAccountModal}
    <div class="fixed inset-0 bg-black bg-opacity-70 z-[100] flex items-center justify-center">
        <div class="bg-slate-800 rounded-lg w-full max-w-md mx-4 p-6">
            <h2 class="text-2xl font-bold gradient-text mb-4">New Account</h2>
            <form on:submit|preventDefault={handleCreateAccount} class="space-y-4">
                <Input
                    label="Account Name"
                    type="text"
                    bind:value={newAccountName}
                    required
                    placeholder="e.g., Binance Spot"
                />
                <div class="flex justify-end gap-4">
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
                    <Button type="submit" variant="primary">
                        Create Account
                    </Button>
                </div>
            </form>
        </div>
    </div>
{/if}

<!-- Edit Account Modal -->
{#if showEditAccountModal && editingAccount}
    <div class="fixed inset-0 bg-black bg-opacity-70 z-[100] flex items-center justify-center">
        <div class="bg-slate-800 rounded-lg w-full max-w-md mx-4 p-6">
            <h2 class="text-2xl font-bold gradient-text mb-4">Edit Account</h2>
            <form on:submit|preventDefault={handleUpdateAccount} class="space-y-4">
                <Input
                    label="Account Name"
                    type="text"
                    bind:value={editingAccount.name}
                    required
                    placeholder="e.g., Binance Spot"
                />
                <div class="flex justify-end gap-4">
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
                    <Button type="submit" variant="primary">
                        Save Changes
                    </Button>
                </div>
            </form>
        </div>
    </div>
{/if}

<style>
    .gradient-text {
        background: linear-gradient(45deg, #3b82f6, #8b5cf6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
</style>
