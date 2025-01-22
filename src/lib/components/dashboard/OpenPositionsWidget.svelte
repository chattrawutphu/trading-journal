<script>
    import { onMount, createEventDispatcher } from 'svelte';
    import { slide } from 'svelte/transition';
    import { deleteModalStore } from '$lib/stores/modalStore';
    import { goto } from '$app/navigation';
    import { api } from '$lib/utils/api';
    import TradeViewModal from "$lib/components/trades/TradeViewModal.svelte";
    import TradeModal from "$lib/components/trades/TradeModal.svelte";

    const dispatch = createEventDispatcher();

    export let trades = [];
    export let height;
    export let textSize;
    export let isPreview = false;

    let openPositions = [];
    let totalInvested = 0;
    let showAllPositions = false;
    let showViewModal = false;
    let showEditModal = false;
    let selectedTrade = null;

    $: if (trades) {
        calculatePositions();
    }

    function calculatePositions() {
        if (!Array.isArray(trades)) {
            openPositions = [];
            totalInvested = 0;
            return;
        }

        openPositions = trades.filter(t => t && t.status === 'OPEN')
            .map(position => {
                if (!position) return null;
                
                const entryPrice = Number(position.entryPrice) || 0;
                const quantity = Number(position.quantity) || 0;
                const amount = parseFloat((entryPrice * quantity).toFixed(2));
                
                console.log('Position calculation:', {
                    symbol: position.symbol,
                    entryPrice,
                    quantity,
                    amount
                });
                
                return {
                    ...position,
                    entryPrice,
                    quantity,
                    amount,
                    entryDate: new Date(position.entryDate || Date.now())
                };
            })
            .filter(Boolean)
            .sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate));

        totalInvested = openPositions.reduce((sum, pos) => {
            const posAmount = Number(pos.amount) || 0;
            return sum + posAmount;
        }, 0);

        console.log('Total invested:', totalInvested);
    }

    function formatCurrency(value) {
        if (value === undefined || value === null || isNaN(value)) {
            return '$0';
        }
        try {
            const numValue = Number(value);
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }).format(numValue);
        } catch (error) {
            console.error('Error formatting currency:', error, 'Value:', value);
            return '$0';
        }
    }

    function formatDate(date) {
        if (!date) return '-';
        try {
            return new Date(date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return '-';
        }
    }

    function getDaysSinceEntry(entryDate) {
        if (!entryDate) return 0;
        try {
            const diffTime = Math.abs(new Date() - new Date(entryDate));
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays;
        } catch (error) {
            console.error('Error calculating days:', error);
            return 0;
        }
    }

    async function handleView(position) {
        selectedTrade = position;
        showViewModal = true;
    }

    async function handleEdit(position) {
        selectedTrade = position;
        showEditModal = true;
    }

    async function handleFavorite(id) {
        try {
            const position = openPositions.find(p => p._id === id);
            if (!position) return;

            console.log('Updating trade:', id, { favorite: !position.favorite });

            const updatedTrade = await api.updateTrade(id, { 
                favorite: !position.favorite,
                symbol: position.symbol,
                side: position.side,
                entryPrice: position.entryPrice,
                quantity: position.quantity,
                status: position.status
            });

            console.log('Updated trade:', updatedTrade);

            // อัพเดท local state
            openPositions = openPositions.map(p => 
                p._id === id ? { ...p, favorite: !p.favorite } : p
            );

            dispatch('favorite', id);
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    }

    async function handleDelete(position) {
        deleteModalStore.set({
            show: true,
            type: 'single',
            context: 'trades',
            count: 1,
            itemName: `trade ${position.symbol}`,
            onConfirm: async () => {
                try {
                    await api.deleteTrade(position._id);
                    dispatch('delete', {
                        type: 'single',
                        context: 'trades',
                        items: [position._id]
                    });
                } catch (error) {
                    console.error('Error deleting trade:', error);
                }
            }
        });
    }

    function getPositionAnimationClass(side) {
        return side === 'LONG' ? 'pulse-green' : 'pulse-red';
    }

    function closeViewModal() {
        showViewModal = false;
        selectedTrade = null;
    }

    function handleTradeUpdated() {
        dispatch('refresh'); // เพื่อโหลดข้อมูลใหม่
        showEditModal = false;
        selectedTrade = null;
    }

    onMount(() => {
        return () => {
            openPositions = [];
            totalInvested = 0;
        };
    });
</script>

<div class="h-full flex flex-col bg-light-card dark:bg-dark-card rounded-lg shadow-sm">
    <!-- Header -->
    <div class="p-4 border-b border-light-border dark:border-0">
        <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
                <div class="w-10 h-10 rounded-full bg-theme-500 bg-opacity-10 flex items-center justify-center">
                    <svg class="w-5 h-5 text-theme-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                    </svg>
                </div>
                <div>
                    <h3 class="text-md font-medium text-light-text dark:text-dark-text">
                        Open Positions
                    </h3>
                    <p class="text-sm text-light-text-muted dark:text-dark-text-muted">
                        {openPositions.length} active {openPositions.length === 1 ? 'position' : 'positions'}
                    </p>
                </div>
            </div>
        </div>

        <!-- Summary Stats -->
        <div class="grid grid-cols-2 gap-3">
            <div class="p-3 rounded-lg bg-light-hover/30 dark:bg-dark-hover/30">
                <p class="text-sm text-light-text-muted dark:text-dark-text-muted mb-1">Total Amount</p>
                <p class="text-lg font-bold text-light-text dark:text-dark-text">
                    {formatCurrency(totalInvested)}
                </p>
            </div>
            <div class="p-3 rounded-lg bg-light-hover/30 dark:bg-dark-hover/30">
                <p class="text-sm text-light-text-muted dark:text-dark-text-muted mb-1">Active Positions</p>
                <p class="text-lg font-bold text-theme-500">
                    {openPositions.length}
                </p>
            </div>
        </div>
    </div>

    <!-- Positions List -->
    <div class="flex-1 p-4 overflow-y-auto">
        {#if openPositions.length > 0}
            <div class="space-y-3">
                {#each openPositions as position}
                    <div 
                        class="p-3 rounded-lg border border-light-border dark:border-0 hover:bg-light-hover dark:hover:bg-dark-hover transition-colors relative {getPositionAnimationClass(position.side)}"
                        transition:slide
                    >
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex  items-center gap-2">
                                <span class="text-md font-medium text-light-text dark:text-dark-text">
                                    {position.symbol}
                                </span>
                                <span class="text-xs relative font-bold px-2 py-0.5 rounded-full {position.side === 'LONG' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}">
                                    {position.side}
                                    <div class=" absolute h-full w-full top-0 right-0 animate-ping px-2 py-0.5 rounded-full {position.side === 'LONG' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}"></div>
                                </span>
                                
                            </div>
                            <div class="flex items-center gap-1">
                                <div class="text-right mr-4">
                                    <p class="text-sm font-medium text-light-text dark:text-dark-text">
                                        {formatCurrency(position.amount)}
                                    </p>
                                    <p class="text-sm text-light-text-muted dark:text-dark-text-muted">
                                        {getDaysSinceEntry(position.entryDate)} days
                                    </p>
                                </div>
                                <!-- Action Buttons -->
                                <div class="flex gap-1 relative z-10">
                                    <button 
                                        class="icon-button text-theme-500 hover:text-theme-600 cursor-pointer"
                                        on:click={() => handleView(position)}
                                        title="View details"
                                    >
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                        </svg>
                                    </button>
                                    <button 
                                        class="icon-button text-theme-500 hover:text-theme-600 cursor-pointer"
                                        on:click={() => handleEdit(position)}
                                        title="Edit trade"
                                    >
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                        </svg>
                                    </button>
                                    <button 
                                        class="icon-button text-theme-500 hover:text-theme-600 cursor-pointer"
                                        on:click={() => handleFavorite(position._id)}
                                        title={position.favorite ? 'Remove from favorites' : 'Add to favorites'}
                                    >
                                        <svg class="w-4 h-4" fill={position.favorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                                        </svg>
                                    </button>
                                    <button 
                                        class="icon-button text-red-500 hover:text-red-600 cursor-pointer"
                                        on:click={() => handleDelete(position)}
                                        title="Delete trade"
                                    >
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-2 text-sm text-light-text-muted dark:text-dark-text-muted">
                            <div>
                                <p class="mb-0.5">Entry Price</p>
                                <p class="font-medium text-md text-light-text dark:text-dark-text">
                                    ${position.entryPrice.toFixed(2)}
                                </p>
                            </div>
                            <div>
                                <p class="mb-0.5">Entry Date</p>
                                <p class="font-medium text-md text-light-text dark:text-dark-text">
                                    {formatDate(position.entryDate)}
                                </p>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        {:else}
            <div class="flex flex-col items-center justify-center h-full text-light-text-muted dark:text-dark-text-muted">
                <svg class="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                </svg>
                <p class="text-sm">No open positions</p>
            </div>
        {/if}
    </div>
</div>

{#if selectedTrade}
    <TradeViewModal
        bind:show={showViewModal}
        trade={selectedTrade}
        on:close={closeViewModal}
    />

    <TradeModal
        bind:show={showEditModal}
        trade={selectedTrade}
        accountId={selectedTrade.account}
        on:tradeUpdated={handleTradeUpdated}
    />
{/if}

<style>
    /* Smooth scrolling for position list */
    .overflow-y-auto {
        scrollbar-width: thin;
        scrollbar-color: var(--theme-500) transparent;
    }

    .overflow-y-auto::-webkit-scrollbar {
        width: 4px;
    }

    .overflow-y-auto::-webkit-scrollbar-track {
        background: transparent;
    }

    .overflow-y-auto::-webkit-scrollbar-thumb {
        background-color: var(--theme-500);
        border-radius: 2px;
    }

    .icon-button {
        @apply p-1 rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover text-sm 
               transition-colors duration-200 cursor-pointer relative z-10;
    }

    /* Animation styles */
    .pulse-green {
        position: relative;
    }
    
    .pulse-green::before {
        content: '';
        position: absolute;
        inset: 0;
        border: 2px solid rgb(34 197 94); /* green-500 */
        border-radius: 0.5rem;
        animation: pulse-green 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        pointer-events: none;
        z-index: 1;
    }

    .pulse-red {
        position: relative;
    }
    
    .pulse-red::before {
        content: '';
        position: absolute;
        inset: 0;
        border: 2px solid rgb(239 68 68); /* red-500 */
        border-radius: 0.5rem;
        animation: pulse-red 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        pointer-events: none;
        z-index: 1;
    }

    @keyframes pulse-green {
        0%, 100% {
            opacity: 0;
        }
        50% {
            opacity: 0.3;
        }
    }

    @keyframes pulse-red {
        0%, 100% {
            opacity: 0;
        }
        50% {
            opacity: 0.3;
        }
    }

    /* ปรบ hover effect ให้ทำงานร่วมกับ animation */
    .pulse-green:hover::before,
    .pulse-red:hover::before {
        animation-play-state: paused;
    }

    /* Dark mode adjustments */
    :global(.dark) .pulse-green::before {
        border-color: rgb(34 197 94 / 0.5); /* green-500 with opacity */
    }

    :global(.dark) .pulse-red::before {
        border-color: rgb(239 68 68 / 0.5); /* red-500 with opacity */
    }

    /* ปรับปรุง position card */
    .position-card {
        @apply relative;
    }
</style>
