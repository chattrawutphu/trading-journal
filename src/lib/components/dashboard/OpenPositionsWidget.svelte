<script>
    import { onMount, createEventDispatcher } from 'svelte';
    import { slide } from 'svelte/transition';
    import { deleteModalStore } from '$lib/stores/modalStore';
    import { goto } from '$app/navigation';
    import { api } from '$lib/utils/api';
    import TradeViewModal from "$lib/components/trades/TradeViewModal.svelte";
    import TradeModal from "$lib/components/trades/TradeModal.svelte";
    import { accountStore } from '$lib/stores/accountStore';

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
    let sortBy = 'date'; // 'date', 'symbol', 'amount'
    let sortDirection = 'desc'; // 'asc', 'desc'
    let currentAccountId = null;

    $: if (trades) {
        calculatePositions();
    }

    $: visiblePositions = openPositions && openPositions.length > 0 
        ? (showAllPositions || window.innerWidth >= 768 
            ? openPositions 
            : openPositions.slice(0, 4))
        : [];

    function calculatePositions() {
        if (!Array.isArray(trades)) {
            openPositions = [];
            totalInvested = 0;
            return;
        }

        openPositions = trades.filter(t => t && t.status === 'OPEN')
            .map(position => {
                if (!position) return null;
                
                let amount = position.amount;
                if (!amount) {
                    const entryPrice = Number(position.entryPrice) || 0;
                    const quantity = Number(position.quantity) || 0;
                    amount = parseFloat((entryPrice * quantity).toFixed(2));
                }
                
                return {
                    ...position,
                    amount,
                    entryDate: new Date(position.entryDate || Date.now())
                };
            })
            .filter(Boolean)
            .sort((a, b) => {
                switch (sortBy) {
                    case 'date':
                        return sortDirection === 'desc' 
                            ? new Date(b.entryDate) - new Date(a.entryDate)
                            : new Date(a.entryDate) - new Date(b.entryDate);
                    case 'symbol':
                        return sortDirection === 'desc'
                            ? b.symbol.localeCompare(a.symbol)
                            : a.symbol.localeCompare(b.symbol);
                    case 'amount':
                        return sortDirection === 'desc'
                            ? b.amount - a.amount
                            : a.amount - b.amount;
                    default:
                        return 0;
                }
            });

        totalInvested = openPositions.reduce((sum, pos) => sum + (pos.amount || 0), 0);
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

    function togglePositions() {
        showAllPositions = !showAllPositions;
    }

    function handleSort(newSortBy) {
        if (sortBy === newSortBy) {
            // Toggle direction if clicking same sort field
            sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
        } else {
            // New sort field, default to desc
            sortBy = newSortBy;
            sortDirection = 'desc';
        }
        calculatePositions();
    }

    // เพิ่มฟังก์ชันสำหรับโหลด trades
    async function loadTrades() {
        if (!$accountStore.currentAccount) return;
        
        try {
            trades = await api.getTrades($accountStore.currentAccount._id);
            calculatePositions();
        } catch (err) {
            console.error('Error loading trades:', err);
        }
    }

    onMount(() => {
        if (isPreview) return;
        loadTrades();

        // Subscribe to trade updates
        const handleUpdate = async () => {
            console.log('OpenPositions: Received update event');
            await loadTrades();
        };
        
        window.addEventListener('tradeupdated', handleUpdate);
        window.addEventListener('tradesynced', handleUpdate);
        
        return () => {
            window.removeEventListener('tradeupdated', handleUpdate);
            window.removeEventListener('tradesynced', handleUpdate);
        };
    });

    // Watch for account changes
    $: if ($accountStore.currentAccount?._id !== currentAccountId && !isPreview) {
        currentAccountId = $accountStore.currentAccount?._id;
        loadTrades();
    }
</script>

<div class="h-full flex flex-col bg-light-card dark:bg-dark-card rounded-lg overflow-hidden shadow-sm">
    <!-- Header -->
    <div class="p-4 pb-2 border-b border-light-border dark:border-dark-border bg-gradient-to-r from-theme-500/5 to-transparent dark:from-theme-500/10">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-theme-500/10 flex items-center justify-center">
                <svg class="w-6 h-6 text-theme-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                </svg>
            </div>
            <div class="flex-1">
                <h2 class="text-lg font-semibold text-light-text dark:text-dark-text">
                    Open Positions
                </h2>
                <p class="text-sm text-light-text-muted dark:text-dark-text-muted">
                    {openPositions.length} active {openPositions.length === 1 ? 'position' : 'positions'}
                </p>
            </div>
        </div>

        <!-- Summary Stats -->
        <div class="grid grid-cols-2 gap-3 mt-2">
            <div class="p-1.5 rounded-lg bg-light-background/50 dark:bg-dark-background/50 border border-transparent">
                <p class="text-sm text-light-text-muted dark:text-dark-text-muted mb-1">Total Amount</p>
                <p class="text-lg font-bold text-light-text dark:text-dark-text">
                    {formatCurrency(totalInvested)}
                </p>
            </div>
            <div class="p-1.5 rounded-lg bg-light-background/50 dark:bg-dark-background/50 border border-transparent">
                <p class="text-sm text-light-text-muted dark:text-dark-text-muted mb-1">Active Positions</p>
                <p class="text-lg font-bold text-theme-500">
                    {openPositions.length}
                </p>
            </div>
        </div>
    </div>

    <!-- Positions List -->
    <div class="flex-1 overflow-y-auto p-3">
        {#if openPositions.length === 0}
            <div class="h-full flex items-center justify-center text-center p-4">
                <div class="space-y-3">
                    <div class="w-16 h-16 rounded-full bg-theme-500/5 flex items-center justify-center mx-auto">
                        <svg class="w-8 h-8 text-theme-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                        </svg>
                    </div>
                    <div>
                        <p class="font-medium text-light-text dark:text-dark-text">
                            No open positions
                        </p>
                        <p class="text-sm text-light-text-muted dark:text-dark-text-muted">
                            Your active trades will appear here
                        </p>
                    </div>
                </div>
            </div>
        {:else}
            <div class="space-y-2">
                <!-- Sort Controls -->
                <div class="flex gap-2 mb-3">
                    <button
                        class="px-2 py-1 text-xs font-medium rounded-md
                               {sortBy === 'date' ? 'bg-theme-500 text-white' : 'bg-light-hover/50 dark:bg-dark-hover/50 text-light-text-muted dark:text-dark-text-muted'}
                               hover:bg-theme-500/10 hover:text-theme-500 transition-colors"
                        on:click={() => handleSort('date')}
                    >
                        Date {sortBy === 'date' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
                    </button>
                    <button
                        class="px-2 py-1 text-xs font-medium rounded-md
                               {sortBy === 'symbol' ? 'bg-theme-500 text-white' : 'bg-light-hover/50 dark:bg-dark-hover/50 text-light-text-muted dark:text-dark-text-muted'}
                               hover:bg-theme-500/10 hover:text-theme-500 transition-colors"
                        on:click={() => handleSort('symbol')}
                    >
                        Symbol {sortBy === 'symbol' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
                    </button>
                    <button
                        class="px-2 py-1 text-xs font-medium rounded-md
                               {sortBy === 'amount' ? 'bg-theme-500 text-white' : 'bg-light-hover/50 dark:bg-dark-hover/50 text-light-text-muted dark:text-dark-text-muted'}
                               hover:bg-theme-500/10 hover:text-theme-500 transition-colors"
                        on:click={() => handleSort('amount')}
                    >
                        Amount {sortBy === 'amount' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
                    </button>
                </div>

                <!-- Positions List -->
                <div class="space-y-0.5">
                    {#each visiblePositions as position}
                        <div 
                            class="w-full p-2 rounded-lg bg-light-background/50 dark:bg-dark-background/50 
                                   hover:bg-theme-500/5 dark:hover:bg-theme-500/10 
                                   transition-all duration-200 relative"
                            transition:slide
                        >
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex flex-wrap items-center gap-2">
                                    <span class="font-medium text-light-text dark:text-dark-text">
                                        {position.symbol}
                                    </span>
                                    <span class="text-xs relative px-2 py-0.5 rounded-full font-bold
                                                {position.side === 'LONG' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}">
                                        {position.side}
                                        <div class="absolute h-full w-full top-0 right-0 animate-ping rounded-full 
                                                  {position.side === 'LONG' ? 'bg-green-500/10' : 'bg-red-500/10'}">
                                        </div>
                                    </span>
                                </div>
                                <div class="flex flex-wrap items-center gap-2">
                                    <div class="flex flex-wrap gap-2 text-right items-center">
                                        <p class="text-sm font-bold text-light-text dark:text-dark-text">
                                            {formatCurrency(position.amount)}
                                        </p>
                                        <p class="text-xs text-light-text-muted dark:text-dark-text-muted">
                                            {getDaysSinceEntry(position.entryDate)} days
                                        </p>
                                    </div>
                                    <!-- Action Buttons -->
                                    <div class="flex gap-0.5">
                                        <button 
                                            class="p-1 rounded-lg hover:bg-theme-500/10 text-theme-500 transition-colors"
                                            on:click={() => handleView(position)}
                                        >
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                            </svg>
                                        </button>
                                        <!--<button 
                                            class="p-2 rounded-lg hover:bg-theme-500/10 text-theme-500 transition-colors"
                                            on:click={() => handleEdit(position)}
                                        >
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                            </svg>
                                        </button>
                                        <button 
                                            class="p-2 rounded-lg hover:bg-theme-500/10 text-theme-500 transition-colors"
                                            on:click={() => handleFavorite(position._id)}
                                        >
                                            <svg class="w-4 h-4" fill={position.favorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                                            </svg>
                                        </button>-->
                                        <button 
                                            class="p-1 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                                            on:click={() => handleDelete(position)}
                                        >
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-4 mt-2">
                                <div>
                                    <p class="text-sm text-light-text-muted dark:text-dark-text-muted mb-1">Entry Price</p>
                                    <p class="text-sm font-medium text-light-text dark:text-dark-text">
                                        ${position.entryPrice.toFixed(2)}
                                    </p>
                                </div>
                                <div>
                                    <p class="text-sm text-light-text-muted dark:text-dark-text-muted mb-1">Entry Date</p>
                                    <p class="text-sm font-medium text-light-text dark:text-dark-text">
                                        {formatDate(position.entryDate)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    {/each}

                    <!-- Toggle Button for Mobile -->
                    {#if openPositions.length > 4 && window.innerWidth < 768}
                        <button
                            class="w-full mt-4 p-3 rounded-lg bg-light-background/50 dark:bg-dark-background/50 
                                   hover:bg-theme-500/5 dark:hover:bg-theme-500/10 transition-colors
                                   text-sm text-light-text-muted dark:text-dark-text-muted
                                   flex items-center justify-center gap-2"
                            on:click={togglePositions}
                        >
                            <span>
                                {showAllPositions ? 'Show Less' : `Show ${openPositions.length - 4} More`}
                            </span>
                            <svg 
                                class="w-4 h-4 transition-transform duration-200 {showAllPositions ? 'rotate-180' : ''}"
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 9l-7 7-7-7"/>
                            </svg>
                        </button>
                    {/if}
                </div>
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

    /* Add smooth transition for toggle */
    .space-y-3 {
        transition: all 0.2s ease-in-out;
    }

    /* Improved hover effects */
    button {
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
    }

    /* Desktop optimizations */
    @media (min-width: 1024px) {
        .p-3 {
            padding: 1rem;
        }

        .gap-3 {
            gap: 1rem;
        }

        .text-lg {
            font-size: 1.125rem;
        }
    }

    /* Improve spacing between positions */
    .space-y-0\.5 > :not([hidden]) ~ :not([hidden]) {
        --tw-space-y-reverse: 0;
        margin-top: calc(0.125rem * calc(1 - var(--tw-space-y-reverse)));
        margin-bottom: calc(0.125rem * var(--tw-space-y-reverse));
    }
</style>
