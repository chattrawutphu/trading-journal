<script>
    export let options = [];
    export let value = "";
    export let label = "";
    export let placeholder = "";
    export let required = false;
    export let error = "";
    export let disabled = false;
    export let className = "";
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
    <select
        class="select {error ? 'error' : ''} {className}"
        bind:value
        {required}
        {disabled}
        on:change
    >
        {#if placeholder}
            <option value="">{placeholder}</option>
        {/if}
        {#each options as option}
            <option value={option.value}>{option.label}</option>
        {/each}
    </select>
    {#if error}
        <p class="text-sm text-red-500">{error}</p>
    {/if}
</div>

<style lang="postcss">
    .select {
        @apply w-full px-3 py-2 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg shadow-sm text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-theme-500 focus:border-transparent ;
    }

    .select.error {
        @apply border-red-500 focus:ring-red-500;
    }

    .select:disabled {
        @apply opacity-50 cursor-not-allowed;
    }
</style>
