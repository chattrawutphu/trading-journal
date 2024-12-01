<!-- src/lib/components/trades/TradeModal.svelte -->
<script>
    import { createEventDispatcher } from 'svelte';
    import { fade } from 'svelte/transition';
    import Select from '../common/Select.svelte';
    import Input from '../common/Input.svelte';
    import Button from '../common/Button.svelte';
    import TradeOptionSelect from './TradeOptionSelect.svelte';
  
    const dispatch = createEventDispatcher();
  
    export let show = false;
    export let trade = null;
    export let accountId = null;
  
    let form = {
      entryDate: new Date().toISOString().split('T')[0],
      exitDate: '',
      symbol: '',
      status: 'OPEN',
      side: 'LONG',
      quantity: '',
      amount: '',
      entryPrice: '',
      exitPrice: '',
      pnl: '',
      entryReason: '',
      exitReason: '',
      strategy: '',
      emotions: '',
      notes: '',
      confidenceLevel: 5,
      greedLevel: 5,
      hasStopLoss: false,
      hasTakeProfit: false,
      image: null,
      favorite: false,
      disabled: false
    };

    let imagePreview = null;
    let imageError = '';
  
    $: if (trade) {
      form = { 
        ...trade,
        entryDate: trade.entryDate ? new Date(trade.entryDate).toISOString().slice(0, 16) : '',
        exitDate: trade.exitDate ? new Date(trade.exitDate).toISOString().slice(0, 16) : ''
      };
      if (trade.image?.data) {
        imagePreview = `data:${trade.image.contentType};base64,${arrayBufferToBase64(trade.image.data)}`;
      }
    } else {
      form.account = accountId;
    }

    function arrayBufferToBase64(buffer) {
      const binary = new Uint8Array(buffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      );
      return btoa(binary);
    }

    async function handleImageUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      if (file.size > 409600) {
        imageError = 'Image size must not exceed 400KB';
        event.target.value = '';
        return;
      }

      imageError = '';
      const reader = new FileReader();
      
      reader.onload = (e) => {
        imagePreview = e.target.result;
        form.image = {
          data: e.target.result.split(',')[1],
          contentType: file.type,
          size: file.size
        };
      };
      
      reader.readAsDataURL(file);
    }

    function calculatePnL() {
      if (form.exitPrice && form.entryPrice && form.amount) {
        if (form.side === 'LONG') {
          form.pnl = (form.exitPrice - form.entryPrice) * form.amount;
        } else {
          form.pnl = (form.entryPrice - form.exitPrice) * form.amount;
        }
      }
    }
  
    function handleSubmit() {
      const formData = { ...form };
      
      // Convert numeric fields
      formData.quantity = Number(formData.quantity);
      formData.amount = Number(formData.amount);
      formData.entryPrice = Number(formData.entryPrice);
      if (formData.exitPrice) formData.exitPrice = Number(formData.exitPrice);
      if (formData.pnl) formData.pnl = Number(formData.pnl);
      formData.confidenceLevel = Number(formData.confidenceLevel);
      formData.greedLevel = Number(formData.greedLevel);

      // Handle dates
      try {
        if (formData.entryDate) {
          const entryDate = new Date(formData.entryDate);
          if (!isNaN(entryDate.getTime())) {
            formData.entryDate = entryDate.toISOString();
          }
        }
        if (formData.exitDate) {
          const exitDate = new Date(formData.exitDate);
          if (!isNaN(exitDate.getTime())) {
            formData.exitDate = exitDate.toISOString();
          }
        }
      } catch (err) {
        console.error('Error processing dates:', err);
      }

      if (!trade) {
        formData.account = accountId;
      }

      dispatch('submit', formData);
      close();
    }
  
    function close() {
      dispatch('close');
      form = {
        account: accountId,
        entryDate: new Date().toISOString().split('T')[0],
        exitDate: '',
        symbol: '',
        status: 'OPEN',
        side: 'LONG',
        quantity: '',
        amount: '',
        entryPrice: '',
        exitPrice: '',
        pnl: '',
        entryReason: '',
        exitReason: '',
        strategy: '',
        emotions: '',
        notes: '',
        confidenceLevel: 5,
        greedLevel: 5,
        hasStopLoss: false,
        hasTakeProfit: false,
        image: null,
        favorite: false,
        disabled: false
      };
      imagePreview = null;
      imageError = '';
    }

    const statusOptions = [
      { value: 'OPEN', label: 'Open' },
      { value: 'CLOSED', label: 'Closed' }
    ];

    const sideOptions = [
      { value: 'LONG', label: 'Long' },
      { value: 'SHORT', label: 'Short' }
    ];

    const levelOptions = Array.from({ length: 10 }, (_, i) => ({
      value: i + 1,
      label: String(i + 1)
    }));
</script>

<!-- Rest of the component template remains unchanged -->
{#if show}
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" transition:fade>
        <div class="card w-full max-w-2xl mx-4 relative">
            <!-- Header -->
            <div class="px-8 py-4 border-b border-light-border dark:border-dark-border flex justify-between items-center sticky top-0 bg-light-card dark:bg-dark-card rounded-t-lg">
                <h2 class="text-2xl font-bold bg-gradient-purple bg-clip-text text-transparent">
                    {trade ? 'Edit Trade' : 'New Trade'}
                </h2>
                <button 
                    class="text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text transition-colors duration-200" 
                    on:click={close}
                >
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <!-- Scrollable Content -->
            <div class="px-8 py-6 max-h-[calc(100vh-16rem)] overflow-y-auto">
                <form on:submit|preventDefault={handleSubmit} class="space-y-6">
                    <!-- Basic Trade Info -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">
                                Symbol
                            </label>
                            <div class="input-wrapper">
                                <TradeOptionSelect
                                    type="SYMBOL"
                                    bind:value={form.symbol}
                                    required
                                    placeholder="Select or add symbol"
                                />
                            </div>
                        </div>
                        <Select
                            label="Side"
                            options={sideOptions}
                            bind:value={form.side}
                            required
                        />
                        <Select
                            label="Status"
                            options={statusOptions}
                            bind:value={form.status}
                            required
                        />
                        <div>
                            <label class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">
                                Strategy
                            </label>
                            <div class="input-wrapper">
                                <TradeOptionSelect
                                    type="STRATEGY"
                                    bind:value={form.strategy}
                                    placeholder="Select or add strategy"
                                />
                            </div>
                        </div>
                    </div>

                    <!-- Entry Details -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label="Entry Date"
                            type="datetime-local"
                            bind:value={form.entryDate}
                            required
                        />
                        <Input
                            label="Entry Price"
                            type="number"
                            step="0.00000001"
                            bind:value={form.entryPrice}
                            required
                            placeholder="0.00"
                        />
                        <Input
                            label="Quantity"
                            type="number"
                            step="0.00000001"
                            bind:value={form.quantity}
                            required
                            placeholder="0.00"
                        />
                        <Input
                            label="Amount (USD)"
                            type="number"
                            step="0.01"
                            bind:value={form.amount}
                            required
                            placeholder="0.00"
                        />
                        <div class="col-span-full">
                            <Input
                                label="Entry Reason"
                                type="text"
                                bind:value={form.entryReason}
                                placeholder="Why did you enter this trade?"
                            />
                        </div>
                    </div>

                    <!-- Exit Details -->
                    {#if form.status === 'CLOSED'}
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                                label="Exit Date"
                                type="datetime-local"
                                bind:value={form.exitDate}
                                required
                            />
                            <div class="flex gap-2">
                                <Input
                                    label="Exit Price"
                                    type="number"
                                    step="0.00000001"
                                    bind:value={form.exitPrice}
                                    required
                                    placeholder="0.00"
                                />
                                <Button 
                                    type="button"
                                    variant="secondary"
                                    class="mt-6"
                                    on:click={calculatePnL}
                                    icon='<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>'
                                />
                            </div>
                            <Input
                                label="P&L"
                                type="number"
                                step="0.01"
                                bind:value={form.pnl}
                                required
                                placeholder="0.00"
                            />
                            <div class="col-span-full">
                                <Input
                                    label="Exit Reason"
                                    type="text"
                                    bind:value={form.exitReason}
                                    placeholder="Why did you exit this trade?"
                                />
                            </div>
                        </div>
                    {/if}

                    <!-- Trade Levels -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Select
                            label="Confidence Level"
                            options={levelOptions}
                            bind:value={form.confidenceLevel}
                            required
                        />
                        <Select
                            label="Greed Level"
                            options={levelOptions}
                            bind:value={form.greedLevel}
                            required
                        />
                    </div>

                    <!-- Trade Settings -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <label class="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                bind:checked={form.hasStopLoss}
                                class="checkbox"
                            />
                            <span class="text-light-text dark:text-dark-text">Has Stop Loss</span>
                        </label>
                        <label class="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                bind:checked={form.hasTakeProfit}
                                class="checkbox"
                            />
                            <span class="text-light-text dark:text-dark-text">Has Take Profit</span>
                        </label>
                    </div>

                    <!-- Additional Info -->
                    <div class="space-y-6">
                        <Input
                            label="Emotions"
                            type="text"
                            bind:value={form.emotions}
                            placeholder="How did you feel during this trade?"
                        />
                        <div>
                            <label class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">
                                Notes
                            </label>
                            <textarea
                                bind:value={form.notes}
                                rows="3"
                                class="input w-full resize-none"
                                placeholder="Additional notes about the trade..."
                            />
                        </div>

                        <!-- Image Upload -->
                        <div>
                            <label class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">
                                Trade Image (max 400KB)
                            </label>
                            <div class="flex items-center justify-center w-full">
                                <label class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-light-border dark:border-dark-border rounded-lg cursor-pointer bg-light-hover dark:bg-dark-hover hover:bg-light-card dark:hover:bg-dark-card transition-colors duration-200">
                                    <div class="flex flex-col items-center justify-center pt-5 pb-6">
                                        <svg class="w-8 h-8 mb-3 text-light-text-muted dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                                        </svg>
                                        <p class="text-sm text-light-text-muted dark:text-dark-text-muted">
                                            Click to upload or drag and drop
                                        </p>
                                    </div>
                                    <input 
                                        type="file"
                                        accept="image/*"
                                        class="hidden"
                                        on:change={handleImageUpload}
                                    />
                                </label>
                            </div>
                            {#if imageError}
                                <p class="mt-2 text-sm text-red-500">{imageError}</p>
                            {/if}
                            {#if imagePreview}
                                <div class="mt-4">
                                    <img src={imagePreview} alt="Trade" class="max-h-48 rounded-lg mx-auto" />
                                </div>
                            {/if}
                        </div>
                    </div>
                </form>
            </div>

            <!-- Footer with Buttons -->
            <div class="px-8 py-4 border-t border-light-border dark:border-dark-border flex justify-end gap-4 sticky bottom-0 bg-light-card dark:bg-dark-card rounded-b-lg">
                <Button type="button" variant="secondary" on:click={close}>
                    Cancel
                </Button>
                <Button type="submit" variant="primary" on:click={handleSubmit}>
                    Save Trade
                </Button>
            </div>
        </div>
    </div>
{/if}
  
<style>
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-lg transition-colors duration-200;
    }

    .checkbox {
        @apply h-5 w-5 rounded border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-theme-500 focus:ring-theme-500 focus:ring-offset-2 focus:ring-offset-light-bg dark:focus:ring-offset-dark-bg transition-colors duration-200;
    }

    .input-wrapper :global(input),
    .input-wrapper :global(.input) {
        @apply bg-light-bg dark:bg-dark-bg;
    }
</style>
