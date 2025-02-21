<script>
    import { createEventDispatcher, onMount } from "svelte";
    import { fade } from "svelte/transition";
    import Button from "../common/Button.svelte";
    import Modal from '../common/Modal.svelte';
    import TradeOptionSelect from "../trades/TradeOptionSelect.svelte";
    import { dayConfigStore } from '$lib/stores/dayConfigStore';
    import { subscriptionStore } from '$lib/stores/subscriptionStore';
    import { SUBSCRIPTION_TYPES } from '$lib/config/subscription';
    import { goto } from '$app/navigation';

    const dispatch = createEventDispatcher();

    export let show = false;
    export let accountId;
    export let date;
    export let config = null;

    let formState = {
        note: '',
        tags: [],
        favorite: false
    };

    let error = null;
    let isSubmitting = false;

    function resetForm() {
        formState = {
            note: config?.note || '',
            tags: config?.tags || [],
            favorite: config?.favorite || false
        };
    }

    $: if (show || config) {
        resetForm();
    }

    function handleClose() {
        show = false;
        resetForm();
        dispatch('close');
    }

    async function handleSubmit() {
        if (isSubmitting) return;
        
        try {
            isSubmitting = true;
            error = null;

            const data = {
                account: accountId,
                date,
                note: formState.note,
                tags: formState.tags,
                favorite: formState.favorite
            };

            let updatedConfig;
            if (config) {
                updatedConfig = await dayConfigStore.updateConfig(accountId, date, data);
            } else {
                updatedConfig = await dayConfigStore.saveConfig(data);
            }

            dispatch('configUpdated', updatedConfig);
            handleClose();
        } catch (err) {
            error = err.message;
        } finally {
            isSubmitting = false;
        }
    }

    function handleTagSelect(event) {
        const tagValue = event.detail.value;
        const maxTags = subscriptionType === SUBSCRIPTION_TYPES.BASIC ? 3 : 7;
        
        if (formState.tags.length < maxTags && !formState.tags.includes(tagValue)) {
            formState.tags = [...formState.tags, tagValue];
        }
    }

    function removeTag(tag) {
        formState.tags = formState.tags.filter(t => t !== tag);
    }

    function getTagColor(tag) {
        const colors = [
            { bg: 'bg-blue-500/10', text: 'text-blue-500' },
            { bg: 'bg-green-500/10', text: 'text-green-500' },
            { bg: 'bg-purple-500/10', text: 'text-purple-500' },
            { bg: 'bg-orange-500/10', text: 'text-orange-500' },
            { bg: 'bg-pink-500/10', text: 'text-pink-500' },
            { bg: 'bg-teal-500/10', text: 'text-teal-500' },
            { bg: 'bg-indigo-500/10', text: 'text-indigo-500' },
        ];
        
        const hash = tag.split('').reduce((acc, char) => {
            return char.charCodeAt(0) + ((acc << 5) - acc);
        }, 0);
        
        return colors[Math.abs(hash) % colors.length];
    }

    function upgradePlan() {
        goto('/subscription');
    }

    $: subscriptionType = $subscriptionStore.type || SUBSCRIPTION_TYPES.BASIC;

    function handleNoteInput(event) {
        const maxLength = subscriptionType === SUBSCRIPTION_TYPES.BASIC ? 200 : 500;
        if (event.target.value.length > maxLength) {
            formState.note = event.target.value.slice(0, maxLength);
        }
    }
</script>

{#if show}
    <Modal 
        {show} 
        title="Day Configuration" 
        on:close={handleClose}
        let:closeModal
    >
        <form 
            class="p-4 space-y-4" 
            on:submit|preventDefault={handleSubmit}
            on:click|stopPropagation
        >
            <!-- Note Section -->
            <div class="space-y-2">
                <div class="flex justify-between items-center">
                    <label for="note" class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted">
                        Notes
                    </label>
                    <span class="text-xs text-light-text-muted dark:text-dark-text-muted">
                        {formState.note.length}/{subscriptionType === SUBSCRIPTION_TYPES.BASIC ? 200 : 500}
                    </span>
                </div>
                <textarea
                    id="note"
                    bind:value={formState.note}
                    on:input={handleNoteInput}
                    rows="4"
                    maxlength={subscriptionType === SUBSCRIPTION_TYPES.BASIC ? 200 : 500}
                    class="w-full px-3 py-2 text-sm rounded-md border border-light-border dark:border-0 
                           bg-light-bg dark:bg-dark-bg resize-none focus:ring-1 focus:ring-theme-500
                           focus:outline-none focus:border-theme-500"
                    placeholder="Add notes for this trading day..."
                    on:keydown|stopPropagation
                />
            </div>

            <!-- Tags Section -->
            <div class="space-y-2">
                <div class="flex justify-between items-center">
                    <label class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted">
                        Tags ({formState.tags.length}/{subscriptionType === SUBSCRIPTION_TYPES.BASIC ? 3 : 7})
                    </label>
                    <span class="text-xs text-light-text-muted dark:text-dark-text-muted">
                        {subscriptionType === SUBSCRIPTION_TYPES.BASIC ? 'Basic plan: 3 tags max' : 'Pro plan: 7 tags max'}
                    </span>
                </div>
                <div class="space-y-2">
                    <TradeOptionSelect
                        type="TAG"
                        placeholder="Add tags..."
                        value=""
                        on:change={handleTagSelect}
                    />
                    
                    {#if formState.tags.length > 0}
                        <div class="flex flex-wrap gap-2 mt-2">
                            {#each formState.tags as tag}
                                {@const tagColor = getTagColor(tag)}
                                <div class="flex items-center gap-1 px-2 py-1 rounded-full {tagColor.bg} {tagColor.text} text-sm">
                                    <span>{tag}</span>
                                    <button
                                        type="button"
                                        class="hover:opacity-75"
                                        on:click={() => removeTag(tag)}
                                    >
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                        </svg>
                                    </button>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            </div>

            <!-- Favorite Toggle -->
            <div class="flex items-center gap-2">
                <label class="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        bind:checked={formState.favorite}
                        class="checkbox"
                    />
                    <span class="text-sm text-light-text-muted dark:text-dark-text-muted">
                        Mark as favorite
                    </span>
                </label>
            </div>

            {#if error}
                <p class="text-sm text-red-500">{error}</p>
            {/if}

            <!-- Footer -->
            <div class="flex justify-end gap-4 pt-4 border-t border-light-border dark:border-dark-border">
                <Button type="button" variant="secondary" on:click={handleClose}>
                    Cancel
                </Button>
                <Button 
                    type="submit" 
                    variant="primary"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Saving...' : 'Save'}
                </Button>
            </div>
        </form>
    </Modal>
{/if}

<style lang="postcss">
    .upgrade-button-section {
        @apply px-3 py-1 rounded-full text-sm font-medium
        bg-gradient-to-r from-theme-500/10 to-theme-600/10
        text-theme-500
        transition-all duration-200
        hover:from-theme-500 hover:to-theme-600 hover:text-white
        focus:outline-none focus:ring-2 focus:ring-theme-500/50;
    }
</style> 