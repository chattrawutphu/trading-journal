<script>
    import { createEventDispatcher } from 'svelte';
    import { fade } from 'svelte/transition';

    const dispatch = createEventDispatcher();
    export let show = false;
    export let width = '';
</script>

{#if show}
    <div 
        class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
        transition:fade={{ duration: 150 }}
        on:click|self={() => dispatch('close')}
    >
        <div 
            class="w-full {width} bg-light-card dark:bg-dark-card border border-light-border dark:border-0 
                   rounded-xl shadow-xl"
            on:click|stopPropagation
        >
            <!-- Header -->
            <div class="px-6 py-4 border-b border-light-border dark:border-dark-border flex justify-between items-start">
                <slot name="title"></slot>
                <button 
                    class="p-1 rounded-lg text-light-text-muted dark:text-dark-text-muted 
                           hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover"
                    on:click={() => dispatch('close')}
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>

            <!-- Content -->
            <div class="relative">
                <slot></slot>
            </div>

            <!-- Footer -->
            <slot name="footer"></slot>
        </div>
    </div>
{/if}

<style>
    /* ทำให้ Modal อยู่เหนือทุกอย่าง */
    div {
        isolation: isolate;
    }
</style>