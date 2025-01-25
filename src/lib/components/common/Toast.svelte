<script>
    import { fly } from 'svelte/transition';
    export let type = 'success'; // success, error, info, warning
    export let message = '';
    export let duration = 3000;
    export let show = false;

    const icons = {
        success: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>`,
        error: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>`,
        info: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>`,
        warning: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>`
    };

    const styles = {
        success: 'bg-theme-500/10 text-theme-500 border border-theme-500/20',
        error: 'bg-red-500/10 text-red-500 border border-red-500/20',
        info: 'bg-theme-500/10 text-theme-500 border border-theme-500/20',
        warning: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
    };

    let timeoutId;

    $: if (show && duration) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            show = false;
        }, duration);
    }
</script>

{#if show}
    <div 
        class="fixed top-4 right-4 z-50"
        transition:fly={{ y: -30, duration: 300 }}
    >
        <div class="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg bg-light-card dark:bg-dark-card {styles[type]}">
            <div class="flex-shrink-0">
                {@html icons[type]}
            </div>
            <p class="text-sm font-medium">{message}</p>
            <button 
                class="ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 inline-flex items-center justify-center h-8 w-8 hover:bg-theme-500/10"
                on:click={() => show = false}
            >
                <span class="sr-only">Close</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        </div>
    </div>
{/if} 