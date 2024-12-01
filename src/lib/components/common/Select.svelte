<!-- src/lib/components/common/Select.svelte -->
<script>
    export let options = [];
    export let value = '';
    export let label = '';
    export let error = '';
    export let required = false;
    export let placeholder = 'Select an option';
</script>

<div class="w-full">
    {#if label}
        <label class="block mb-2 text-sm font-medium ttext-light-text-muted dark:text-dark-text-muted">
            {label}
            {#if required}
                <span class="text-red-500">*</span>
            {/if}
        </label>
    {/if}

    <div class="relative">
        <select
            bind:value
            {required}
            class="input w-full appearance-none pr-10 {error ? 'border-red-500 focus:ring-red-500' : ''}"
            on:change
        >
            <option value="" disabled>{placeholder}</option>
            {#each options as option}
                <option value={option.value}>
                    {option.label}
                </option>
            {/each}
        </select>

        <!-- Custom arrow icon -->
        <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
            <svg 
                class="w-5 h-5 text-light-text-muted dark:text-dark-text-muted"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
            >
                <path 
                    stroke-linecap="round" 
                    stroke-linejoin="round" 
                    stroke-width="2" 
                    d="M19 9l-7 7-7-7"
                />
            </svg>
        </div>
    </div>

    {#if error}
        <p class="mt-1 text-sm text-red-500">{error}</p>
    {/if}
</div>

<style>
    /* Hide default select arrow in modern browsers */
    select {
        -webkit-appearance: none;
        -moz-appearance: none;
        text-indent: 1px;
        text-overflow: '';
    }

    /* Hide default select arrow in IE */
    select::-ms-expand {
        display: none;
    }

    /* Style select options */
    :global(select option) {
        @apply bg-light-card dark:bg-dark-card text-light-text-muted dark:text-dark-text;
        padding: 0.5rem;
    }

    /* Style disabled option */
    :global(select option:disabled) {
        @apply text-light-text-muted dark:text-dark-text-muted;
    }

    /* Style select on hover */
    select:not(:disabled):hover {
        @apply cursor-pointer bg-light-hover dark:bg-dark-hover;
    }

    /* Style focused select */
    select:focus {
        @apply outline-none ring-2 ring-theme-500 ring-offset-2 ring-offset-light-bg dark:ring-offset-dark-bg border-transparent;
    }
</style>
