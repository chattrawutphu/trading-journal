<!-- src/lib/components/common/Loading.svelte -->
<script>
    export let message = 'Loading...';
    export let size = 'md'; // sm, md, lg
    export let overlay = false;

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
    <div class="fixed inset-0 bg-slate-900 bg-opacity-50 z-50 flex items-center justify-center">
        <div class="bg-slate-800 rounded-lg p-8 flex flex-col items-center space-y-4">
            <div class="animate-spin rounded-full border-t-2 border-b-2 border-blue-500 {sizeClasses[size]}"></div>
            <p class="text-slate-300 {textClasses[size]}">{message}</p>
        </div>
    </div>
{:else}
    <div class="flex flex-col items-center space-y-4 p-4">
        <div class="animate-spin rounded-full border-t-2 border-b-2 border-blue-500 {sizeClasses[size]}"></div>
        <p class="text-slate-300 {textClasses[size]}">{message}</p>
    </div>
{/if}

<style>
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
