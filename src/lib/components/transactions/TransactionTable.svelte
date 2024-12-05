<script>
  import { onMount, onDestroy } from 'svelte';
  import { transactionStore } from '$lib/stores/transactionStore';
  import { accountStore } from '$lib/stores/accountStore';
  import Loading from '../common/Loading.svelte';
  import TransactionModal from './TransactionModal.svelte';

  export let accountId;
  let unsubscribe;
  let showEditModal = false;
  let selectedTransaction = null;

  onMount(() => {
    if (accountId) {
      transactionStore.fetchTransactions(accountId);
    }
    unsubscribe = transactionStore.subscribe(() => {});
  });

  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe();
    }
    transactionStore.reset();
  });

  $: if (accountId) {
    transactionStore.fetchTransactions(accountId);
  }

  $: ({ transactions, loading, error } = $transactionStore);

  function formatDate(dateString) {
    return new Date(dateString).toLocaleString();
  }

  async function handleDelete(transaction) {
    if (confirm('Are you sure you want to delete this transaction?')) {
      try {
        await transactionStore.deleteTransaction(transaction._id);
        await Promise.all([
          transactionStore.fetchTransactions(accountId),
          accountStore.setCurrentAccount(accountId)
        ]);
      } catch (err) {
        console.error('Error deleting transaction:', err);
      }
    }
  }

  function handleEdit(transaction) {
    selectedTransaction = transaction;
    showEditModal = true;
  }

  async function handleSubmit(event) {
    try {
      await transactionStore.updateTransaction(selectedTransaction._id, event.detail);
      await Promise.all([
        transactionStore.fetchTransactions(accountId),
        accountStore.setCurrentAccount(accountId)
      ]);
      showEditModal = false;
      selectedTransaction = null;
    } catch (err) {
      console.error('Error updating transaction:', err);
    }
  }

  function handleClose() {
    showEditModal = false;
    selectedTransaction = null;
  }
</script>

<div class="space-y-4">
  {#if loading}
    <Loading />
  {:else if error}
    <div class="text-red-500">{error}</div>
  {:else if !transactions || transactions.length === 0}
    <div class="text-center text-light-text-muted dark:text-dark-text-muted py-8">
      No transactions found
    </div>
  {:else}
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-light-border dark:divide-dark-border">
        <thead>
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider">
              Type
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider">
              Amount
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider">
              Date
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-light-border dark:divide-dark-border">
          {#each transactions as transaction (transaction._id)}
            <tr class="hover:bg-light-hover dark:hover:bg-dark-hover transition-colors duration-200">
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <span class="capitalize {transaction.type === 'deposit' ? 'text-green-500' : 'text-red-500'}">
                  {transaction.type}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <span class="{transaction.type === 'deposit' ? 'text-green-500' : 'text-red-500'}">
                  ${transaction.amount?.toLocaleString() || '0'}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-light-text-muted dark:text-dark-text-muted">
                {formatDate(transaction.date)}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-right">
                <div class="flex justify-end space-x-2">
                  <button
                    class="p-1.5 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 dark:hover:text-theme-400 hover:bg-light-card dark:hover:bg-dark-card transition-colors duration-200"
                    on:click={() => handleEdit(transaction)}
                    title="Edit Transaction"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  <button
                    class="p-1.5 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-red-500 hover:bg-light-card dark:hover:bg-dark-card transition-colors duration-200"
                    on:click={() => handleDelete(transaction)}
                    title="Delete Transaction"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<TransactionModal
  bind:show={showEditModal}
  transaction={selectedTransaction}
  on:submit={handleSubmit}
  on:close={handleClose}
/>
