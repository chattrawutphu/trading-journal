<script>
    import { createEventDispatcher } from 'svelte';
    import { fade } from 'svelte/transition';

    const dispatch = createEventDispatcher();
    export let show = false;
    export let showModal = false;
    export let width = '';
    export let maxWidth = '';
    export let size = '';
    export let hideHeader = false;
    export let title = '';
    
    $: isVisible = show || showModal;
</script>

{#if isVisible}
    <div 
        class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
        transition:fade={{ duration: 150 }}
        on:click|self={() => dispatch('close')}
    >
        <div 
            class="w-full {size ? `modal-${size}` : ''} {maxWidth || ''} {width || 'max-w-xl'} bg-light-card dark:bg-dark-card border border-light-border dark:border-0 
                   rounded-xl shadow-xl"
            on:click|stopPropagation
        >
            <!-- Header -->
            {#if !hideHeader}
            <div class="px-6 py-4 border-b border-light-border dark:border-dark-border flex justify-between items-start">
                <slot name="title">
                    {#if title}
                        <h2 class="text-xl font-bold text-light-text dark:text-dark-text">{title}</h2>
                    {/if}
                </slot>
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
            {/if}

            <!-- Content -->
            <div class="relative">
                <slot name="body">
                    <slot></slot>
                </slot>
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
    
    /* Size variants */
    .modal-sm {
        max-width: 24rem; /* 384px */
    }
    
    .modal-md {
        max-width: 28rem; /* 448px */
    }
    
    .modal-lg {
        max-width: 32rem; /* 512px */
    }
    
    .modal-xl {
        max-width: 36rem; /* 576px */
    }
    
    .modal-2xl {
        max-width: 42rem; /* 672px */
    }
    
    .modal-3xl {
        max-width: 48rem; /* 768px */
    }
    
    .modal-4xl {
        max-width: 56rem; /* 896px */
    }
    
    .modal-5xl {
        max-width: 64rem; /* 1024px */
    }
    
    .modal-6xl {
        max-width: 72rem; /* 1152px */
    }
    
    .modal-7xl {
        max-width: 80rem; /* 1280px */
    }
</style>