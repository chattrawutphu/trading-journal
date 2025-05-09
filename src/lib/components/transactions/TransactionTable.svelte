<script>
  import { createEventDispatcher } from 'svelte';
  import { transactionStore } from '$lib/stores/transactionStore';
  import { formatCurrency } from '$lib/utils/formatters';
  import Loading from '../common/Loading.svelte';
  import Modal from '../common/Modal.svelte';
  import Button from '../common/Button.svelte';
  import { api } from '$lib/utils/api';
  import { deleteModalStore } from '$lib/stores/modalStore';

  const dispatch = createEventDispatcher();
  export let accountId;
  export let transactions = null; 
  export let readOnly = false; 
  export let hideEmptyState = false;
  export let isInModal = false;

  let sortField = 'date';
  let sortDirection = 'desc';
  let loading = false;
  let error = null;
  let selectedTransactions = [];
  let currentPage = 1;
  let itemsPerPage = 10;

  let showDeleteConfirmModal = false;
  let deleteType = '';
  let itemsToDelete = [];
  let singleItemToDelete = null;

  $: storeTransactions = $transactionStore.transactions;
  $: displayTransactions = transactions || storeTransactions;
  $: error = transactions === null && $transactionStore.error;

  function formatDate(dateStr) {
    const options = { 
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false // Use 24-hour format
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

  function showDeleteModal(type, count = 0, itemName = '') {
    deleteModalProps = {
      show: true,
      type,
      context: 'transactions',
      count,
      itemName
    };
  }

  async function handleDelete(transaction) {
    deleteModalStore.set({
      show: true,
      type: 'single',
      context: 'transactions',
      count: 1,
      itemName: `transaction`,
      onConfirm: async () => {
        dispatch('delete', {
          type: 'single',
          context: 'transactions',
          items: [transaction._id]
        });
        // Dispatch events เมื่อลบสำเร็จ
        window.dispatchEvent(new CustomEvent('transactionupdate'));
        window.dispatchEvent(new CustomEvent('transactionupdated'));
      }
    });
  }

  function handleSelect(transactionId) {
    if (selectedTransactions.includes(transactionId)) {
      selectedTransactions = selectedTransactions.filter(id => id !== transactionId);
    } else {
      selectedTransactions = [...selectedTransactions, transactionId];
    }
  }

  async function handleDeleteSelected() {
    deleteModalStore.set({
      show: true,
      type: 'selected',
      context: 'transactions',
      count: selectedTransactions.length,
      onConfirm: async () => {
        dispatch('delete', {
          type: 'selected',
          context: 'transactions',
          items: selectedTransactions
        });
        selectedTransactions = [];
        // Dispatch events เมื่อลบสำเร็จ
        window.dispatchEvent(new CustomEvent('transactionupdate'));
        window.dispatchEvent(new CustomEvent('transactionupdated'));
      }
    });
  }

  async function handleDeleteAll() {
    deleteModalStore.set({
      show: true,
      type: 'all',
      context: 'transactions',
      onConfirm: async () => {
        dispatch('delete', {
          type: 'all',
          context: 'transactions',
          items: displayTransactions.map(t => t._id)
        });
        // Dispatch events เมื่อลบสำเร็จ
        window.dispatchEvent(new CustomEvent('transactionupdate'));
        window.dispatchEvent(new CustomEvent('transactionupdated'));
      }
    });
  }

  async function handleFavorite(id) {
    try {
      const transaction = transactions.find(t => t._id === id);
      if (!transaction) return;

      const updatedTransaction = await api.updateTransaction(id, { 
        favorite: !transaction.favorite,
        type: transaction.type,
        amount: transaction.amount,
        date: transaction.date,
        note: transaction.note
      });

      // อัพเดท local state
      transactions = transactions.map(t => 
        t._id === id ? { ...t, favorite: !t.favorite } : t
      );

      dispatch('favorite', id);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }
</script>

<div class="overflow-x-auto">
  {#if loading}
    <Loading message="Loading..." overlay={true} />
  {:else if error}
    <div class="text-red-500">{error}</div>
  {:else if !hideEmptyState && (!displayTransactions || displayTransactions.length === 0)}
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
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-light-border dark:border-0">
          <th class="w-8 text-left py-1 px-2 font-medium text-light-text-muted dark:text-dark-text-muted">
            <input 
              type="checkbox"
              class="checkbox"
              on:click={() => selectedTransactions = selectedTransactions.length === displayTransactions.length ? [] : displayTransactions.map(t => t._id)}
              checked={selectedTransactions.length === displayTransactions.length}
            />
          </th>
          <th class="text-left py-1 px-2 font-medium text-light-text-muted dark:text-dark-text-muted">
            <button 
              class="px-2 py-1 text-sm font-medium rounded-md
                     {sortField === 'type' ? 'bg-light-hover/50 dark:bg-dark-hover/50 text-light-text-muted dark:text-dark-text-muted' : 'hover:text-theme-500'}
                     hover:bg-theme-500/10 hover:text-theme-500 transition-colors"
              on:click={() => handleSort('type')}
            >
              Type {sortField === 'type' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
            </button>
          </th>
          <th class="text-right py-1 px-2 font-medium text-light-text-muted dark:text-dark-text-muted">
            <button 
              class="px-2 py-1 text-sm font-medium rounded-md ml-auto
                     {sortField === 'amount' ? 'bg-light-hover/50 dark:bg-dark-hover/50 text-light-text-muted dark:text-dark-text-muted' : 'hover:text-theme-500'}
                     hover:bg-theme-500/10 hover:text-theme-500 transition-colors"
              on:click={() => handleSort('amount')}
            >
              Amount {sortField === 'amount' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
            </button>
          </th>
          <th class="text-left py-1 px-2 font-medium text-light-text-muted dark:text-dark-text-muted">
            <button 
              class="px-2 py-1 text-sm font-medium rounded-md
                     {sortField === 'date' ? 'bg-light-hover/50 dark:bg-dark-hover/50 text-light-text-muted dark:text-dark-text-muted' : 'hover:text-theme-500'}
                     hover:bg-theme-500/10 hover:text-theme-500 transition-colors"
              on:click={() => handleSort('date')}
            >
              Date {sortField === 'date' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
            </button>
          </th>
          <th class="text-left py-1 px-2 font-medium text-light-text-muted dark:text-dark-text-muted">
            <button 
              class="px-2 py-1 text-sm font-medium rounded-md
                     {sortField === 'note' ? 'bg-light-hover/50 dark:bg-dark-hover/50 text-light-text-muted dark:text-dark-text-muted' : 'hover:text-theme-500'}
                     hover:bg-theme-500/10 hover:text-theme-500 transition-colors"
              on:click={() => handleSort('note')}
            >
              Note {sortField === 'note' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
            </button>
          </th>
          {#if !readOnly}
            <th class="text-right py-1 px-2 font-medium text-light-text-muted dark:text-dark-text-muted">Actions</th>
          {/if}
        </tr>
      </thead>
      <tbody class="divide-y divide-light-border dark:divide-dark-border">
        {#each paginatedTransactions as transaction, index (transaction._id || `transaction-${index}`)}
          <tr class="hover:bg-light-hover dark:hover:bg-dark-hover ">
            <td class="w-8 py-1 px-2 text-right">
              <input 
                type="checkbox"
                class="checkbox"
                on:click={() => handleSelect(transaction._id)}
                checked={selectedTransactions.includes(transaction._id)}
              />
            </td>
            <td class="py-1 px-2">
              <span class="capitalize {getTypeClass(transaction.type)}">{transaction.type}</span>
            </td>
            <td class="py-1 px-2 text-right">
              <span class="{getTypeClass(transaction.type)}">
                ${transaction.amount?.toLocaleString() || '0'}
              </span>
            </td>
            <td class="py-1 px-2 text-light-text-muted dark:text-dark-text">
              {formatDate(transaction.date)}
            </td>
            <td class="py-1 px-2 text-light-text-muted dark:text-dark-text-muted">
              {transaction.note || ''}
            </td>
            {#if !readOnly}
              <td class="py-1 px-2">
                <div class="flex justify-end">
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
                    on:click={() => handleDelete(transaction)}
                    title="Delete transaction"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                  <button 
                    class="icon-button text-theme-500 hover:text-theme-600"
                    on:click={() => handleFavorite(transaction._id)}
                    title={transaction.favorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <svg class="w-4 h-4" fill={transaction.favorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
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
            class="btn btn-secondary flex items-center gap-1 hidden"
            on:click={handleDeleteAll}
            title="Delete all transactions"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

<style lang="postcss">
.icon-button {
    @apply p-1 rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover text-sm;
  }

.card {
    @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-0 rounded-lg shadow-lg ;
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

