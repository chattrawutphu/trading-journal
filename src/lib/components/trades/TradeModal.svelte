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
      // If editing existing trade, use its values
      form = { ...trade };
      if (trade.image?.data) {
        imagePreview = `data:${trade.image.contentType};base64,${arrayBufferToBase64(trade.image.data)}`;
      }
    } else {
      // If creating new trade, ensure account is set
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

      // Check file size (400KB = 409600 bytes)
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
          data: e.target.result.split(',')[1], // Remove data URL prefix
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
      
      // Convert string values to numbers where needed
      formData.quantity = Number(formData.quantity);
      formData.amount = Number(formData.amount);
      formData.entryPrice = Number(formData.entryPrice);
      if (formData.exitPrice) formData.exitPrice = Number(formData.exitPrice);
      if (formData.pnl) formData.pnl = Number(formData.pnl);
      formData.confidenceLevel = Number(formData.confidenceLevel);
      formData.greedLevel = Number(formData.greedLevel);

      // Convert date strings to Date objects
      if (formData.entryDate) {
        formData.entryDate = new Date(formData.entryDate).toISOString();
      }
      if (formData.exitDate) {
        formData.exitDate = new Date(formData.exitDate).toISOString();
      }

      // Ensure account is set for new trades
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
  
  {#if show}
    <div class="fixed inset-0 bg-black bg-opacity-70 z-[100] flex items-center justify-center" transition:fade>
      <div class="bg-slate-800 rounded-lg w-full max-w-2xl mx-4 relative">
        <!-- Header -->
        <div class="px-8 py-4 border-b border-slate-700 flex justify-between items-center sticky top-0 bg-slate-800 rounded-t-lg">
          <h2 class="text-2xl font-bold gradient-text">
            {trade ? 'Edit Trade' : 'New Trade'}
          </h2>
          <button class="text-slate-400 hover:text-white" on:click={close}>
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>

        <!-- Scrollable Content -->
        <div class="px-8 py-6 max-h-[calc(100vh-16rem)] overflow-y-auto">
          <form on:submit|preventDefault={handleSubmit} class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <!-- Basic Trade Info -->
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-1">
                  Symbol
                </label>
                <TradeOptionSelect
                  type="SYMBOL"
                  bind:value={form.symbol}
                  required
                  placeholder="Select or add symbol"
                />
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
                <label class="block text-sm font-medium text-slate-300 mb-1">
                  Strategy
                </label>
                <TradeOptionSelect
                  type="STRATEGY"
                  bind:value={form.strategy}
                  placeholder="Select or add strategy"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <!-- Entry Details -->
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
              <Input
                label="Entry Reason"
                type="text"
                bind:value={form.entryReason}
                placeholder="Why did you enter this trade?"
              />
            </div>

            {#if form.status === 'CLOSED'}
              <div class="grid grid-cols-2 gap-4">
                <!-- Exit Details -->
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
                    variant="primary"
                    class="mt-6"
                    on:click={calculatePnL}
                  >
                    <i class="fas fa-calculator"></i>
                  </Button>
                </div>
                <Input
                  label="P&L"
                  type="number"
                  step="0.01"
                  bind:value={form.pnl}
                  required
                  placeholder="0.00"
                />
                <Input
                  label="Exit Reason"
                  type="text"
                  bind:value={form.exitReason}
                  placeholder="Why did you exit this trade?"
                />
              </div>
            {/if}

            <div class="grid grid-cols-2 gap-4">
              <!-- Trade Levels -->
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

            <div class="grid grid-cols-2 gap-4">
              <!-- Trade Settings -->
              <label class="flex items-center space-x-2">
                <input
                  type="checkbox"
                  bind:checked={form.hasStopLoss}
                  class="form-checkbox text-blue-500"
                />
                <span class="text-slate-300">Has Stop Loss</span>
              </label>
              <label class="flex items-center space-x-2">
                <input
                  type="checkbox"
                  bind:checked={form.hasTakeProfit}
                  class="form-checkbox text-blue-500"
                />
                <span class="text-slate-300">Has Take Profit</span>
              </label>
            </div>

            <div class="grid grid-cols-1 gap-4">
              <!-- Additional Info -->
              <Input
                label="Emotions"
                type="text"
                bind:value={form.emotions}
                placeholder="How did you feel during this trade?"
              />
              <div class="col-span-full">
                <label class="block text-sm font-medium text-slate-300 mb-1">
                  Notes
                </label>
                <textarea
                  bind:value={form.notes}
                  rows="3"
                  class="w-full bg-slate-700 border border-slate-600 rounded-lg p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Additional notes about the trade..."
                />
              </div>

              <!-- Image Upload -->
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-1">
                  Trade Image (max 400KB)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  on:change={handleImageUpload}
                  class="w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600"
                />
                {#if imageError}
                  <p class="text-red-500 text-sm mt-1">{imageError}</p>
                {/if}
                {#if imagePreview}
                  <img src={imagePreview} alt="Trade" class="mt-2 max-h-48 rounded-lg" />
                {/if}
              </div>
            </div>
          </form>
        </div>

        <!-- Footer with Buttons -->
        <div class="px-8 py-4 border-t border-slate-700 flex justify-end gap-4 sticky bottom-0 bg-slate-800 rounded-b-lg">
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
    .gradient-text {
      background: linear-gradient(45deg, #3b82f6, #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    :global(.form-checkbox) {
      @apply rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500;
    }
  </style>
