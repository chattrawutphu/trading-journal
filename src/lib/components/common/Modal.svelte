
<script>
    export let visible = false;
</script>

{#if visible}
    <div class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <slot></slot>
        </div>
    </div>
{/if}