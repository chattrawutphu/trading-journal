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
    let touched = {};
    let previousSymbol = "";

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
        return now.toLocaleString('sv-SE', { hour12: false }).slice(0, 16); // Use local date and time
    }

    let form = {
        entryDate: '', // เริ่มต้นค่า entryDate
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

    // Helper function to format ISO date to 'YYYY-MM-DDTHH:mm'
    function formatDateTimeLocal(dateInput) {
        let date;
        if (dateInput instanceof Date) {
            date = dateInput;
        } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
            date = new Date(dateInput);
        } else {
            // ถ้า dateInput เป็น null หรือ undefined ให้ใช้วันที่ปัจจุบัน
            date = new Date();
        }

        if (isNaN(date.getTime())) {
            // ถ้าไม่สามารถแปลงเป็น Date ที่ถูกต้องได้ ให้ใช้วันที่ปัจจุบัน
            date = new Date();
        }

        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - (offset * 60 * 1000));
        return localDate.toISOString().slice(0,16);
    }

    // ใช้ statement แบบ reactive เพื่ออัพเดต form.entryDate
    $: if (show) {
        if (trade && trade.entryDate) {
            form.entryDate = formatDateTimeLocal(trade.entryDate);
        } else if ($tradeDate) {
            // ตั้งเวลาเป็น 7:00 น. เมื่อใช้วันที่จาก store
            const dateFromStore = new Date($tradeDate);
            dateFromStore.setHours(7, 0, 0, 0);
            form.entryDate = formatDateTimeLocal(dateFromStore);
            tradeDate.set(null); // รีเซ็ต tradeDate หลังจากใช้งาน
        } else {
            // ใช้วันที่และเวลา local ปัจจุบัน
            form.entryDate = formatDateTimeLocal(new Date());
        }
    }

    // If editing an existing trade, populate form with trade data
    if (trade) {
        form = {
            ...trade,
            entryDate: trade.entryDate
                ? formatDateTimeLocal(trade.entryDate)
                : getCurrentDateTime(),
            exitDate: trade.exitDate
                ? new Date(trade.exitDate).toISOString().slice(0, 16)
                : getCurrentDateTime(),
        };
        previousSymbol = trade.symbol;
    } else {
        // Use the tradeDate store value if available
        $: if ($tradeDate) {
            form.entryDate = formatDateTimeLocal($tradeDate);
            tradeDate.set(null); // Clear the store after using
        } else {
            form.entryDate = formatDateTimeLocal(new Date().toISOString()); // Default to current date
        }
    }

    $: if (form.status === "CLOSED" && !form.exitDate) {
        form.exitDate = getCurrentDateTime();
    }

    function calculatePnL() {
        if (form.exitPrice && form.entryPrice && form.amount) {
            if (form.side === "LONG") {
                form.pnl = (form.exitPrice - form.entryPrice) * form.amount;
            } else {
                form.pnl = (form.entryPrice - form.exitPrice) * form.amount;
            }
            validateField("pnl");
        }
    }

    function validateField(field) {
        touched[field] = true;
        errors = validateTradeForm(form);
    }

    function handleInput(field) {
        return () => validateField(field);
    }

    function handleSubmit() {
        errors = validateTradeForm(form);

        if (Object.keys(errors).length > 0) {
            Object.keys(form).forEach((key) => (touched[key] = true));
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

    function close() {
        dispatch("close");
        form = {
            account: accountId,
            entryDate: getCurrentDateTime(), // Reset to current date and time
            exitDate: getCurrentDateTime(), // Reset to current date and time
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
        touched = {};
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
        class="fixed modal inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        transition:fade={{ duration: 150 }}>
        <div class="card w-full max-w-4xl mx-auto relative transform ease-out">
            <!-- Header -->
            <div
                class="px-8 py-5 border-b border-light-border dark:border-dark-border flex justify-between items-center sticky top-0 bg-light-card dark:bg-dark-card rounded-t-xl bg-opacity-90 dark:bg-opacity-90 z-10"
            >
                <div class="flex items-center gap-3">
                    <h2
                        class="text-2xl font-bold bg-gradient-to-r from-theme-500 to-theme-600 bg-clip-text text-transparent"
                    >
                        {trade ? "Edit Trade" : "New Trade"}
                    </h2>
                    {#if form.symbol}
                        <div
                            class="text-sm px-3 py-1 rounded-full bg-light-hover dark:bg-dark-hover text-light-text-muted dark:text-dark-text-muted"
                        >
                            {form.symbol}
                        </div>
                    {/if}
                </div>
                {#if subscriptionType === SUBSCRIPTION_TYPES.BASIC}
                    <Button
                        type="button"
                        variant="secondary"
                        size="small"
                        on:click={upgradePlan}
                        class="text-sm"
                    >
                        Upgrade Plan
                    </Button>
                {/if}
            </div>

            <!-- Scrollable Content -->
            <div class="px-8 py-6 max-h-[calc(100vh-16rem)] overflow-y-auto">
                <form on:submit|preventDefault={handleSubmit} class="space-y-3">
                    <!-- Basic Info Section -->
                    <div
                        class="bg-light-hover/30 dark:bg-dark-hover/30 rounded-xl p-6 space-y-3"
                    >
                        <h3
                            class="text-lg font-semibold text-light-text dark:text-dark-text mb-4"
                        >
                            Trade Details
                        </h3>

                        <div class="grid grid-cols-2 gap-6">
                            <div>
                                <label
                                for="trade-symbol"
                                    class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-2"
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
                                        on:input={handleInput("symbol")}
                                        {accountId}
                                    />
                                </div>
                                {#if touched.symbol && errors.symbol}
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

                        <div class="grid grid-cols-2 gap-6">
                            <Select
                                label="Status"
                                options={statusOptions}
                                bind:value={form.status}
                                required
                            />
                            <div>
                                <label
                                    for="trade-strategy"
                                    class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-2"
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
                        class="bg-light-hover/30 dark:bg-dark-hover/30 rounded-xl p-6 space-y-3"
                    >
                        <h3
                            class="text-lg font-semibold text-light-text dark:text-dark-text mb-4"
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
                                    error={touched.entryDate &&
                                        errors.entryDate}
                                    on:input={handleInput("entryDate")}
                                />
                                {#if form.status === "CLOSED"}
                                    <Input
                                        label="Exit Date"
                                        type="datetime-local"
                                        bind:value={form.exitDate}
                                        max={new Date().toLocaleString('sv-SE', { hour12: false }).slice(0, 16)}
                                        required
                                        error={touched.exitDate &&
                                            errors.exitDate}
                                        on:input={handleInput("exitDate")}
                                    />
                                {/if}
                                <Input
                                    label="Quantity"
                                    type="number"
                                    step="0.00000001"
                                    bind:value={form.quantity}
                                    placeholder="0.00"
                                    error={touched.quantity && errors.quantity}
                                    on:input={handleInput("quantity")}
                                />
                                <Input
                                    label="Leverage"
                                    type="number"
                                    step="1"
                                    min="1"
                                    bind:value={form.leverage}
                                    placeholder="1"
                                    error={touched.leverage && errors.leverage}
                                    on:input={handleInput("leverage")}
                                />
                            </div>

                            <!-- Right Column -->
                            <div class="space-y-4">
                                <Input
                                    label="Entry Price"
                                    type="number"
                                    step="0.00000001"
                                    bind:value={form.entryPrice}
                                    required
                                    placeholder="0.00"
                                    error={touched.entryPrice &&
                                        errors.entryPrice}
                                    on:input={handleInput("entryPrice")}
                                />
                                {#if form.status === "CLOSED"}
                                    <Input
                                        label="Exit Price"
                                        type="number"
                                        step="0.00000001"
                                        bind:value={form.exitPrice}
                                        required
                                        placeholder="0.00"
                                        error={touched.exitPrice &&
                                            errors.exitPrice}
                                        on:input={handleInput("exitPrice")}
                                    />
                                {/if}
                                <Input
                                    label="Amount (USD)"
                                    type="number"
                                    step="0.01"
                                    bind:value={form.amount}
                                    required
                                    placeholder="0.00"
                                    error={touched.amount && errors.amount}
                                    on:input={handleInput("amount")}
                                />
                                {#if form.status === "CLOSED"}
                                    <div class="flex items-end gap-2">
                                        <Input
                                            label="P&L"
                                            type="number"
                                            step="0.01"
                                            bind:value={form.pnl}
                                            required
                                            placeholder="0.00"
                                            error={touched.pnl && errors.pnl}
                                            on:input={handleInput("pnl")}
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
                        class="bg-light-hover/30 dark:bg-dark-hover/30 rounded-xl p-6 space-y-3"
                    >
                        <h3
                            class="text-lg font-semibold text-light-text dark:text-dark-text mb-4 flex justify-between items-center"
                        >
                            Analysis
                            {#if subscriptionType === SUBSCRIPTION_TYPES.BASIC}
                                <Button
                                    type="button"
                                    variant="link"
                                    size="small"
                                    on:click={upgradePlan}
                                    class="text-sm"
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
                        <div class="grid grid-cols-2 gap-6">
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
                        <div class="grid grid-cols-2 gap-6">
                            <label
                                class="flex items-center gap-3 p-3 rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover  cursor-pointer group"
                            >
                                <input
                                    type="checkbox"
                                    bind:checked={form.hasStopLoss}
                                    class="checkbox"
                                    disabled={subscriptionType === SUBSCRIPTION_TYPES.BASIC}
                                />
                                <span
                                    class="text-light-text-muted dark:text-dark-text-muted group-hover:text-light-text dark:group-hover:text-dark-text "
                                >
                                    Has Stop Loss
                                </span>
                            </label>
                            <label
                                class="flex items-center gap-3 p-3 rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover  cursor-pointer group"
                            >
                                <input
                                    type="checkbox"
                                    bind:checked={form.hasTakeProfit}
                                    class="checkbox"
                                    disabled={subscriptionType === SUBSCRIPTION_TYPES.BASIC}
                                />
                                <span
                                    class="text-light-text-muted dark:text-dark-text-muted group-hover:text-light-text dark:group-hover:text-dark-text "
                                >
                                    Has Take Profit
                                </span>
                            </label>
                        </div>
                    </div>

                    <!-- Additional Info Section -->
                    <div
                        class="bg-light-hover/30 dark:bg-dark-hover/30 rounded-xl p-6 space-y-3"
                    >
                        <h3
                            class="text-lg font-semibold text-light-text dark:text-dark-text mb-4 flex justify-between items-center"
                        >
                            Additional Information
                            {#if subscriptionType === SUBSCRIPTION_TYPES.BASIC}
                                <Button
                                    type="button"
                                    variant="link"
                                    size="small"
                                    on:click={upgradePlan}
                                    class="text-sm"
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
                            <div>
                                <label
                                for="trade-notes"
                                    class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-2"
                                >
                                    Notes
                                </label>
                                <textarea
                                id="trade-notes"
                                    bind:value={form.notes}
                                    rows="3"
                                    class="input w-full resize-none"
                                    placeholder="Additional notes about the trade..."
                                />
                            </div>

                            <Input
                                label="URL"
                                type="url"
                                bind:value={form.url}
                                placeholder="Enter a URL (e.g., TradingView chart, image, etc.)"
                                error={touched.url && errors.url}
                                on:input={handleInput("url")}
                                disabled={subscriptionType === SUBSCRIPTION_TYPES.BASIC}
                            />
                        </div>
                    </div>
                </form>
            </div>

            <!-- Footer -->
            <div
                class="px-8 py-5 border-t border-light-border dark:border-dark-border flex justify-between gap-4 sticky bottom-0 bg-light-card dark:bg-dark-card rounded-b-xl bg-opacity-90 dark:bg-opacity-90 z-10"
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
                    <Button type="button" variant="secondary" size="sm" on:click={close}>
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
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl shadow-xl ;
    }

    .checkbox {
        @apply h-5 w-5 rounded border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-theme-500 focus:ring-theme-500 focus:ring-offset-2 focus:ring-offset-light-bg dark:focus:ring-offset-dark-bg ;
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
</style>