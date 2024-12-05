<script>
  import { createEventDispatcher } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import Button from '../common/Button.svelte';
  import Input from '../common/Input.svelte';

  const dispatch = createEventDispatcher();

  export let show = false;
  export let transaction = null;

  let type = transaction?.type || 'deposit';
  let amount = transaction?.amount || 0;
  let date = transaction?.date ? new Date(transaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  let note = transaction?.note || '';

  $: if (transaction) {
    type = transaction.type;
    amount = transaction.amount;
    date = new Date(transaction.date).toISOString().split('T')[0];
    note = transaction.note || '';
  }

  function handleSubmit() {
    dispatch('submit', {
      type,
      amount: parseFloat(amount),
      date: new Date(date),
      note
    });
  }

  function handleClose() {
    show = false;
    dispatch('close');
  }
</script>

{#if show}
  <div 
    class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
    on:click={handleClose}
    transition:fade={{ duration: 200 }}
  >
    <div 
      class="card w-full max-w-md mx-auto relative transform ease-out"
      on:click|stopPropagation
      in:fly={{ y: 20, duration: 300, delay: 150 }}
      out:fly={{ y: 20, duration: 200 }}
    >
      <!-- Header -->
      <div class="px-8 py-5 border-b border-light-border dark:border-dark-border flex justify-between items-center sticky top-0 bg-light-card dark:bg-dark-card rounded-t-xl bg-opacity-90 dark:bg-opacity-90 z-10">
        <h2 class="text-2xl font-bold text-light-text dark:text-dark-text">
          Edit Transaction
        </h2>
        <button 
          class="p-2 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover transition-all duration-200"
          on:click={handleClose}
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="px-8 py-6 space-y-4">
        <form on:submit|preventDefault={handleSubmit}>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-1 text-light-text dark:text-dark-text">Type</label>
              <div class="flex gap-4">
                <label class="flex items-center">
                  <input
                    type="radio"
                    bind:group={type}
                    value="deposit"
                    class="form-radio text-theme-500"
                  />
                  <span class="ml-2 text-light-text dark:text-dark-text">Deposit</span>
                </label>
                <label class="flex items-center">
                  <input
                    type="radio"
                    bind:group={type}
                    value="withdrawal"
                    class="form-radio text-theme-500"
                  />
                  <span class="ml-2 text-light-text dark:text-dark-text">Withdrawal</span>
                </label>
              </div>
            </div>
            <Input
              label="Amount"
              type="number"
              bind:value={amount}
              min="0"
              step="0.01"
              placeholder="0.00"
            />
            <Input
              label="Date"
              type="date"
              bind:value={date}
            />
            <Input
              label="Note"
              type="text"
              bind:value={note}
              placeholder="Add a note..."
            />
          </div>
        </form>
      </div>

      <!-- Footer -->
      <div class="px-8 py-5 border-t border-light-border dark:border-dark-border flex justify-end gap-4 sticky bottom-0 bg-light-card dark:bg-dark-card rounded-b-xl bg-opacity-90 dark:bg-opacity-90 z-10">
        <Button 
          type="button" 
          variant="secondary" 
          on:click={handleClose}
        >
          Cancel
        </Button>
        <Button type="submit" variant="primary" on:click={handleSubmit}>
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
