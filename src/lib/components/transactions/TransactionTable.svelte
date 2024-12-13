<script>
  import { createEventDispatcher } from 'svelte';
  import { transactionStore } from '$lib/stores/transactionStore';
  import { formatCurrency } from '$lib/utils/formatters';
  import Loading from '../common/Loading.svelte';
  import { transactionCacheStore } from '$lib/stores/transactionCache';
  import Modal from '../common/Modal.svelte';

  const dispatch = createEventDispatcher();
  export let accountId;
  export let transactions = null; 
  export let readOnly = false; 

  let sortField = 'date';
  let sortDirection = 'desc';
  let loading = false;
  let error = null;
  let selectedTransactions = [];
  let showModal = false;
  let deleteAll = false;
  let currentPage = 1;
  let itemsPerPage = 10;

  $: storeTransactions = transactionCacheStore.getCache(accountId) || $transactionStore.transactions;
  $: displayTransactions = transactions || storeTransactions;
  $: error = transactions === null && $transactionStore.error;

  function formatDate(dateStr) {
    const options = { 
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateStr).toLocaleString(undefined, options); 
  }

  function getTypeClass(type) {
    return type === 'deposit'? 'text-green-500' : 'text-red-500';
  }

  function getSortIcon(field) {
    if (sortField !== field) return '';
    return sortDirection === 'asc'? '↑' : '↓';
  }

  function handleSort(field) {
    if (sortField === field) {
      sortDirection = sortDirection === 'asc'? 'desc' : 'asc';
    } else {
      sortField = field;
      sortDirection = 'desc';
    }
  }

  $: sortedTransactions = Array.isArray(displayTransactions) ? [...displayTransactions].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    if (sortField === 'amount') {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    } else if (sortField === 'date') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    if (aValue < bValue) return sortDirection === 'asc'? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc'? 1 : -1;
    return 0;
  }) : [];

  $: totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);
  $: paginatedTransactions = sortedTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  function changePage(page) {
    if (page >= 1 && page <= totalPages) {
      currentPage = page;
    }
  }

  function handleEdit(transaction) {
    dispatch('edit', transaction);
  }

  async function handleDelete(transactionId) {
    if (confirm('Are you sure you want to delete this transaction?')) {
      try {
        await transactionStore.deleteTransaction(transactionId);
        if (!transactions) { 
          await transactionStore.fetchTransactions(accountId);
          transactionCacheStore.setCache(accountId, $transactionStore.transactions);
        }
      } catch (err) {
        console.error('Error deleting transaction:', err);
      }
    }
  }

  function handleSelect(transactionId) {
    if (selectedTransactions.includes(transactionId)) {
      selectedTransactions = selectedTransactions.filter(id => id !== transactionId);
    } else {
      selectedTransactions = [...selectedTransactions, transactionId];
    }
  }

  async function handleDeleteSelected() {
    deleteAll = false;
    showModal = true;
  }

  async function handleDeleteAll() {
    deleteAll = true;
    showModal = true;
  }

  async function confirmDelete() {
    showModal = false;
    loading = true;
    try {
      if (deleteAll) {
        for (const transaction of displayTransactions) {
          await transactionStore.deleteTransaction(transaction._id);
        }
      } else {
        for (const transactionId of selectedTransactions) {
          await transactionStore.deleteTransaction(transactionId);
        }
      }
      if (!transactions) { 
        await transactionStore.fetchTransactions(accountId);
        transactionCacheStore.setCache(accountId, $transactionStore.transactions);
      }
      selectedTransactions = [];
    } catch (err) {
      console.error('Error deleting transactions:', err);
    } finally {
      loading = false;
    }
  }
</script>

<div class="overflow-x-auto">
  {#if loading}
    <Loading message="Loading..." overlay={true} />
  {:else if error}
    <div class="text-red-500">{error}</div>
  {:else if !displayTransactions || displayTransactions.length === 0}
    <div class="card p-8 text-center">
      <div class="flex flex-col items-center justify-center space-y-4">
        <svg class="w-16 h-16 text-light-text-muted dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        <h2 class="text-2xl font-bold text-light-text dark:text-dark-text">No transactions found</h2>
        <p class="text-light-text-muted dark:text-dark-text-muted max-w-md">
          Start managing your funds by using the "Deposit" or "Withdraw" buttons above.
        </p>
      </div>
    </div>
  {:else}
    <table class="w-full">
      <thead>
        <tr class="border-b border-light-border dark:border-dark-border">
          <th class="w-8 text-left py-2 px-4 font-medium text-light-text-muted dark:text-dark-text-muted">
            <input 
              type="checkbox"
              class="custom-checkbox"
              on:click={() => selectedTransactions = selectedTransactions.length === displayTransactions.length ? [] : displayTransactions.map(t => t._id)}
              checked={selectedTransactions.length === displayTransactions.length}
            />
          </th>
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
          <th class="text-left py-2 px-4 font-medium text-light-text-muted dark:text-dark-text-muted">
            <button class="flex items-center gap-1 hover:text-theme-500" on:click={() => handleSort('note')}>
              Note
              <span class="text-xs">{getSortIcon('note')}</span>
            </button>
          </th>
          {#if !readOnly}
            <th class="text-right py-2 px-4 font-medium text-light-text-muted dark:text-dark-text-muted">Actions</th>
          {/if}
        </tr>
      </thead>
      <tbody class="divide-y divide-light-border dark:divide-dark-border">
        {#each paginatedTransactions as transaction (transaction._id)}
          <tr class="hover:bg-light-hover dark:hover:bg-dark-hover ">
            <td class="w-8 py-2 px-4 text-right">
              <input 
                type="checkbox"
                class="custom-checkbox"
                on:click={() => handleSelect(transaction._id)}
                checked={selectedTransactions.includes(transaction._id)}
              />
            </td>
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
            <td class="py-2 px-4 text-light-text-muted dark:text-dark-text-muted">
              {transaction.note || ''}
            </td>
            {#if !readOnly}
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
            {/if}
          </tr>
        {/each}
      </tbody>
    </table>
    {#if !readOnly}
      <div class="flex justify-between items-center p-2 px-4 mt-2">
        <div class="flex gap-2">
          {#if selectedTransactions.length > 0}
            <button 
              class="btn btn-primary flex items-center gap-1"
              on:click={handleDeleteSelected}
              title="Delete selected transactions"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
              Delete Selected
            </button>
          {/if}
          <button 
            class="btn btn-secondary flex items-center gap-1"
            on:click={handleDeleteAll}
            title="Delete all transactions"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            Delete All
          </button>
        </div>
        <!-- Pagination Controls -->
        {#if totalPages > 1}
        <div class="flex items-center text-xs gap-2">
            <button class="pagination-btn" on:click={() => changePage(currentPage - 1)} disabled={currentPage === 1}>
                &larr;
            </button>
            <span class="text-light-text-muted dark:text-dark-text-muted">Page {currentPage} of {totalPages}</span>
            <button class="pagination-btn" on:click={() => changePage(currentPage + 1)} disabled={currentPage === totalPages}>
                &rarr;
            </button>
        </div>
        {/if}
      </div>
    {/if}
  {/if}
</div>

<Modal bind:show={showModal} title="Confirm Deletion">
  <p>Are you sure you want to {deleteAll ? 'delete all transactions' : 'delete the selected transactions'}?</p>
  <div class="flex justify-end gap-2 mt-4">
    <button class="btn btn-secondary" on:click={() => showModal = false}>Cancel</button>
    <button class="btn btn-primary" on:click={confirmDelete}>Confirm</button>
  </div>
</Modal>

<style lang="postcss">
.icon-button {
    @apply p-1 rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover ;
  }

.card {
    @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-lg ;
  }

.btn {
    @apply px-2 py-1 text-xs rounded-lg font-medium;
  }

.btn-primary {
    @apply bg-theme-500 text-white hover:bg-theme-600;
  }

.btn-secondary {
    @apply bg-gray-500 text-white hover:bg-gray-600;
  }

  .custom-checkbox {
        @apply appearance-none h-4 w-4 border border-gray-300 rounded-sm bg-white checked:bg-theme-500 checked:border-transparent focus:outline-none transition duration-200 align-top bg-no-repeat bg-center bg-contain float-left mr-2 cursor-pointer;
    }

  .btn-secondary:disabled {
    @apply bg-gray-300 text-gray-500 cursor-not-allowed;
  }

  .btn-secondary svg {
    @apply ml-2;
  }

  .btn-secondary svg:first-child {
    @apply ml-0 mr-2;
  }

  .pagination-btn {
    @apply w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:cursor-not-allowed;
  }
</style>
