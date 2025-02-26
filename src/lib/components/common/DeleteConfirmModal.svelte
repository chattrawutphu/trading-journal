<script>
    import Modal from './Modal.svelte';
    import Button from './Button.svelte';
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    export let show = false;
    export let type = '';
    export let context = '';
    export let count = 0;
    export let itemName = '';

    function getMessage() {
        if (type === 'selected') {
            return `Are you sure you want to delete ${count} selected ${context}?`;
        } else if (type === 'single') {
            return `Are you sure you want to delete ${itemName}?`;
        } else {
            return `Are you sure you want to delete all ${context}?`;
        }
    }
</script>

{#if show}
    <Modal
        {show}
        hideHeader={true}
        width="max-w-sm"
        on:close
    >
        <div class="px-6 py-5">
            <h3 class="text-lg font-medium text-light-text dark:text-dark-text mb-4">Confirm Delete</h3>
            <p class="text-light-text dark:text-dark-text">
                {getMessage()}
            </p>
            <div class="flex justify-end gap-3 mt-6">
                <Button
                    variant="secondary"
                    size="xs"
                    on:click={() => dispatch('close')}
                >
                    Cancel
                </Button>
                <Button
                    variant="danger"
                    size="xs"
                    on:click={() => dispatch('confirm')}
                >
                    Delete
                </Button>
            </div>
        </div>
    </Modal>
{/if} 