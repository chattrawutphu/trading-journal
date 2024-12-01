<!-- src/lib/components/common/Loading.svelte -->
<script>
    export let message = 'Loading...';
    export let size = 'md'; // sm, md, lg
    export let overlay = false;
    export let type = 'spinner'; // spinner, pulse, dots

    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12'
    };

    const textClasses = {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg'
    };
</script>

{#if overlay}
    <div class="fixed inset-0 bg-light-bg/50 dark:bg-dark-bg/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div class="card p-8 flex flex-col items-center space-y-4">
            {#if type === 'spinner'}
                <div class="relative {sizeClasses[size]}">
                    <div class="absolute inset-0 rounded-full border-2 border-light-border dark:border-dark-border"></div>
                    <div class="absolute inset-0 rounded-full border-t-2 border-theme-500 animate-spin"></div>
                </div>
            {:else if type === 'pulse'}
                <div class="flex space-x-1">
                    <div class="w-2 h-2 bg-theme-500 rounded-full animate-pulse-1"></div>
                    <div class="w-2 h-2 bg-theme-500 rounded-full animate-pulse-2"></div>
                    <div class="w-2 h-2 bg-theme-500 rounded-full animate-pulse-3"></div>
                </div>
            {:else if type === 'dots'}
                <div class="flex space-x-1">
                    <div class="w-2 h-2 bg-theme-500 rounded-full animate-bounce-1"></div>
                    <div class="w-2 h-2 bg-theme-500 rounded-full animate-bounce-2"></div>
                    <div class="w-2 h-2 bg-theme-500 rounded-full animate-bounce-3"></div>
                </div>
            {/if}
            <p class="text-light-text dark:text-dark-text {textClasses[size]}">{message}</p>
        </div>
    </div>
{:else}
    <div class="flex flex-col items-center space-y-4 p-4">
        {#if type === 'spinner'}
            <div class="relative {sizeClasses[size]}">
                <div class="absolute inset-0 rounded-full border-2 border-light-border dark:border-dark-border"></div>
                <div class="absolute inset-0 rounded-full border-t-2 border-theme-500 animate-spin"></div>
            </div>
        {:else if type === 'pulse'}
            <div class="flex space-x-1">
                <div class="w-2 h-2 bg-theme-500 rounded-full animate-pulse-1"></div>
                <div class="w-2 h-2 bg-theme-500 rounded-full animate-pulse-2"></div>
                <div class="w-2 h-2 bg-theme-500 rounded-full animate-pulse-3"></div>
            </div>
        {:else if type === 'dots'}
            <div class="flex space-x-1">
                <div class="w-2 h-2 bg-theme-500 rounded-full animate-bounce-1"></div>
                <div class="w-2 h-2 bg-theme-500 rounded-full animate-bounce-2"></div>
                <div class="w-2 h-2 bg-theme-500 rounded-full animate-bounce-3"></div>
            </div>
        {/if}
        <p class="text-light-text dark:text-dark-text {textClasses[size]}">{message}</p>
    </div>
{/if}

<style>
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-lg transition-colors duration-200;
    }

    .animate-spin {
        animation: spin 1s linear infinite;
    }

    .animate-pulse-1 {
        animation: pulse 1.4s ease-in-out infinite;
    }

    .animate-pulse-2 {
        animation: pulse 1.4s ease-in-out 0.2s infinite;
    }

    .animate-pulse-3 {
        animation: pulse 1.4s ease-in-out 0.4s infinite;
    }

    .animate-bounce-1 {
        animation: bounce 0.6s ease-in-out infinite;
    }

    .animate-bounce-2 {
        animation: bounce 0.6s ease-in-out 0.2s infinite;
    }

    .animate-bounce-3 {
        animation: bounce 0.6s ease-in-out 0.4s infinite;
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    @keyframes pulse {
        0%, 100% {
            opacity: 1;
            transform: scale(1);
        }
        50% {
            opacity: 0.5;
            transform: scale(0.8);
        }
    }

    @keyframes bounce {
        0%, 100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-4px);
        }
    }
</style>
