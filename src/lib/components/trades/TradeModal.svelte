<script>
    import { createEventDispatcher } from 'svelte';
    import { fade, fly } from 'svelte/transition';
    import Button from '../common/Button.svelte';
    import Input from '../common/Input.svelte';
    import Select from '../common/Select.svelte';
    import { tradeOptionStore } from '$lib/stores/tradeOptionStore';
    import { leverageStore } from '$lib/stores/leverageStore';
    import { validators } from '$lib/utils/validators';

    const dispatch = createEventDispatcher();

    export let show = false;
    export let trade = null;
    export let accountId = '';
    export let entryDate = '';

    let errors = {};
    let formData = {
        accountId,
        symbol: '',
        type: 'LONG',
        status: 'OPEN',
        entryDate: entryDate || new Date().toISOString().slice(0, 16),
        entryPrice: '',
        exitDate: '',
        exitPrice: '',
        quantity: '',
        leverage: '1',
        pnl: '',
        notes: '',
        favorite: false,
        disabled: false
    };

    $: if (trade) {
        formData = {
            ...trade,
            entryDate: new Date(trade.entryDate).toISOString().slice(0, 16),
            exitDate: trade.exitDate ? new Date(trade.exitDate).toISOString().slice(0, 16) : '',
            leverage: trade.leverage?.toString() || '1'
        };
    }

    function close() {
        show = false;
        dispatch('close');
    }

    function handleSubmit() {
        const validationErrors = {};

        // Required fields
        if (!formData.symbol) validationErrors.symbol = 'Symbol is required';
        if (!formData.entryDate) validationErrors.entryDate = 'Entry date is required';
        if (!formData.entryPrice) validationErrors.entryPrice = 'Entry price is required';
        if (!formData.quantity) validationErrors.quantity = 'Quantity is required';

        // Number validation
        if (formData.entryPrice && !validators.isValidNumber(formData.entryPrice)) {
            validationErrors.entryPrice = 'Invalid entry price';
        }
        if (formData.exitPrice && !validators.isValidNumber(formData.exitPrice)) {
            validationErrors.exitPrice = 'Invalid exit price';
        }
        if (formData.quantity && !validators.isValidNumber(formData.quantity)) {
            validationErrors.quantity = 'Invalid quantity';
        }
        if (formData.pnl && !validators.isValidNumber(formData.pnl)) {
            validationErrors.pnl = 'Invalid P&L';
        }

        // Date validation
        if (formData.exitDate && new Date(formData.exitDate) < new Date(formData.entryDate)) {
            validationErrors.exitDate = 'Exit date must be after entry date';
        }

        if (Object.keys(validationErrors).length > 0) {
            errors = validationErrors;
            return;
        }

        // Format data
        const data = {
            ...formData,
            accountId,
            entryPrice: parseFloat(formData.entryPrice),
            exitPrice: formData.exitPrice ? parseFloat(formData.exitPrice) : null,
            quantity: parseFloat(formData.quantity),
            leverage: parseInt(formData.leverage),
            pnl: formData.pnl ? parseFloat(formData.pnl) : null
        };

        dispatch('submit', data);
    }
</script>

{#if show}
    <div 
        class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-100"
        on:click={close}
        transition:fade={{ duration: 200 }}
    >
        <div 
            class="card w-full max-w-lg mx-auto relative transform transition-all duration-100 ease-out"
            on:click|stopPropagation
            in:fly={{ y: 20, duration: 300, delay: 150 }}
            out:fly={{ y: 20, duration: 200 }}
        >
            <!-- Header -->
            <div class="px-8 py-5 border-b border-light-border dark:border-dark-border flex justify-between items-center sticky top-0 bg-light-card dark:bg-dark-card rounded-t-xl backdrop-blur-lg bg-opacity-90 dark:bg-opacity-90 z-10">
                <h2 class="text-2xl font-bold bg-gradient-purple bg-clip-text text-transparent">
                    {trade ? 'Edit Trade' : 'New Trade'}
                </h2>
                <button 
                    class="p-2 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover transition-all duration-200"
                    on:click={close}
                >
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <!-- Content -->
            <div class="px-8 py-6 space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <!-- Symbol -->
                    <div class="col-span-2">
                        <Select
                            label="Symbol"
                            options={$tradeOptionStore.symbols.map(symbol => ({ value: symbol, label: symbol }))}
                            bind:value={formData.symbol}
                            error={errors.symbol}
                            required
                        />
                    </div>

                    <!-- Type -->
                    <Select
                        label="Type"
                        options={[
                            { value: 'LONG', label: 'Long' },
                            { value: 'SHORT', label: 'Short' }
                        ]}
                        bind:value={formData.type}
                    />

                    <!-- Status -->
                    <Select
                        label="Status"
                        options={[
                            { value: 'OPEN', label: 'Open' },
                            { value: 'CLOSED', label: 'Closed' }
                        ]}
                        bind:value={formData.status}
                    />

                    <!-- Entry Date -->
                    <Input
                        type="datetime-local"
                        label="Entry Date"
                        bind:value={formData.entryDate}
                        error={errors.entryDate}
                        required
                    />

                    <!-- Entry Price -->
                    <Input
                        type="number"
                        label="Entry Price"
                        bind:value={formData.entryPrice}
                        error={errors.entryPrice}
                        required
                        step="any"
                    />

                    <!-- Exit Date -->
                    {#if formData.status === 'CLOSED'}
                        <Input
                            type="datetime-local"
                            label="Exit Date"
                            bind:value={formData.exitDate}
                            error={errors.exitDate}
                            required
                        />

                        <!-- Exit Price -->
                        <Input
                            type="number"
                            label="Exit Price"
                            bind:value={formData.exitPrice}
                            error={errors.exitPrice}
                            required
                            step="any"
                        />
                    {/if}

                    <!-- Quantity -->
                    <Input
                        type="number"
                        label="Quantity"
                        bind:value={formData.quantity}
                        error={errors.quantity}
                        required
                        step="any"
                    />

                    <!-- Leverage -->
                    <Select
                        label="Leverage"
                        options={$leverageStore.options.map(x => ({ value: x.toString(), label: `${x}x` }))}
                        bind:value={formData.leverage}
                    />

                    <!-- P&L -->
                    {#if formData.status === 'CLOSED'}
                        <Input
                            type="number"
                            label="P&L"
                            bind:value={formData.pnl}
                            error={errors.pnl}
                            step="any"
                        />
                    {/if}

                    <!-- Notes -->
                    <div class="col-span-2">
                        <Input
                            type="text"
                            label="Notes"
                            bind:value={formData.notes}
                        />
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="px-8 py-5 border-t border-light-border dark:border-dark-border flex justify-end gap-4 sticky bottom-0 bg-light-card dark:bg-dark-card rounded-b-xl backdrop-blur-lg bg-opacity-90 dark:bg-opacity-90 z-10">
                <Button variant="secondary" on:click={close}>
                    Cancel
                </Button>
                <Button variant="primary" on:click={handleSubmit}>
                    {trade ? 'Save Changes' : 'Create Trade'}
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
