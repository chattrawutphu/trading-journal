<script>
    export let type = "text";
    export let value = "";
    export let label = "";
    export let placeholder = "";
    export let required = false;
    export let error = "";
    export let disabled = false;
    export let min = undefined;
    export let max = undefined;
    export let step = undefined;

    // For datetime-local inputs, set max to current date-time if not provided
    $: if (type === 'datetime-local' && max === undefined) {
        max = new Date().toLocaleString('sv').slice(0, 16); // Use user's local time
    }
</script>

<div class="space-y-1">
    {#if label}
        <label class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted">
            {label}
            {#if required}
                <span class="text-red-500">*</span>
            {/if}
        </label>
    {/if}
    <div class="relative">
        {#if type === 'text'}
            <input
                class="input {error ? 'error' : ''}"
                type="text"
                bind:value
                {placeholder}
                {...$$restProps}
                on:input
                on:change
            />
        {:else if type === 'password'}
            <input
                class="input {error ? 'error' : ''}"
                type="password"
                bind:value
                {placeholder}
                {...$$restProps}
                on:input
                on:change
            />
        {:else if type === 'number'}
            <input
                class="input {error ? 'error' : ''}"
                type="number"
                bind:value
                {placeholder}
                {...$$restProps}
                on:input
                on:change
            />
        {:else if type === 'datetime-local'}
            <input
                class="input {error ? 'error' : ''}"
                type="datetime-local"
                bind:value
                {placeholder}
                {...$$restProps}
                on:input
                on:change
            />
        {/if}
    </div>
    {#if error}
        <p class="text-sm text-red-500">{error}</p>
    {/if}
</div>

<style lang="postcss">
    .input {
        @apply w-full px-3 py-2 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg shadow-sm text-light-text dark:text-dark-text placeholder-light-text-muted dark:placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-theme-500 focus:border-transparent transition-colors duration-200;
    }

    .input.error {
        @apply border-red-500 focus:ring-red-500;
    }

    .input:disabled {
        @apply opacity-50 cursor-not-allowed;
    }

    /* Style for disabled dates in datetime-local input */
    input[type="datetime-local"]::-webkit-calendar-picker-indicator {
        background-color: transparent;
    }

    input[type="datetime-local"]:in-range::-webkit-datetime-edit-year-field,
    input[type="datetime-local"]:in-range::-webkit-datetime-edit-month-field,
    input[type="datetime-local"]:in-range::-webkit-datetime-edit-day-field,
    input[type="datetime-local"]:in-range::-webkit-datetime-edit-text {
        @apply text-light-text dark:text-dark-text;
    }

    input[type="datetime-local"]:out-of-range::-webkit-datetime-edit-year-field,
    input[type="datetime-local"]:out-of-range::-webkit-datetime-edit-month-field,
    input[type="datetime-local"]:out-of-range::-webkit-datetime-edit-day-field,
    input[type="datetime-local"]:out-of-range::-webkit-datetime-edit-text {
        @apply text-red-500;
    }
</style>
