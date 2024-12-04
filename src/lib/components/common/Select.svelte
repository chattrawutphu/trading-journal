<script>
    export let options = [];
    export let value = '';
    export let label = '';
    export let placeholder = '';
    export let required = false;
    export let error = '';
    export let className = '';

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
        <select
            bind:value
            {required}
            class="
                input w-full appearance-none pr-10
                {className}
                {error ? 'border-red-500 focus:ring-red-500' : ''}
                {isValid ? 'border-green-500 focus:ring-green-500' : ''}
            "
            on:change
        >
            {#if placeholder}
                <option value="">{placeholder}</option>
            {/if}
            {#each options as option}
                <option value={option.value}>
                    {option.label}
                </option>
            {/each}
        </select>

        <!-- Chevron icon -->
        <div class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <svg class="w-5 h-5 text-light-text-muted dark:text-dark-text-muted" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
        </div>

        {#if error}
            <div class="absolute inset-y-0 right-8 flex items-center pointer-events-none">
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
            <div class="absolute inset-y-0 right-8 flex items-center pointer-events-none">
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
    select {
        @apply transition-all duration-200;
    }

    /* Style placeholder option */
    select option[value=""] {
        @apply text-light-text-muted dark:text-dark-text-muted;
    }
</style>
