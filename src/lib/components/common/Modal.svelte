<script>
    import { fade } from 'svelte/transition';
    import { createEventDispatcher } from 'svelte';
    
    const dispatch = createEventDispatcher();
    export let show = false;
    export let closeOnClickOutside = true;
    export let title = '';
    export let maxWidth = 'max-w-lg';
</script>

{#if show}
    <div 
        class="fixed inset-0 z-50 overflow-y-auto"
        transition:fade={{ duration: 200 }}
    >
        <!-- Backdrop -->
        <div 
            class="fixed inset-0 bg-black/50 dark:bg-black/70"
            on:click={() => closeOnClickOutside && (dispatch('close'))}
        ></div>

        <!-- Modal Container -->
        <div class="relative min-h-screen flex items-center justify-center p-4">
            <!-- Modal Content -->
            <div 
                class="relative w-full {maxWidth} bg-light-card dark:bg-dark-card rounded-lg shadow-xl"
                on:click|stopPropagation
            >
                <!-- Header -->
                {#if title}
                    <div class="px-6 py-4 border-b border-light-border dark:border-dark-border">
                        <h3 class="text-lg font-medium text-light-text dark:text-dark-text">
                            {title}
                        </h3>
                    </div>
                {/if}

                <!-- Body -->
                <div class="p-6">
                    <slot></slot>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    /* Add smooth transitions */
    .fixed {
        transition: all 0.2s ease-in-out;
    }

    /* Ensure modal is always centered */
    .min-h-screen {
        min-height: 100vh;
    }

    /* Add responsive padding */
    @media (min-width: 640px) {
        .p-4 {
            padding: 1.5rem;
        }
    }

    @media (min-width: 1024px) {
        .p-4 {
            padding: 2rem;
        }
    }
</style>