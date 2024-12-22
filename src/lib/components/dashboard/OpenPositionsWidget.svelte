<script>
    import { onMount, afterUpdate } from 'svelte';

    export let trades = [];
    export let height;
    export let textSize;

    let openPositions = [];
    let currentIndex = 0;
    let cardsPerView = 1;
    let containerId = `container-${Math.random().toString(36).substr(2, 9)}`;


    $: if (trades) {
        calculateOpenPositions();
    }

    function calculateOpenPositions() {
        openPositions = trades.filter(t => t.status === 'OPEN');
        updateCardsPerView();
    }

    function updateCardsPerView() {
        const container = document.getElementById(containerId);
        if (container) {
            const containerWidth = container.offsetWidth;
            const cardWidth = 144; // 128px + 16px margin
            cardsPerView = Math.max(1, Math.floor(containerWidth / cardWidth));
            // Reset current index if needed
            if (currentIndex > openPositions.length - cardsPerView) {
                currentIndex = Math.max(0, openPositions.length - cardsPerView);
            }
        }
    }

    function next() {
        if (currentIndex < openPositions.length - cardsPerView) {
            currentIndex++;
        }
    }

    function prev() {
        if (currentIndex > 0) {
            currentIndex--;
        }
    }

    onMount(() => {
        calculateOpenPositions();
        updateCardsPerView();
        window.addEventListener('resize', updateCardsPerView);
    });

    afterUpdate(() => {
        updateCardsPerView();
    });

    // Add safe date formatting function
    function formatDate(dateString) {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return 'Invalid Date';
            }
            return date.toLocaleDateString();
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Invalid Date';
        }
    }
</script>

    <div class="card" style="height: {height || 140}px;">
        <div class="flex justify-between items-center mb-2 text-sm text-light-text dark:text-dark-text">
            <span>Open Positions</span>
            <span class="text-xs">{openPositions.length} {openPositions.length === 1 ? 'position' : 'positions'}</span>
        </div>
        <div id={containerId} class="overflow-hidden relative card-container px-2" style="max-height: {height - 40 || 100}px;">
            {#if openPositions.length > 0}
                <div class="flex gap-4 transition-transform duration-300" style="transform: translateX(-{currentIndex * (100 / cardsPerView)}%)">
                    {#each openPositions as position}
                        <div class="position-card p-4 rounded-lg shadow-md bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border flex-shrink-0 w-32 h-32">
                            <div class="text-lg font-semibold text-light-text dark:text-dark-text">{position.symbol}</div>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">
                                Entry Date: {formatDate(position.entryDate)}
                            </div>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">
                                Entry Price: ${position.entryPrice?.toFixed(2) || '0.00'}
                            </div>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">
                                Quantity: {position.quantity || 0}
                            </div>
                        </div>
                    {/each}
                </div>
                {#if openPositions.length > cardsPerView}
                    <button class="absolute left-0 top-1/2 transform -translate-y-1/2 p-2 bg-light-card dark:bg-dark-card rounded-full shadow-md" on:click={prev}>
                        <svg class="w-4 h-4 text-light-text dark:text-dark-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button class="absolute right-0 top-1/2 transform -translate-y-1/2 p-2 bg-light-card dark:bg-dark-card rounded-full shadow-md" on:click={next}>
                        <svg class="w-4 h-4 text-light-text dark:text-dark-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                {/if}
            {:else}
                <div class="text-center text-light-text-muted dark:text-dark-text-muted">
                    No open positions
                </div>
            {/if}
        </div>
    </div>

<style>
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-lg;
    }
    .position-card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-lg;
    }

    /* Add new styles for card spacing */
    .card-container {
        scroll-behavior: smooth;
    }
    
    .position-card {
        transition: transform 0.2s ease-in-out;
    }
    
    .position-card:hover {
        transform: translateY(-2px);
    }
</style>
