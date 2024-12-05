<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { transactionStore } from '$lib/stores/transactionStore';
  import { formatCurrency } from '$lib/utils/formatters';
  import Loading from '../common/Loading.svelte';

  const dispatch = createEventDispatcher();
  export let accountId;
  let unsubscribe;

  let sortField = 'date';
  let sortDirection = 'desc';

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

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function getTypeClass(type) {
    return type === 'deposit' ? 'text-green-500' : 'text-red-500';
  }

  function getSortIcon(field) {
    if (sortField !== field) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  }

  function handleSort(field) {
    if (sortField === field) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortField = field;
      sortDirection = 'desc';
    }
  }

  $: sortedTransactions = [...(transactions || [])].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    // Handle special cases
    if (sortField === 'amount') {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    } else if (sortField === 'date') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  function handleEdit(transaction) {
    dispatch('edit', transaction);
  }

  async function handleDelete(transactionId) {
    if (confirm('Are you sure you want to delete this transaction?')) {
      try {
        await transactionStore.deleteTransaction(transactionId);
        await transactionStore.fetchTransactions(accountId);
      } catch (err) {
        console.error('Error deleting transaction:', err);
      }
    }
  }
</script>

<div class="overflow-x-auto">
  {#if loading}
    <Loading />
  {:else if error}
    <div class="text-red-500">{error}</div>
  {:else if !transactions || transactions.length === 0}
    <div class="text-center text-light-text-muted dark:text-dark-text-muted py-8">
      No transactions found
    </div>
  {:else}
    <table class="w-full">
      <thead>
        <tr class="border-b border-light-border dark:border-dark-border">
          <th class="text-left py-2 px-4 font-medium text-light-text-muted dark:text-dark-text-muted">
            <button class="flex items-center gap-1 hover:text-theme-500" on:click={() => handleSort('type')}>
              Type
              <span class="text-xs">{getSortIcon('type')}</span>
            </button>
          </th>
          <th class="text-right py-2 px-4 font-medium text-light-text-muted dark:text-dark-text-muted">
            <button class="flex items-center gap-1 hover:text-theme-500 ml-auto" on:click={() => handleSort('amount')}>
              Amount
              <span class="text-xs">{getSortIcon('amount')}</span>
            </button>
          </th>
          <th class="text-left py-2 px-4 font-medium text-light-text-muted dark:text-dark-text-muted">
            <button class="flex items-center gap-1 hover:text-theme-500" on:click={() => handleSort('date')}>
              Date
              <span class="text-xs">{getSortIcon('date')}</span>
            </button>
          </th>
          <th class="text-right py-2 px-4 font-medium text-light-text-muted dark:text-dark-text-muted">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-light-border dark:divide-dark-border">
        {#each sortedTransactions as transaction (transaction._id)}
          <tr class="hover:bg-light-hover dark:hover:bg-dark-hover transition-colors duration-200">
            <td class="py-2 px-4">
              <span class="capitalize {getTypeClass(transaction.type)}">{transaction.type}</span>
            </td>
            <td class="py-2 px-4 text-right">
              <span class="{getTypeClass(transaction.type)}">
                ${transaction.amount?.toLocaleString() || '0'}
              </span>
            </td>
            <td class="py-2 px-4 text-light-text-muted dark:text-dark-text">
              {formatDate(transaction.date)}
            </td>
            <td class="py-2 px-4">
              <div class="flex justify-end gap-2">
                <button 
                  class="icon-button text-theme-500 hover:text-theme-600"
                  on:click={() => handleEdit(transaction)}
                  title="Edit transaction"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
                <button 
                  class="icon-button text-red-500 hover:text-red-600"
                  on:click={() => handleDelete(transaction._id)}
                  title="Delete transaction"
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
  {/if}
</div>

<style>
  .icon-button {
    @apply p-1 rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover transition-colors duration-200;
  }
</style>
