<script>
    export let label = "";
    export let value = "";
    export let options = [];
    export let placeholder = "";
    export let required = false;
    export let disabled = false;
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
        bind:value
        {required}
        {disabled}
        class="select"
        on:change
    >
        {#if placeholder}
            <option value="">{placeholder}</option>
        {/if}
        {#each options as option}
            <option value={option.value}>{option.label}</option>
        {/each}
    </select>
</div>

<style lang="postcss">
    .select {
        @apply w-full px-2.5 py-1.5 h-8 text-sm bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-md shadow-sm text-light-text dark:text-dark-text focus:outline-none focus:ring-1 focus:ring-theme-500 focus:border-transparent;
    }

    .select:disabled {
        @apply opacity-50 cursor-not-allowed;
    }

    /* Style for select options */
    .select option {
        @apply bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text py-1 text-sm;
    }
</style>
