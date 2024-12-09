<script>
    import { fade } from 'svelte/transition';
    import { createEventDispatcher } from 'svelte';
    
    const dispatch = createEventDispatcher();
    export let show = false;
    export let closeOnClickOutside = true;
</script>

{#if show}
    <div 
        class="fixed inset-0 z-50 overflow-y-auto"
        transition:fade={{ duration: 150 }}
    >
        <div class="flex items-center align-middle content-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <!-- Background overlay -->
            <div 
                class="fixed inset-0 transition-opacity bg-black bg-opacity-50" 
                on:click={() => closeOnClickOutside && (dispatch('close'))}
                aria-hidden="true"
            ></div>

            <!-- Modal panel -->
            <button 
                type="button"
                class="relative inline-block p-4 overflow-hidden text-left align-middle transition-all transform bg-light-card dark:bg-dark-card rounded-lg shadow-xl sm:my-8 sm:max-w-lg sm:w-full"
                on:click|stopPropagation
                on:keydown|stopPropagation
            >
                <slot />
            </button>
        </div>
    </div>
{/if}