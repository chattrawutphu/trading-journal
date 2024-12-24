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
    export let className = "";

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
                class="input {error ? 'error' : ''} {className}"
                type="text"
                bind:value
                {placeholder}
                {required}
                {disabled}
                {...$$restProps}
                on:input
                on:change
            />
        {:else if type === 'password'}
            <input
                class="input {error ? 'error' : ''} {className}"
                type="password"
                bind:value
                {placeholder}
                {required}
                {disabled}
                {...$$restProps}
                on:input
                on:change
            />
        {:else if type === 'number'}
            <input
                class="input {error ? 'error' : ''} {className}"
                type="number"
                bind:value
                {placeholder}
                {required}
                {disabled}
                {min}
                {max}
                {step}
                {...$$restProps}
                on:input
                on:change
            />
        {:else if type === 'datetime-local'}
            <input
                class="input {error ? 'error' : ''} {className}"
                type="datetime-local"
                bind:value
                {placeholder}
                {required}
                {disabled}
                {min}
                {max}
                {step}
                {...$$restProps}
                on:input
                on:change
            />
        {:else if type === 'date'}
            <input
                class="input {error ? 'error' : ''} {className}"
                type="date"
                bind:value
                {placeholder}
                {required}
                {disabled}
                {min}
                {max}
                {step}
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
        @apply w-full px-2.5 py-1.5 text-sm rounded-md;
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

    /* Adjust error message size */
    p.text-sm {
        @apply text-[13px];
    }
</style>
