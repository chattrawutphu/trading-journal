<!-- src/lib/components/common/Button.svelte -->
<script>
    export let type = 'button';
    export let variant = 'primary';
    export let size = 'md';
    export let disabled = false;
    export let loading = false;
    export let icon = '';
    export let iconPosition = 'left';
  
    const variants = {
    primary: 'bg-gradient-purple hover:bg-gradient-purple-dark text-white shadow-lg shadow-theme-500/25',
    secondary: 'bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text border border-light-border dark:border-dark-border hover:bg-light-hover dark:hover:bg-dark-hover',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/25',
    ghost: 'bg-transparent hover:bg-light-hover dark:hover:bg-dark-hover text-light-text dark:text-dark-text',
    tertiary: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/25' // สีฟ้าสดใส
};

    const sizes = {
        xs: 'px-2 py-1 text-xs',
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2',
        lg: 'px-6 py-3 text-lg'
    };

    $: isDisabled = disabled || loading;

    $: classes = `
        inline-flex items-center justify-center
        font-medium rounded-lg
        
        focus:outline-none focus:ring-2 focus:ring-offset-2 
        focus:ring-theme-500 dark:focus:ring-offset-dark-bg
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${loading ? 'cursor-wait' : ''}
    `;
</script>

<button
    {type}
    disabled={isDisabled}
    class={classes}
    on:click
>
    {#if loading}
        <svg 
            class="animate-spin -ml-1 mr-2 h-4 w-4" 
            fill="none" 
            viewBox="0 0 24 24"
        >
            <circle 
                class="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                stroke-width="4"
            />
            <path 
                class="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
        </svg>
        <span>Loading...</span>
    {:else}
        {#if icon && iconPosition === 'left'}
            <span class="mr-2">{@html icon}</span>
        {/if}
        <slot />
        {#if icon && iconPosition === 'right'}
            <span class="ml-2">{@html icon}</span>
        {/if}
    {/if}
</button>

<style lang="postcss">
    /* Gradient animation on hover for primary variant */
    button {
        background-size: 200% 200%;
        background-position: 0% 0%;
    }

    button:not(:disabled):hover {
        background-position: 100% 100%;
    }

    /* Ripple effect */
    button {
        position: relative;
        overflow: hidden;
    }

    button::after {
        content: '';
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        pointer-events: none;
        background-image: radial-gradient(circle, #fff 10%, transparent 10.01%);
        background-repeat: no-repeat;
        background-position: 50%;
        transform: scale(10, 10);
        opacity: 0;
        transition: transform .5s, opacity 1s;
    }

    button:active::after {
        transform: scale(0, 0);
        opacity: 0.3;
        transition: 0s;
    }

    /* Loading animation */
    .animate-spin {
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }
</style>
