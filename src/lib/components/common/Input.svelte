<!-- src/lib/components/common/Input.svelte -->
<script>
    export let type = 'text';
    export let value = '';
    export let placeholder = '';
    export let label = '';
    export let error = '';
    export let required = false;
    export let icon = '';

    $: hasValue = value !== '' && value !== null && value !== undefined;
    $: isValid = hasValue && !error;
</script>

<div class="w-full">
    {#if label}
        <label class="block mb-2 text-sm font-medium text-light-text-muted dark:text-dark-text-muted">
            {label}
            {#if required}
                <span class="text-red-500">*</span>
            {/if}
        </label>
    {/if}
    
    <div class="relative">
        {#if icon}
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {@html icon}
            </div>
        {/if}

        <input
            {type}
            {placeholder}
            {required}
            bind:value
            class="
                input w-full transition-all duration-200
                {icon ? 'pl-10' : ''}
                {error ? 'border-red-500 focus:ring-red-500 pr-10' : ''}
                {isValid ? 'border-green-500 focus:ring-green-500 pr-10' : ''}
            "
            on:input
            on:change
        />

        {#if error}
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg 
                    class="h-5 w-5 text-red-500" 
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
            </div>
        {:else if isValid}
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg 
                    class="h-5 w-5 text-green-500" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                >
                    <path 
                        stroke-linecap="round" 
                        stroke-linejoin="round" 
                        stroke-width="2" 
                        d="M5 13l4 4L19 7" 
                    />
                </svg>
            </div>
        {/if}
    </div>
    
    {#if error}
        <p class="mt-1 text-sm text-red-500" transition:fade={{ duration: 150 }}>
            {error}
        </p>
    {/if}
</div>

<style>
    input {
        @apply transition-all duration-200;
    }

    /* Style placeholder */
    input::placeholder {
        @apply text-light-text-muted dark:text-dark-text-muted;
    }

    /* Style autofill */
    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus {
        -webkit-text-fill-color: var(--text-color);
        -webkit-box-shadow: 0 0 0px 1000px var(--bg-color) inset;
        transition: background-color 5000s ease-in-out 0s;
    }

    :global(.light) input:-webkit-autofill {
        --text-color: theme('colors.light.text');
        --bg-color: theme('colors.light.card');
    }

    :global(.dark) input:-webkit-autofill {
        --text-color: theme('colors.dark.text');
        --bg-color: theme('colors.dark.card');
    }

    /* Style number input arrows */
    input[type="number"]::-webkit-inner-spin-button,
    input[type="number"]::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    input[type="number"] {
        -moz-appearance: textfield;
    }

    /* Style date input */
    input[type="date"]::-webkit-calendar-picker-indicator,
    input[type="datetime-local"]::-webkit-calendar-picker-indicator {
        @apply dark:invert opacity-70 hover:opacity-100 cursor-pointer;
    }

    /* Style search input */
    input[type="search"]::-webkit-search-decoration,
    input[type="search"]::-webkit-search-cancel-button,
    input[type="search"]::-webkit-search-results-button,
    input[type="search"]::-webkit-search-results-decoration {
        -webkit-appearance: none;
    }
</style>
