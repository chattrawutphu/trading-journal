<script>
    import { createEventDispatcher } from "svelte";
    import { fade, fly } from "svelte/transition";
    import Select from "../common/Select.svelte";
    import Input from "../common/Input.svelte";
    import Button from "../common/Button.svelte";
    import TradeOptionSelect from "./TradeOptionSelect.svelte";
    import { validateTradeForm } from "$lib/utils/validators";
    import { subscriptionStore } from '$lib/stores/subscriptionStore';
    import { SUBSCRIPTION_TYPES } from '$lib/config/subscription';
    import { goto } from '$app/navigation';
    import { tradeDate } from '$lib/stores/tradeDateStore';

    const dispatch = createEventDispatcher();

    export let show = false;
    export let trade = null;
    export let accountId = null;

    let errors = {};
    let previousSymbol = "";

    let form = {
        entryDate: getCurrentDateTime(),
        exitDate: getCurrentDateTime(),
        symbol: "",
        status: "OPEN",
        side: "LONG",
        quantity: "",
        amount: "",
        entryPrice: "",
        exitPrice: "",
        pnl: "",
        entryReason: "",
        exitReason: "",
        strategy: "",
        emotions: "",
        notes: "",
        url: "",
        confidenceLevel: 5,
        greedLevel: 5,
        hasStopLoss: false,
        hasTakeProfit: false,
        favorite: false,
        leverage: 1,
    };

    const emotionOptions = [
        { value: "confident", label: "😊 Confident" },
        { value: "fearful", label: "😨 Fearful" },
        { value: "angry", label: "😡 Angry" },
        { value: "disappointed", label: "😔 Disappointed" },
        { value: "uncertain", label: "🤔 Uncertain" },
        { value: "calm", label: "😌 Calm" },
        { value: "frustrated", label: "😤 Frustrated" },
        { value: "excited", label: "🤩 Excited" },
        { value: "anxious", label: "😰 Anxious" },
        { value: "neutral", label: "😐 Neutral" },
    ];

    function getCurrentDate() {
        const now = new Date();
        now.setHours(12, 0, 0, 0);
        return now.toISOString().slice(0, 10);
    }

    function getCurrentDateTime() {
        const now = new Date();
        now.setSeconds(0, 0);
        return now.toLocaleString('sv-SE', { hour12: false }).slice(0, 16);
    }

    function formatDateTimeLocal(dateInput) {
        let date;
        if (dateInput instanceof Date) {
            date = dateInput;
        } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
            date = new Date(dateInput);
        } else {
            date = new Date();
        }

        if (isNaN(date.getTime())) {
            date = new Date();
        }

        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - (offset * 60 * 1000));
        return localDate.toISOString().slice(0,16);
    }

    $: if (trade) {
        form = {
            ...form,
            ...trade,
            entryDate: trade.entryDate 
                ? formatDateTimeLocal(trade.entryDate)
                : getCurrentDateTime(),
            exitDate: trade.exitDate
                ? formatDateTimeLocal(trade.exitDate)
                : getCurrentDateTime(),
        };
        previousSymbol = trade.symbol;
    }

    $: if (form.status === "CLOSED" && !form.exitDate) {
        form.exitDate = getCurrentDateTime();
    }

    function calculatePnL() {
        if (!form.amount || form.amount <= 0) {
            errors.amount = "Amount must be greater than 0";
            return;
        }
        
        if (form.exitPrice && form.entryPrice) {
            if (form.side === "LONG") {
                form.pnl = (form.exitPrice - form.entryPrice) * form.amount;
                if (form.pnl === 0) {
                    errors.pnl = "Profit/Loss cannot be zero";
                } else {
                    delete errors.pnl;
                }
            } else {
                form.pnl = (form.entryPrice - form.exitPrice) * form.amount;
                if (form.pnl === 0) {
                    errors.pnl = "Profit/Loss cannot be zero";
                } else {
                    delete errors.pnl;
                }
            }
        }
    }

    function validateForm(form) {
        const errors = {};
        
        if (!form.symbol?.trim()) {
            errors.symbol = "Symbol is required";
        }
        
        if (!form.entryPrice || form.entryPrice <= 0) {
            errors.entryPrice = "Entry price must be greater than 0";
        }

        if (!form.amount || form.amount <= 0) {
            errors.amount = "Amount must be greater than 0";
        }

        if (form.status === "CLOSED") {
            if (!form.exitPrice || form.exitPrice <= 0) {
                errors.exitPrice = "Exit price must be greater than 0";
            }
            if (!form.pnl || form.pnl === 0) {
                errors.pnl = "Profit/Loss cannot be zero";
            }
        }

        return errors;
    }

    async function handleSubmit() {
        errors = validateForm(form);
        if (Object.keys(errors).length > 0) {
            return;
        }

        const formData = { ...form };

        formData.quantity = Number(formData.quantity);
        formData.amount = Number(formData.amount);
        formData.entryPrice = Number(formData.entryPrice);
        if (formData.exitPrice) formData.exitPrice = Number(formData.exitPrice);
        if (formData.pnl) formData.pnl = Number(formData.pnl);
        formData.confidenceLevel = Number(formData.confidenceLevel);
        formData.greedLevel = Number(formData.greedLevel);
        if (formData.leverage) formData.leverage = Number(formData.leverage);

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
            console.error("Error processing dates:", err);
        }

        if (!trade) {
            formData.account = accountId;
        }

        dispatch("submit", formData);
        close();
    }

    function handleClose() {
        show = false;
        dispatch('close');
        form = {
            account: accountId,
            entryDate: getCurrentDateTime(),
            exitDate: getCurrentDateTime(),
            symbol: "",
            status: "OPEN",
            side: "LONG",
            quantity: "",
            amount: "",
            entryPrice: "",
            exitPrice: "",
            pnl: "",
            entryReason: "",
            exitReason: "",
            strategy: "",
            emotions: "",
            notes: "",
            url: "",
            confidenceLevel: 5,
            greedLevel: 5,
            hasStopLoss: false,
            hasTakeProfit: false,
            favorite: false,
            leverage: 1,
        };
        errors = {};
        previousSymbol = "";
    }

    const statusOptions = [
        { value: "OPEN", label: "Open" },
        { value: "CLOSED", label: "Closed" },
    ];

    const sideOptions = [
        { value: "LONG", label: "Long" },
        { value: "SHORT", label: "Short" },
    ];

    const levelOptions = Array.from({ length: 10 }, (_, i) => ({
        value: i + 1,
        label: String(i + 1),
    }));

    $: subscriptionType = $subscriptionStore.type || SUBSCRIPTION_TYPES.BASIC;

    function upgradePlan() {
        goto('/subscription');
    }
</script>

{#if show}
    <div
        class="fixed modal inset-0 bg-black/50 z-50 flex items-center justify-center p-2"
        transition:fade={{ duration: 150 }}>
        <div class="card w-full max-w-2xl mx-auto relative transform ease-out">
            <!-- Header -->
            <div
                class="px-4 py-3 border-b border-light-border dark:border-dark-border flex justify-between items-center sticky top-0 bg-light-card dark:bg-dark-card rounded-t-xl bg-opacity-90 dark:bg-opacity-90 z-10"
            >
                <div class="flex-1 flex items-center gap-3">
                    <h2
                        class="text-lg font-bold bg-gradient-to-r from-theme-500 to-theme-600 bg-clip-text text-transparent"
                    >
                        {trade ? "Edit Trade" : "New Trade"}
                    </h2>
                    {#if form.symbol}
                        <div
                            class="text-base px-3 py-1 rounded-full bg-light-hover dark:bg-dark-hover text-light-text-muted dark:text-dark-text-muted"
                        >
                            {form.symbol}
                        </div>
                    {/if}
                </div>
                <button
                    class="p-2 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover"
                    on:click={handleClose}
                >
                    <svg 
                        class="w-6 h-6" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path 
                            stroke-linecap="round" 
                            stroke-linejoin="round" 
                            stroke-width="2" 
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
                {#if subscriptionType === SUBSCRIPTION_TYPES.BASIC}
                    <Button
                        type="button"
                        variant="link"
                        size="small"
                        on:click={upgradePlan}
                        class="text-base"
                    >
                        Upgrade
                    </Button>
                {/if}
            </div>

            <!-- Scrollable Content -->
            <div class="px-4 py-3 max-h-[calc(100vh-10rem)] overflow-y-auto">
                <form on:submit|preventDefault={handleSubmit} class="space-y-2">
                    <!-- Basic Info Section -->
                    <div
                        class="bg-light-hover/30 dark:bg-dark-hover/30 rounded-md p-3 space-y-2"
                    >
                        <h3
                            class="text-base font-semibold text-light-text dark:text-dark-text mb-2"
                        >
                            Trade Details
                        </h3>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label
                                for="trade-symbol"
                                    class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1"
                                >
                                    Symbol
                                    <span class="text-red-500">*</span>
                                </label>
                                <div class="input-wrapper">
                                    <TradeOptionSelect
                                        type="SYMBOL"
                                        bind:value={form.symbol}
                                        required
                                        placeholder="Select or add symbol"
                                        {accountId}
                                    />
                                </div>
                                {#if errors.symbol}
                                    <p class="mt-2 text-sm text-red-500">
                                        {errors.symbol}
                                    </p>
                                {/if}
                            </div>
                            <Select
                                label="Side"
                                options={sideOptions}
                                bind:value={form.side}
                                required
                            />
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <Select
                                label="Status"
                                options={statusOptions}
                                bind:value={form.status}
                                required
                            />
                            <div>
                                <label
                                    for="trade-strategy"
                                    class="block text-xs font-medium text-light-text-muted dark:text-dark-text-muted mb-1"
                                >
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
                    </div>

                    <!-- Trade Details Section -->
                    <div
                        class="bg-light-hover/30 dark:bg-dark-hover/30 rounded-md p-3 space-y-2"
                    >
                        <h3
                            class="text-base font-semibold text-light-text dark:text-dark-text mb-2"
                        >
                            Entry & Exit
                        </h3>

                        <div class="grid grid-cols-2 gap-x-6 gap-y-4">
                            <!-- Left Column -->
                            <div class="space-y-4">
                                <Input
                                    label="Entry Date"
                                    type="datetime-local"
                                    bind:value={form.entryDate}
                                    max={new Date().toLocaleString('sv-SE', { hour12: false }).slice(0, 16)}
                                    required
                                    error={errors.entryDate}
                                />
                                {#if form.status === "CLOSED"}
                                    <Input
                                        label="Exit Date"
                                        type="datetime-local"
                                        bind:value={form.exitDate}
                                        max={new Date().toLocaleString('sv-SE', { hour12: false }).slice(0, 16)}
                                        required
                                        error={errors.exitDate}
                                    />
                                {/if}
                                <Input
                                    label="Quantity"
                                    type="number"
                                    className="no-spinners"
                                    bind:value={form.quantity}
                                    placeholder="0.00"
                                    error={errors.quantity}
                                />
                                <Input
                                    label="Leverage"
                                    type="number"
                                    step="1"
                                    min="1"
                                    bind:value={form.leverage}
                                    placeholder="1"
                                    error={errors.leverage}
                                />
                            </div>

                            <!-- Right Column -->
                            <div class="space-y-4">
                                <Input
                                    label="Entry Price"
                                    type="number"
                                    className="no-spinners"
                                    bind:value={form.entryPrice}
                                    required
                                    placeholder="0.00"
                                    error={errors.entryPrice}
                                />
                                {#if form.status === "CLOSED"}
                                    <Input
                                        label="Exit Price"
                                        type="number"
                                        className="no-spinners"
                                        bind:value={form.exitPrice}
                                        required
                                        placeholder="0.00"
                                        error={errors.exitPrice}
                                    />
                                {/if}
                                <Input
                                    label="Amount (USD)"
                                    type="number"
                                    className="no-spinners"
                                    bind:value={form.amount}
                                    required
                                    placeholder="0.00"
                                    error={errors.amount}
                                />
                                {#if form.status === "CLOSED"}
                                    <div class="flex items-end gap-2">
                                        <Input
                                            label="P&L"
                                            type="number"
                                            className="no-spinners"
                                            bind:value={form.pnl}
                                            required
                                            placeholder="0.00"
                                            error={errors.pnl}
                                        />
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            class="h-[42px] flex items-center justify-center px-3"
                                            on:click={calculatePnL}
                                        >
                                            <svg
                                                class="w-4 h-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    stroke-width="2"
                                                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                                />
                                            </svg>
                                        </Button>
                                    </div>
                                {/if}
                            </div>
                        </div>
                    </div>

                    <!-- Analysis Section -->
                    <div
                        class="bg-light-hover/30 dark:bg-dark-hover/30 rounded-md p-3 space-y-2"
                    >
                        <h3
                            class="text-base font-semibold text-light-text dark:text-dark-text mb-2 flex justify-between items-center"
                        >
                            Analysis
                            {#if subscriptionType === SUBSCRIPTION_TYPES.BASIC}
                                <Button
                                    type="button"
                                    variant="link"
                                    size="small"
                                    on:click={upgradePlan}
                                    class="text-base"
                                >
                                    Upgrade
                                </Button>
                            {/if}
                        </h3>

                        <!-- Reasons -->
                        <div class="grid grid-cols-1 gap-4">
                            <Input
                                label="Entry Reason"
                                type="text"
                                bind:value={form.entryReason}
                                placeholder="Why did you enter this trade?"
                                disabled={subscriptionType === SUBSCRIPTION_TYPES.BASIC}
                            />
                            {#if form.status === "CLOSED"}
                                <Input
                                    label="Exit Reason"
                                    type="text"
                                    bind:value={form.exitReason}
                                    placeholder="Why did you exit this trade?"
                                    disabled={subscriptionType === SUBSCRIPTION_TYPES.BASIC}
                                />
                            {/if}
                        </div>

                        <!-- Trade Levels -->
                        <div class="grid grid-cols-2 gap-4">
                            <Select
                                label="Confidence Level"
                                options={levelOptions}
                                bind:value={form.confidenceLevel}
                                disabled={subscriptionType === SUBSCRIPTION_TYPES.BASIC}
                            />
                            <Select
                                label="Greed Level"
                                options={levelOptions}
                                bind:value={form.greedLevel}
                                disabled={subscriptionType === SUBSCRIPTION_TYPES.BASIC}
                            />
                        </div>

                        <!-- Trade Settings -->
                        <div class="grid grid-cols-2 gap-4">
                            <label
                                class="flex items-center gap-1.5 p-1.5 rounded hover:bg-light-hover dark:hover:bg-dark-hover cursor-pointer group select-none"
                            >
                                <input
                                    type="checkbox"
                                    bind:checked={form.hasStopLoss}
                                    class="checkbox"
                                    disabled={subscriptionType === SUBSCRIPTION_TYPES.BASIC}
                                />
                                <span
                                    class="text-sm text-light-text-muted dark:text-dark-text-muted group-hover:text-light-text dark:group-hover:text-dark-text"
                                >
                                    Has Stop Loss
                                </span>
                            </label>
                            <label
                                class="flex items-center gap-1.5 p-1.5 rounded hover:bg-light-hover dark:hover:bg-dark-hover cursor-pointer group select-none"
                            >
                                <input
                                    type="checkbox"
                                    bind:checked={form.hasTakeProfit}
                                    class="checkbox"
                                    disabled={subscriptionType === SUBSCRIPTION_TYPES.BASIC}
                                />
                                <span
                                    class="text-sm text-light-text-muted dark:text-dark-text-muted group-hover:text-light-text dark:group-hover:text-dark-text"
                                >
                                    Has Take Profit
                                </span>
                            </label>
                        </div>
                    </div>

                    <!-- Additional Info Section -->
                    <div
                        class="bg-light-hover/30 dark:bg-dark-hover/30 rounded-md p-3 space-y-2"
                    >
                        <h3
                            class="text-base font-semibold text-light-text dark:text-dark-text mb-2 flex justify-between items-center"
                        >
                            Additional Information
                            {#if subscriptionType === SUBSCRIPTION_TYPES.BASIC}
                                <Button
                                    type="button"
                                    variant="link"
                                    size="small"
                                    on:click={upgradePlan}
                                    class="text-base"
                                >
                                    Upgrade
                                </Button>
                            {/if}
                        </h3>

                        <div class="space-y-3">
                            <Select
                                label="Emotions"
                                options={emotionOptions}
                                bind:value={form.emotions}
                                placeholder="How did you feel during this trade?"
                                disabled={subscriptionType === SUBSCRIPTION_TYPES.BASIC}
                            />
                            <div class="space-y-1">
                                <label
                                    for="trade-notes"
                                    class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted"
                                >
                                    Notes
                                </label>
                                <textarea
                                    id="trade-notes"
                                    bind:value={form.notes}
                                    rows="3"
                                    class="w-full px-2.5 py-1.5 text-sm rounded-md border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg resize-none"
                                    placeholder="Additional notes about the trade..."
                                    disabled={subscriptionType === SUBSCRIPTION_TYPES.BASIC}
                                />
                            </div>

                            <div class="space-y-1">
                                <label
                                    for="trade-url"
                                    class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted"
                                >
                                    URL
                                </label>
                                <input
                                    id="trade-url"
                                    type="url"
                                    bind:value={form.url}
                                    class="w-full px-2.5 py-1.5 h-8 text-sm rounded-md border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg"
                                    placeholder="Enter a URL (e.g., TradingView chart, image, etc.)"
                                    disabled={subscriptionType === SUBSCRIPTION_TYPES.BASIC}
                                />
                                {#if errors.url}
                                    <p class="text-sm text-red-500">{errors.url}</p>
                                {/if}
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            <!-- Footer -->
            <div
                class="px-4 py-2 border-t border-light-border dark:border-dark-border flex justify-between gap-4 sticky bottom-0 bg-light-card dark:bg-dark-card rounded-b-xl bg-opacity-90 dark:bg-opacity-90 z-10"
            >
                <div class="flex items-center">
                    {#if Object.keys(errors).length > 0}
                        <div class="flex items-center gap-2 text-red-500">
                            <svg
                                class="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            <span class="text-sm font-medium"
                                >Please fix the errors before submitting</span
                            >
                        </div>
                    {/if}
                </div>
                <div class="flex gap-4">
                    <Button type="button" variant="secondary" size="sm" on:click={handleClose}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        size="sm" on:click={handleSubmit}
                        class="min-w-[100px]"
                    >
                        Save Trade
                    </Button>
                </div>
            </div>
        </div>
    </div>
{/if}

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl shadow-xl;
    }



    .input-wrapper :global(input),
    .input-wrapper :global(.input) {
        @apply bg-light-bg dark:bg-dark-bg;
    }

    .input-wrapper :global(.input.error) {
        @apply border-red-500 focus:ring-red-500;
    }

    .input-wrapper :global(.input.success) {
        @apply border-green-500 focus:ring-green-500;
    }

    .input {
        @apply w-full px-2.5 py-1.5 text-sm rounded-md;
    }
    
    /* Hide number input spinners for decimal inputs */
    input[type="number"].no-spinners::-webkit-outer-spin-button,
    input[type="number"].no-spinners::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
    
    input[type="number"].no-spinners {
        -moz-appearance: textfield;
    }
    
    /* Override global input styles */
</style>