<script>
    import { createEventDispatcher } from "svelte";
    import Modal from '../common/Modal.svelte';
    import { api } from '$lib/utils/api';
    import Loading from '../common/Loading.svelte';
    import { formatShortDate } from '$lib/utils/date';

    const dispatch = createEventDispatcher();

    export let show = false;
    export let tag = null;
    export let tagColor = null;

    let loading = true;
    let error = null;
    let taggedDays = [];

    $: if (show && tag) {
        loadTaggedDays();
    }

    async function loadTaggedDays() {
        try {
            loading = true;
            error = null;
            // เพิ่ม endpoint ใหม่สำหรับดึงข้อมูลวันที่ใช้ tag นี้
            const days = await api.getTaggedDays(tag);
            taggedDays = days.sort((a, b) => new Date(b.date) - new Date(a.date));
        } catch (err) {
            error = err.message;
            console.error('Error loading tagged days:', err);
        } finally {
            loading = false;
        }
    }

    function handleDayClick(day) {
        dispatch('selectDay', day);
    }

    function handleClose() {
        show = false;
    }
</script>

<Modal {show} on:close={handleClose} let:closeModal>
    <div class="p-6">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
                <div class="flex items-center gap-1 px-3 py-1.5 rounded-full {tagColor.bg} {tagColor.text}">
                    <span class="text-sm font-medium">{tag}</span>
                </div>
                <h3 class="text-lg font-medium text-light-text dark:text-dark-text">
                    Tagged Days
                </h3>
            </div>
        </div>

        <!-- Content -->
        {#if loading}
            <Loading />
        {:else if error}
            <p class="text-red-500 text-sm">{error}</p>
        {:else if taggedDays.length === 0}
            <p class="text-center text-light-text-muted dark:text-dark-text-muted py-8">
                No days found with this tag
            </p>
        {:else}
            <div class="space-y-2">
                {#each taggedDays as day}
                    <button
                        class="w-full flex items-center justify-between p-3 rounded-lg
                               bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border
                               hover:bg-light-hover dark:hover:bg-dark-hover transition-colors duration-200"
                        on:click={() => handleDayClick(day)}
                    >
                        <div class="flex items-center gap-4">
                            <div class="text-left">
                                <p class="font-medium text-light-text dark:text-dark-text">
                                    {formatShortDate(day.date)}
                                </p>
                                {#if day.note}
                                    <p class="text-sm text-light-text-muted dark:text-dark-text-muted line-clamp-1">
                                        {day.note}
                                    </p>
                                {/if}
                            </div>
                        </div>
                        <div class="flex items-center gap-2 text-light-text-muted dark:text-dark-text-muted">
                            <span class="text-sm">
                                {day.tradesCount} {day.tradesCount === 1 ? 'trade' : 'trades'}
                            </span>
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                            </svg>
                        </div>
                    </button>
                {/each}
            </div>
        {/if}
    </div>
</Modal> 