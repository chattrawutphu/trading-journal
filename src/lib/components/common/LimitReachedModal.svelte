<script>
    import { createEventDispatcher } from 'svelte';
    import Modal from './Modal.svelte';
    import { goto } from '$app/navigation';

    const dispatch = createEventDispatcher();

    export let show = false;
    export let title = "Limit Reached";
    export let description = "";
    export let upgradeText = "Upgrade to Pro";
    export let cancelText = "Cancel";
    export let showContinueButton = false;
    export let width = "sm"; // xs, sm, md

    const widthClasses = {
        xs: "max-w-xs",
        sm: "max-w-sm",
        md: "max-w-md"
    };

    function upgradePlan() {
        goto('/settings/subscription');
        dispatch('upgrade');
    }

    function handleClose() {
        dispatch('close');
    }

    function handleContinue() {
        dispatch('continue');
    }
</script>

<Modal {show} {title} on:close={handleClose}>
    <div class="p-5 {widthClasses[width]} mx-auto">
        <div class="flex items-start gap-3">
            <div class="flex-shrink-0 mt-0.5">
                <svg class="w-5 h-5 text-theme-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm text-light-text-muted dark:text-dark-text-muted mb-4">
                    {description}
                </p>
                <div class="flex flex-col gap-2">
                    <button
                        class="w-full px-4 py-2 text-sm bg-theme-500 text-white rounded-md hover:bg-theme-600 transition-colors"
                        on:click={upgradePlan}
                    >
                        {upgradeText}
                    </button>
                    {#if showContinueButton}
                        <div class="flex gap-2">
                            <button
                                class="flex-1 px-4 py-2 text-sm border border-light-border dark:border-dark-border rounded-md
                                    text-light-text dark:text-dark-text
                                    hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
                                on:click={handleClose}
                            >
                                {cancelText}
                            </button>
                            <button
                                class="flex-1 px-4 py-2 text-sm bg-light-hover dark:bg-dark-hover rounded-md
                                    text-light-text dark:text-dark-text
                                    hover:bg-light-hover/80 dark:hover:bg-dark-hover/80 transition-colors"
                                on:click={handleContinue}
                            >
                                Add Trade Anyway
                            </button>
                        </div>
                    {:else}
                        <button
                            class="w-full px-4 py-2 text-sm border border-light-border dark:border-dark-border rounded-md
                                text-light-text dark:text-dark-text
                                hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
                            on:click={handleClose}
                        >
                            {cancelText}
                        </button>
                    {/if}
                </div>
            </div>
        </div>
    </div>
</Modal> 