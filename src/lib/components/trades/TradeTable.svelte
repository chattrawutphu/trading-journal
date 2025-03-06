<script>
    import { createEventDispatcher } from 'svelte';
    import { formatCurrency } from '$lib/utils/formatters';
    import Button from '../common/Button.svelte';
    import { api } from '$lib/utils/api';
    import { deleteModalStore } from '$lib/stores/modalStore';
    import { accountStore } from '$lib/stores/accountStore';
    import { binanceExchange } from '$lib/exchanges';

    const dispatch = createEventDispatcher();

    export let trades = [];
    export let type = 'closed'; // 'open' or 'closed'
    export let isInModal = false; // Add this prop
    export let dailyBalance = null; // Add this prop to receive daily balance
    export let filters = null; // Add filters prop
    export let isTradesPage = false; // Add flag to indicate if we're in the trades page

    let sortField = type === 'closed' ? 'exitDate' : 'entryDate';
    let sortDirection = 'desc';
    let selectedTrades = [];
    let currentPage = 1;
    let itemsPerPage = 10;
    let showDeleteConfirmModal = false;
    let deleteType = '';
    let itemsToDelete = [];
    let singleItemToDelete = null;

    // เพิ่ม state และ logic เหมือน OpenPositionsWidget
    let currentPrices = new Map();
    let binanceWs;

    // เพิ่ม state สำหรับ loading
    let isLoadingPrices = false;

    function formatDate(dateStr) {
        const options = { 
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false // Use 24-hour format
        };
        return new Date(dateStr).toLocaleString(undefined, options);
    }

    function getStatusClass(status) {
        return status === 'OPEN' ? 'text-yellow-500' : 'text-green-500';
    }

    function getSideClass(side) {
        return side === 'LONG' ? 'text-green-500' : 'text-red-500';
    }

    function getSortIcon(field) {
        if (sortField !== field) return '↕';
        return sortDirection === 'asc' ? '↑' : '↓';
    }

    function handleSort(field) {
        if (sortField === field) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortField = field;
            sortDirection = 'desc';
        }
    }

    function calculatePnLPercentage(pnl, amount) {
        if (!amount || amount === 0) return 0;
        return (pnl / amount) * 100;
    }

    // Make this reactive to both trades and filters - if either changes, we refilter
    $: filteredTrades = filterTrades(trades);
    
    // Explicitly make this reactive to filters to ensure it updates when filters change
    $: {
        if (filters) {
            // Force refiltering when filters change
            filteredTrades = filterTrades(trades);
        }
    }

    $: sortedTrades = [...filteredTrades].map(trade => ({
        ...trade,
        currentPrice: currentPrices.get(trade.symbol),
        unrealizedPnL: type === 'open' ? binanceExchange.calculateUnrealizedPnL(trade, currentPrices.get(trade.symbol)) : trade.pnl
    })).sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];

        if (sortField === 'entryPrice' || sortField === 'exitPrice' || sortField === 'amount' || sortField === 'quantity' || sortField === 'pnl') {
            aValue = Number(aValue) || 0;
            bValue = Number(bValue) || 0;
        } else if (sortField === 'entryDate' || sortField === 'exitDate') {
            aValue = new Date(aValue).getTime();
            bValue = new Date(bValue).getTime();
        } else if (sortField === 'pnlPercentage') {
            aValue = calculatePnLPercentage(a.pnl, a.amount);
            bValue = calculatePnLPercentage(b.pnl, b.amount);
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    $: totalPages = Math.ceil(sortedTrades.length / itemsPerPage);
    $: paginatedTrades = sortedTrades.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    function changePage(page) {
        if (page >= 1 && page <= totalPages) {
            currentPage = page;
        }
    }

    function handleSelect(tradeId) {
        if (selectedTrades.includes(tradeId)) {
            selectedTrades = selectedTrades.filter(id => id !== tradeId);
        } else {
            selectedTrades = [...selectedTrades, tradeId];
        }
    }

    async function handleDelete(trade) {
        deleteModalStore.set({
            show: true,
            type: 'single',
            context: 'trades',
            count: 1,
            itemName: `trade ${trade.symbol}`,
            onConfirm: async () => {
                dispatch('delete', {
                    type: 'single',
                    context: 'trades',
                    items: [trade._id]
                });
                // Dispatch events เมื่อลบสำเร็จ
                window.dispatchEvent(new CustomEvent('tradeupdate'));
                window.dispatchEvent(new CustomEvent('tradeupdated'));
            }
        });
    }

    async function handleDeleteSelected() {
        // กรองเฉพาะ manual trades ที่เลือก
        const manualTrades = selectedTrades.filter(id => 
            trades.find(t => t._id === id && t.type === 'MANUAL')
        );

        if (manualTrades.length === 0) return;

        deleteModalStore.set({
            show: true,
            type: 'selected',
            context: 'trades',
            count: manualTrades.length,
            itemName: 'trades',
            onConfirm: async () => {
                dispatch('delete', {
                    type: 'selected',
                    context: 'trades',
                    items: manualTrades
                });
                selectedTrades = [];
                window.dispatchEvent(new CustomEvent('tradeupdate'));
                window.dispatchEvent(new CustomEvent('tradeupdated'));
            }
        });
    }

    async function handleDeleteAll() {
        deleteModalStore.set({
            show: true,
            type: 'all',
            context: 'trades',
            onConfirm: async () => {
                dispatch('delete', {
                    type: 'all',
                    context: 'trades',
                    items: trades.map(t => t._id)
                });
                // Dispatch events เมื่อลบสำเร็จ
                window.dispatchEvent(new CustomEvent('tradeupdate'));
                window.dispatchEvent(new CustomEvent('tradeupdated'));
            }
        });
    }

    function formatPercentage(value) {
        return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
    }

    async function handleFavorite(id) {
        try {
            const trade = trades.find(t => t._id === id);
            if (!trade) return;

            const updatedTrade = await api.updateTrade(id, { 
                favorite: !trade.favorite,
                symbol: trade.symbol,
                side: trade.side,
                entryPrice: trade.entryPrice,
                quantity: trade.quantity,
                status: trade.status
            });

            // อัพเดท local state
            trades = trades.map(t => 
                t._id === id ? { ...t, favorite: !t.favorite } : t
            );

            dispatch('favorite', id);
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    }

    function handleView(trade) {
        // ถ้าเป็น open trade ให้ส่ง unrealizedPnL ไปด้วย
        if (trade.status === 'OPEN') {
            const tradeWithUnrealizedPnL = {
                ...trade,
                unrealizedPnL: trade.unrealizedPnL,
                currentPrice: trade.currentPrice
            };
            dispatch('view', tradeWithUnrealizedPnL);
        } else {
            dispatch('view', trade);
        }
    }

    function handleEdit(trade) {
        dispatch('edit', trade);
    }

    // ปรับปรุงการแสดงผลสำหรับ open trades
    $: if (type === 'open' && $accountStore.currentAccount?.type === 'BINANCE_FUTURES') {
        setupBinanceWebSocket();
    }

    // Cleanup on component destroy
    import { onDestroy } from 'svelte';
    onDestroy(() => {
        if (binanceWs) {
            binanceWs.close();
        }
    });

    // เพิ่มการ dispatch event เมื่อ unrealized P&L มีการอัพเดท
    $: {
        if (type === 'open' && !isLoadingPrices) {
            const totalUnrealizedPnL = sortedTrades.reduce((sum, trade) => sum + (trade.unrealizedPnL || 0), 0);
            dispatch('unrealizedPnLUpdate', {
                total: totalUnrealizedPnL,
                isLoading: isLoadingPrices
            });
        }
    }

    // เพิ่มฟังก์ชันสำหรับคำนวณ Unrealized P&L %
    function calculateUnrealizedPnLPercentage(trade) {
        if (trade.status !== 'OPEN' || !trade.entryPrice || !trade.unrealizedPnL) return null;
        const percentage = (trade.unrealizedPnL / trade.amount) * 100;
        return percentage.toFixed(2);
    }

    // Add back the setupBinanceWebSocket function
    function setupBinanceWebSocket() {
        isLoadingPrices = true;
        
        // ปิด WebSocket เก่าถ้ามี
        if (binanceWs) {
            binanceWs.close();
        }

        // กรองเฉพาะ open trades และสร้าง symbols array
        const openTrades = trades.filter(t => t.status === 'OPEN');
        const symbols = openTrades.map(t => t.symbol.toLowerCase());

        if (symbols.length === 0) {
            isLoadingPrices = false;
            return;
        }

        // สร้าง WebSocket connection ใหม่
        binanceWs = binanceExchange.createPriceWebSocket(symbols);

        binanceWs.onopen = () => {
            isLoadingPrices = true;
        };

        binanceWs.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.e === 'markPriceUpdate') {
                isLoadingPrices = false;
                const symbol = data.s;
                const price = parseFloat(data.p);
                currentPrices.set(symbol, price);
                currentPrices = currentPrices; // Trigger Svelte reactivity
            }
        };

        binanceWs.onerror = () => {
            isLoadingPrices = false;
        };

        // Cleanup เมื่อ component ถูก destroy
        return () => {
            if (binanceWs) {
                binanceWs.close();
            }
            isLoadingPrices = false;
        };
    }

    function filterTrades(tradesArray) {
        // If not in trades page or no filters are provided, return all trades
        if (!isTradesPage || !filters) {
            return tradesArray;
        }
        
        console.log("Filtering trades with filters:", filters);
        
        return tradesArray.filter(trade => {
            // Symbol filter - add null check
            if (filters.symbol && !trade.symbol.toLowerCase().includes(filters.symbol.toLowerCase())) {
                return false;
            }
            
            // Status filter - add null check
            if (filters.status && filters.status.length > 0 && !filters.status.includes(trade.status)) {
                return false;
            }
            
            // Side filter - add null check
            if (filters.side && filters.side.length > 0 && !filters.side.includes(trade.side)) {
                return false;
            }
            
            // Date range filter - add null check
            if (filters.dateRange) {
                const entryDate = new Date(trade.entryDate);
                if (filters.dateRange.start) {
                    const startDate = new Date(filters.dateRange.start);
                    if (entryDate < startDate) return false;
                }
                if (filters.dateRange.end) {
                    const endDate = new Date(filters.dateRange.end);
                    endDate.setHours(23, 59, 59, 999); // End of the day
                    if (entryDate > endDate) return false;
                }
            }
            
            // Type filter - add null check
            if (filters.type && filters.type.length > 0 && !filters.type.includes(trade.type)) {
                return false;
            }
            
            // Favorite filter
            if (filters.favorite && !trade.favorite) {
                return false;
            }

            // Tags filter
            if (filters.tags.length > 0) {
                if (!trade.tags || !filters.tags.some(tag => trade.tags.includes(tag))) {
                    return false;
                }
            }

            // Profitable/Unprofitable filter
            if (filters.profitableOnly && (trade.pnl <= 0 || trade.status === 'OPEN')) {
                return false;
            }
            if (filters.unprofitableOnly && (trade.pnl >= 0 || trade.status === 'OPEN')) {
                return false;
            }

            // Strategy filter
            if (filters.strategy && (!trade.strategy || trade.strategy !== filters.strategy)) {
                return false;
            }

            // Emotions filter
            if (filters.emotions.length > 0 && (!trade.emotions || !filters.emotions.includes(trade.emotions))) {
                return false;
            }

            // Confidence level filter
            if (trade.confidenceLevel < filters.confidenceLevel.min || 
                trade.confidenceLevel > filters.confidenceLevel.max) {
                return false;
            }

            // Greed level filter
            if (trade.greedLevel < filters.greedLevel.min || 
                trade.greedLevel > filters.greedLevel.max) {
                return false;
            }

            // Stop Loss filter
            if (filters.hasStopLoss !== null && trade.hasStopLoss !== filters.hasStopLoss) {
                return false;
            }

            // Take Profit filter
            if (filters.hasTakeProfit !== null && trade.hasTakeProfit !== filters.hasTakeProfit) {
                return false;
            }

            // Amount range filter
            if (filters.amount.min && trade.amount < parseFloat(filters.amount.min)) {
                return false;
            }
            if (filters.amount.max && trade.amount > parseFloat(filters.amount.max)) {
                return false;
            }

            // PnL range filter
            if (filters.pnl.min && trade.pnl < parseFloat(filters.pnl.min)) {
                return false;
            }
            if (filters.pnl.max && trade.pnl > parseFloat(filters.pnl.max)) {
                return false;
            }

            // PnL percentage filter
            const pnlPercentage = calculatePnLPercentage(trade.pnl, trade.amount);
            if (filters.pnlPercentage.min && pnlPercentage < parseFloat(filters.pnlPercentage.min)) {
                return false;
            }
            if (filters.pnlPercentage.max && pnlPercentage > parseFloat(filters.pnlPercentage.max)) {
                return false;
            }

            // Exclude zero PnL filter
            if (filters.excludeZeroPnL && trade.pnl === 0) {
                return false;
            }

            // Disabled filter
            if (filters.disabled !== null && trade.disabled !== filters.disabled) {
                return false;
            }

            // Position history filter
            if (filters.positionHistory && (!trade.positionHistory || trade.positionHistory.length === 0)) {
                return false;
            }

            // If we get here, the trade passed all filters
            return true;
        });
    }

    // เพิ่มฟังก์ชันสำหรับคำนวณ unrealized PnL
    function calculateUnrealizedPnL(trade, currentPrice) {
        if (!currentPrice) return null;
        const qty = trade.quantity;
        if (trade.side === 'LONG') {
            return (currentPrice - trade.entryPrice) * qty;
        } else {
            return (trade.entryPrice - currentPrice) * qty;
        }
    }
</script>

<div class="overflow-x-auto">
    <table class="w-full text-sm">
        <thead>
            <tr class="border-b border-light-border dark:border-0">
                <th class="w-8 text-left py-1 px-2 font-medium text-light-text-muted dark:text-dark-text-muted">
                    <input 
                        type="checkbox" 
                        class="checkbox"
                        on:click={() => selectedTrades = selectedTrades.length === trades.length ? [] : trades.map(t => t._id)}
                        checked={selectedTrades.length === trades.length}
                    />
                </th>
                <th class="text-left py-1 px-2 font-medium text-light-text-muted dark:text-dark-text-muted">
                    <button 
                        class="px-2 py-1 text-sm font-medium rounded-md
                               {sortField === 'symbol' ? 'bg-light-hover/50 dark:bg-dark-hover/50 text-light-text-muted dark:text-dark-text-muted' : 'hover:text-theme-500'}
                               hover:bg-theme-500/10 hover:text-theme-500 transition-colors"
                        on:click={() => handleSort('symbol')}
                    >
                        Symbol {sortField === 'symbol' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
                    </button>
                </th>
                <th class="text-left py-1 px-2 font-medium text-light-text-muted dark:text-dark-text-muted">
                    <button 
                        class="px-2 py-1 text-sm font-medium rounded-md
                               {sortField === 'side' ? 'bg-light-hover/50 dark:bg-dark-hover/50 text-light-text-muted dark:text-dark-text-muted' : 'hover:text-theme-500'}
                               hover:bg-theme-500/10 hover:text-theme-500 transition-colors"
                        on:click={() => handleSort('side')}
                    >
                        Side {sortField === 'side' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
                    </button>
                </th>
                {#if type === 'open'}
                    <th class="text-left py-1 px-2 font-medium text-light-text-muted dark:text-dark-text-muted">
                        <button 
                            class="px-2 py-1 text-sm font-medium rounded-md
                                   {sortField === 'entryDate' ? 'bg-light-hover/50 dark:bg-dark-hover/50 text-light-text-muted dark:text-dark-text-muted' : 'hover:text-theme-500'}
                                   hover:bg-theme-500/10 hover:text-theme-500 transition-colors"
                            on:click={() => handleSort('entryDate')}
                        >
                            Entry Date {sortField === 'entryDate' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
                        </button>
                    </th>
                    <th class="text-right py-1 px-2 font-medium text-light-text-muted dark:text-dark-text-muted">
                        <button 
                            class="px-2 py-1 text-sm font-medium rounded-md
                                   {sortField === 'entryPrice' ? 'bg-light-hover/50 dark:bg-dark-hover/50 text-light-text-muted dark:text-dark-text-muted' : 'hover:text-theme-500'}
                                   hover:bg-theme-500/10 hover:text-theme-500 transition-colors"
                            on:click={() => handleSort('entryPrice')}
                        >
                            Entry {sortField === 'entryPrice' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
                        </button>
                    </th>
                    <th class="text-right py-1 px-2 font-medium text-light-text-muted dark:text-dark-text-muted">
                        <button 
                            class="px-2 py-1 text-sm font-medium rounded-md
                                   {sortField === 'amount' ? 'bg-light-hover/50 dark:bg-dark-hover/50 text-light-text-muted dark:text-dark-text-muted' : 'hover:text-theme-500'}
                                   hover:bg-theme-500/10 hover:text-theme-500 transition-colors"
                            on:click={() => handleSort('amount')}
                        >
                            Amount {sortField === 'amount' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
                        </button>
                    </th>
                {:else}
                    <th class="text-left py-1 px-2 font-medium text-light-text-muted dark:text-dark-text-muted">
                        <button 
                            class="px-2 py-1 text-sm font-medium rounded-md
                                   {sortField === 'exitDate' ? 'bg-light-hover/50 dark:bg-dark-hover/50 text-light-text-muted dark:text-dark-text-muted' : 'hover:text-theme-500'}
                                   hover:bg-theme-500/10 hover:text-theme-500 transition-colors"
                            on:click={() => handleSort('exitDate')}
                        >
                            Exit Date {sortField === 'exitDate' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
                        </button>
                    </th>
                    <th class="text-right py-1 px-2 font-medium text-light-text-muted dark:text-dark-text-muted">
                        <button 
                            class="px-2 py-1 text-sm font-medium rounded-md
                                   {sortField === 'entryPrice' ? 'bg-light-hover/50 dark:bg-dark-hover/50 text-light-text-muted dark:text-dark-text-muted' : 'hover:text-theme-500'}
                                   hover:bg-theme-500/10 hover:text-theme-500 transition-colors"
                            on:click={() => handleSort('entryPrice')}
                        >
                            Entry {sortField === 'entryPrice' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
                        </button>
                    </th>
                    <th class="text-right py-1 px-2 font-medium text-light-text-muted dark:text-dark-text-muted">
                        <button 
                            class="px-2 py-1 text-sm font-medium rounded-md
                                   {sortField === 'exitPrice' ? 'bg-light-hover/50 dark:bg-dark-hover/50 text-light-text-muted dark:text-dark-text-muted' : 'hover:text-theme-500'}
                                   hover:bg-theme-500/10 hover:text-theme-500 transition-colors"
                            on:click={() => handleSort('exitPrice')}
                        >
                            Exit {sortField === 'exitPrice' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
                        </button>
                    </th>
                    <th class="text-right py-1 px-2 font-medium text-light-text-muted dark:text-dark-text-muted">
                        <button 
                            class="px-2 py-1 text-sm font-medium rounded-md
                                   {sortField === 'amount' ? 'bg-light-hover/50 dark:bg-dark-hover/50 text-light-text-muted dark:text-dark-text-muted' : 'hover:text-theme-500'}
                                   hover:bg-theme-500/10 hover:text-theme-500 transition-colors"
                            on:click={() => handleSort('amount')}
                        >
                            Amount {sortField === 'amount' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
                        </button>
                    </th>
                    <th class="text-right py-1 px-2 font-medium text-light-text-muted dark:text-dark-text-muted">
                        <button 
                            class="px-2 py-1 text-sm font-medium rounded-md
                                   {sortField === 'pnl' ? 'bg-light-hover/50 dark:bg-dark-hover/50 text-light-text-muted dark:text-dark-text-muted' : 'hover:text-theme-500'}
                                   hover:bg-theme-500/10 hover:text-theme-500 transition-colors"
                            on:click={() => handleSort('pnl')}
                        >
                            P&L {sortField === 'pnl' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
                        </button>
                    </th>
                    <th class="text-right py-1 px-2 font-medium text-light-text-muted dark:text-dark-text-muted">
                        <button 
                            class="px-2 py-1 text-sm font-medium rounded-md
                                   {sortField === 'pnlPercentage' ? 'bg-light-hover/50 dark:bg-dark-hover/50 text-light-text-muted dark:text-dark-text-muted' : 'hover:text-theme-500'}
                                   hover:bg-theme-500/10 hover:text-theme-500 transition-colors"
                            on:click={() => handleSort('pnlPercentage')}
                        >
                            P&L % {sortField === 'pnlPercentage' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
                        </button>
                    </th>
                {/if}
                {#if type === 'open' && $accountStore.currentAccount?.type === 'BINANCE_FUTURES'}
                    <th class="text-right py-1 px-2 font-medium text-light-text-muted dark:text-dark-text-muted">
                        Curr. Price
                    </th>
                    <th class="text-right py-1 px-2 font-medium text-light-text-muted dark:text-dark-text-muted">
                        Unr. P&L
                    </th>
                    <th class="text-right py-1 px-2 font-medium text-light-text-muted dark:text-dark-text-muted">
                        Unr. P&L %
                    </th>
                {/if}
                <th class="text-right py-1 px-2 font-medium text-light-text-muted dark:text-dark-text-muted">Actions</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-light-border dark:divide-dark-border">
            {#each paginatedTrades as trade, index (trade._id || `trade-${index}`)}
                <tr class="hover:bg-light-hover dark:hover:bg-dark-hover">
                    <td class="w-8 py-1 px-2 text-right">
                        <input 
                            type="checkbox"
                            class="checkbox"
                            on:click={() => handleSelect(trade._id)}
                            checked={selectedTrades.includes(trade._id)}
                        />
                    </td>
                    <td class="py-1 px-2">
                        <div class="flex items-center gap-2">
                            <!-- Trade Type Icon -->
                            {#if trade.type === 'SYNC'}
                                <span class="text-blue-500" title="Synced trade">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                </span>
                            {:else}
                                <span class="text-green-500" title="Manual trade">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </span>
                            {/if}
                            {#if trade.favorite}
                                <svg class="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                </svg>
                            {/if}
                            <span class="font-medium text-light-text-muted dark:text-dark-text">{trade.symbol}</span>
                        </div>
                    </td>
                    <td class="py-1 px-2">
                        <span class={getSideClass(trade.side)}>{trade.side}</span>
                    </td>
                    {#if type === 'open'}
                        <td class="py-1 px-2 text-light-text-muted dark:text-dark-text">{formatDate(trade.entryDate)}</td>
                        <td class="py-1 px-2 text-right text-light-text-muted dark:text-dark-text">{formatCurrency(trade.entryPrice)}</td>
                        <td class="py-1 px-2 text-right text-light-text-muted dark:text-dark-text">{formatCurrency(trade.amount)}</td>
                    {:else}
                        <td class="py-1 px-2 text-light-text-muted dark:text-dark-text">{formatDate(trade.exitDate)}</td>
                        <td class="py-1 px-2 text-right">
                            <span class="text-light-text-muted dark:text-dark-text">
                                {formatCurrency(trade.entryPrice)}
                            </span>
                        </td>
                        <td class="py-1 px-2 text-right">
                            <span class="text-light-text-muted dark:text-dark-text">
                                {formatCurrency(trade.exitPrice)}
                            </span>
                        </td>
                        <td class="py-1 px-2 text-right">
                            <span class="text-light-text-muted dark:text-dark-text">
                                {formatCurrency(trade.amount)}
                            </span>
                        </td>
                        <td class="py-1 px-2 text-right">
                            <span class={trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                                {formatCurrency(trade.pnl)}
                            </span>
                        </td>
                        <td class="py-1 px-2 text-right">
                            <span class={trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                                {formatPercentage(calculatePnLPercentage(trade.pnl, trade.amount))}
                            </span>
                        </td>
                    {/if}
                    {#if type === 'open' && $accountStore.currentAccount?.type === 'BINANCE_FUTURES'}
                        <td class="py-1 px-2 text-right text-light-text-muted dark:text-dark-text-muted">
                            {#if isLoadingPrices}
                                <span class="text-light-text-muted dark:text-dark-text-muted">
                                    Loading...
                                </span>
                            {:else}
                                {trade.currentPrice ? `$${trade.currentPrice.toFixed(2)}` : '-'}
                            {/if}
                        </td>
                        <td class="py-1 px-2 text-right">
                            {#if isLoadingPrices}
                                <span class="text-light-text-muted dark:text-dark-text-muted">
                                    Loading...
                                </span>
                            {:else}
                                <span class="text-yellow-500">
                                    {trade.unrealizedPnL ? formatCurrency(trade.unrealizedPnL) : '-'}
                                </span>
                            {/if}
                        </td>
                        <td class="py-1 px-2 text-right">
                            {#if isLoadingPrices}
                                <span class="text-light-text-muted dark:text-dark-text-muted">
                                    Loading...
                                </span>
                            {:else if trade.status === 'OPEN'}
                                <span class="text-yellow-500">
                                    {calculateUnrealizedPnLPercentage(trade)}%
                                </span>
                            {/if}
                        </td>
                    {/if}
                    <td class="py-1 px-2">
                        <div class="flex justify-end">
                            <button 
                                class="icon-button text-theme-500 hover:text-theme-600"
                                on:click={() => handleView(trade)}
                                title="View details"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                </svg>
                            </button>
                            <button 
                                class="icon-button text-theme-500 hover:text-theme-600"
                                on:click={() => handleEdit(trade)}
                                title="Edit trade"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                            </button>
                            <button 
                                class="icon-button text-theme-500 hover:text-theme-600"
                                on:click={() => handleFavorite(trade._id)}
                                title={trade.favorite ? 'Remove from favorites' : 'Add to favorites'}
                            >
                                <svg class="w-4 h-4" fill={trade.favorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                                </svg>
                            </button>
                            {#if trade.type === 'MANUAL'}
                                <button 
                                    class="icon-button text-red-500 hover:text-red-600"
                                    on:click={() => handleDelete(trade)}
                                    title="Delete trade"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                    </svg>
                                </button>
                            {/if}
                        </div>
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
    <div class="flex justify-between items-center p-2 px-4 mt-2">
        <div class="flex gap-2">
            {#if selectedTrades.length > 0 && paginatedTrades.some(t => t.type === 'MANUAL')}
                <button 
                    class="btn btn-primary flex items-center gap-1"
                    on:click={handleDeleteSelected}
                    title="Delete selected trades"
                >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                    Delete Selected
                </button>
            {/if}
            <button 
                class="btn btn-secondary flex items-center gap-1 hidden"
                on:click={handleDeleteAll}
                title="Delete all trades"
            >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                Delete All
            </button>
        </div>
        <!-- Pagination Controls -->
        {#if totalPages > 1}
        <div class="flex items-center text-xs gap-2">
            <button class="pagination-btn" on:click={() => changePage(currentPage - 1)} disabled={currentPage === 1}>
                &larr;
            </button>
            <span class="text-light-text-muted dark:text-dark-text-muted">Page {currentPage} of {totalPages}</span>
            <button class="pagination-btn" on:click={() => changePage(currentPage + 1)} disabled={currentPage === totalPages}>
                &rarr;
            </button>
        </div>
        {/if}
    </div>
</div>

<style lang="postcss">
    .icon-button {
        @apply p-1 rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover text-sm;
    }

    .btn {
        @apply px-2 py-1 text-xs rounded-lg font-medium;
    }

    .btn-primary {
        @apply bg-theme-500 text-white hover:bg-theme-600;
    }

    .btn-secondary {
        @apply bg-gray-500 text-white hover:bg-gray-600;
    }

    .btn-secondary:disabled {
        @apply bg-gray-300 text-gray-500 cursor-not-allowed;
    }

    .btn-secondary svg {
        @apply ml-2;
    }

    .btn-secondary svg:first-child {
        @apply ml-0 mr-2;
    }

    .pagination-btn {
        @apply w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:cursor-not-allowed;
    }
</style>
