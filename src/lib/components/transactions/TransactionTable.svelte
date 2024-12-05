<script>
  import { onMount, onDestroy } from 'svelte';
  import { transactionStore } from '$lib/stores/transactionStore';
  import Loading from '../common/Loading.svelte';

  export let accountId;
  let unsubscribe;

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
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
