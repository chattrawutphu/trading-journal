<script>
    import { onMount } from "svelte";
    import { accountStore } from '$lib/stores/accountStore';
    import { binanceExchange } from '$lib/exchanges';
    import { dailyBalancesStore } from '$lib/stores/dailyBalancesStore';
    import { api } from '$lib/utils/api';
    
    export let totalPnL;
    export let openTrades;
    export let closedTrades;
    export let winRate;
    export let textSize = 'medium';
    export let isPreview = false;
    export let trades = [];

    // Add helper function for date formatting
    function formatDateForInput(date) {
        const d = new Date(date);
        d.setHours(12, 0, 0, 0);
        return d.toISOString().slice(0, 10);
    }

    // Add state variables for trading statistics
    let averageWin = 0;
    let averageLoss = 0;
    let profitFactor = 0;
    let largestWin = 0;
    let largestLoss = 0;

    // Add state for unrealized PnL
    let currentPrices = new Map();
    let binanceWs;
    let isLoadingPrices = true;
    let totalUnrealizedPnL = 0;
    let totalOpenAmount = 0;

    // Add WebSocket setup function
    function setupBinanceWebSocket() {
        isLoadingPrices = true;
        
        if (binanceWs) {
            binanceWs.close();
        }

        const symbols = openTrades.map(t => t.symbol.toLowerCase());
        if (symbols.length === 0) {
            isLoadingPrices = false;
            return;
        }

        binanceWs = binanceExchange.createPriceWebSocket(symbols);

        binanceWs.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.e === 'markPriceUpdate') {
                isLoadingPrices = false;
                const symbol = data.s;
                const price = parseFloat(data.p);
                currentPrices.set(symbol, price);
                currentPrices = currentPrices;
                
                // Calculate total unrealized PnL
                totalUnrealizedPnL = openTrades.reduce((sum, trade) => {
                    const currentPrice = currentPrices.get(trade.symbol);
                    if (!currentPrice) return sum;
                    return sum + binanceExchange.calculateUnrealizedPnL(trade, currentPrice);
                }, 0);

                // Calculate total open amount
                totalOpenAmount = openTrades.reduce((sum, trade) => sum + Math.abs(trade.amount || 0), 0);
            }
        };

        binanceWs.onerror = () => {
            isLoadingPrices = false;
        };
    }

    // Setup WebSocket when there are open trades and account is Exchange/Broker
    $: if (openTrades.length > 0 && ['BINANCE_FUTURES', 'BROKER'].includes($accountStore.currentAccount?.type)) {
        setupBinanceWebSocket();
    }

    // Cleanup on component destroy
    onMount(() => {
        if (isPreview) return;

        // Add event listeners for updates
        const handleUpdate = async () => {
            // console.log('StatsCard: Received update event');
            if (!$accountStore.currentAccount) return;
            
            try {
                trades = await api.getTrades($accountStore.currentAccount._id);
                
                // Recalculate stats
                if (trades) {
                    openTrades = trades.filter(t => t.status === 'OPEN');
                    closedTrades = trades.filter(t => t.status === 'CLOSED');
                    totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
                    winRate = calculateWinRate(closedTrades);
                }

                // Setup WebSocket for price updates if needed
                if (openTrades.length > 0 && ['BINANCE_FUTURES', 'BROKER'].includes($accountStore.currentAccount?.type)) {
                    setupBinanceWebSocket();
                }
            } catch (err) {
                console.error('Error updating stats:', err);
            }
        };

        // Subscribe to all relevant events
        window.addEventListener('tradeupdated', handleUpdate);
        window.addEventListener('tradesynced', handleUpdate);
        window.addEventListener('balanceupdated', handleUpdate);

        // Cleanup on destroy
        return () => {
            window.removeEventListener('tradeupdated', handleUpdate);
            window.removeEventListener('tradesynced', handleUpdate);
            window.removeEventListener('balanceupdated', handleUpdate);
            
            // Close WebSocket if exists
            if (binanceWs) {
                binanceWs.close();
            }
        };
    });

    // Calendar logic
    let selectedMonth = new Date().getMonth();
    let selectedYear = new Date().getFullYear();
    let calendarDays = [];
    let dailyPnL = {};

    // Add logging
    // $: console.log('StatsCard trades:', trades);
    // $: console.log('StatsCard dailyPnL:', dailyPnL);

    // Helper function to normalize date
    function normalizeDate(date) {
        const d = new Date(date);
        d.setHours(12, 0, 0, 0);
        return d;
    }

    function isFutureDate(day) {
        const date = normalizeDate(new Date(selectedYear, selectedMonth, day));
        const today = normalizeDate(new Date());
        return date > today;
    }

    // Calculate calendar days and daily PnL
    $: {
        // Calculate days in month
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const firstDayOfWeek = (new Date(selectedYear, selectedMonth, 1).getDay() + 6) % 7;

        calendarDays = Array.from(
            { length: 42 },
            (_, i) => {
                const dayNumber = i - firstDayOfWeek + 1;
                if (dayNumber < 1 || dayNumber > daysInMonth) return null;
                return dayNumber;
            }
        );

        // Reset and recalculate dailyPnL
        dailyPnL = {};
        if (Array.isArray(trades)) {
            trades.forEach(trade => {
                if (trade.status === "CLOSED" && trade.exitDate) {
                    const exitDate = normalizeDate(new Date(trade.exitDate));
                    if (exitDate.getMonth() === selectedMonth && exitDate.getFullYear() === selectedYear) {
                        const day = exitDate.getDate();
                        dailyPnL[day] = (dailyPnL[day] || 0) + (Number(trade.pnl) || 0);
                    }
                }
            });
        }
        // console.log('Updated dailyPnL:', dailyPnL);
    }

    function getDayClass(day) {
        if (!day) return "invisible";
        
        const baseClasses = "w-full h-full rounded-sm transition-colors duration-200";
        
        if (isFutureDate(day)) {
            return `${baseClasses} bg-gray-500/5 dark:bg-gray-700/20 sweet:bg-gray-400/10`;
        }
        
        const pnl = dailyPnL[day] || 0;
        
        if (pnl > 0) {
            return `${baseClasses} bg-green-500/50 dark:bg-green-500/40 sweet:bg-sweet-success/40`;
        }
        if (pnl < 0) {
            return `${baseClasses} bg-red-500/50 dark:bg-red-500/40 sweet:bg-sweet-danger/40`;
        }
        return `${baseClasses} bg-gray-200/50 dark:bg-gray-600/30 sweet:bg-gray-300/30`;
    }

    function getDayTextClass(day) {
        if (!day || isFutureDate(day)) {
            return "text-light-text-muted/50 dark:text-dark-text-muted/50 sweet:text-sweet-text-muted/50";
        }
        const pnl = dailyPnL[day] || 0;
        if (pnl > 0) return "text-green-800 dark:text-green-200 sweet:text-sweet-success font-semibold";
        if (pnl < 0) return "text-red-800 dark:text-red-200 sweet:text-sweet-danger font-semibold";
        return "text-light-text-muted dark:text-dark-text-muted sweet:text-sweet-text-muted";
    }

    // Add new calculations
    $: {
        // Calculate average win and loss
        let wins = closedTrades.filter(t => t.pnl > 0);
        let losses = closedTrades.filter(t => t.pnl < 0);
        
        averageWin = wins.length > 0 
            ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length 
            : 0;
            
        averageLoss = losses.length > 0 
            ? Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0)) / losses.length 
            : 0;

        // Calculate profit factor
        let grossProfit = wins.reduce((sum, t) => sum + t.pnl, 0);
        let grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
        profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : 0;

        // Calculate largest win/loss
        largestWin = wins.length > 0 
            ? Math.max(...wins.map(t => t.pnl))
            : 0;
            
        largestLoss = losses.length > 0 
            ? Math.abs(Math.min(...losses.map(t => t.pnl)))
            : 0;
    }

    // เพิ่มฟังก์ชัน helper สำหรับคำนวณ win rate
    function calculateWinRate(trades) {
        if (!trades || trades.length === 0) return 0;
        const wins = trades.filter(t => t.pnl > 0).length;
        return Math.round((wins / trades.length) * 100);
    }

    // Add helper functions for theme-consistent coloring
    function getPnLColorClass(value) {
        return value > 0 
            ? 'text-green-500 dark:text-green-500 sweet:text-sweet-success' 
            : value < 0 
                ? 'text-red-500 dark:text-red-500 sweet:text-sweet-danger' 
                : 'text-light-text-muted dark:text-dark-text-muted sweet:text-sweet-text-muted';
    }

    function getStatCardClass(theme) {
        return `stat-item bg-light-card dark:bg-dark-card sweet:bg-sweet-card shadow-sm border border-light-border dark:border-dark-border sweet:border-sweet-border rounded-lg p-4 ${theme}`;
    }
</script>

<div class="card h-full flex flex-col {textSize}">
    <!-- Scrollable content -->
    <div class="flex-1 overflow-y-auto custom-scrollbar">
        <div class="p-3">
            <div class="flex flex-col gap-2">
                <!-- Total P&L -->
                <div class="flex items-center justify-between p-2 rounded-lg hover:bg-light-hover/30 dark:hover:bg-dark-hover/30">
                    <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full {totalPnL >= 0 ? 'bg-green-500' : 'bg-red-500'} bg-opacity-10 flex items-center justify-center">
                                <svg class="w-4 h-4 {totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                            </div>
                        <div>
                            <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Total P&L</h3>
                            <p class="text-lg font-bold {getPnLColorClass(totalPnL)}">
                                {new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}).format(totalPnL)}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Unrealized P&L - Only show for Exchange/Broker accounts with open trades -->
                {#if openTrades.length > 0 && ['BINANCE_FUTURES', 'BROKER'].includes($accountStore.currentAccount?.type)}
                    <div class="flex items-center justify-between p-2 rounded-lg hover:bg-light-hover/30 dark:hover:bg-dark-hover/30">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-yellow-500 bg-opacity-10 flex items-center justify-center">
                                <svg class="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                            </div>
                            <div>
                                <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Unrealized P&L</h3>
                                {#if isLoadingPrices}
                                    <p class="text-lg font-bold text-light-text-muted dark:text-dark-text-muted">Loading...</p>
                                {:else}
                                    <div>
                                        <p class="text-lg font-bold text-yellow-500">
                                            ${totalUnrealizedPnL.toFixed(2)}
                                            {#if trades.length > 0}
                                                <span class="text-sm text-yellow-500/70">
                                                    {#if isLoadingPrices}
                                                        Loading...
                                                    {:else}
                                                        <!-- Get yesterday's date -->
                                                        {@const yesterday = new Date()}
                                                        {@const yesterdayKey = formatDateForInput(new Date(yesterday.setDate(yesterday.getDate() - 1)))}
                                                        {#if $dailyBalancesStore[yesterdayKey]?.endBalance}
                                                            ({((totalUnrealizedPnL / Math.abs($dailyBalancesStore[yesterdayKey].endBalance)) * 100).toFixed(2)}%)
                                                        {:else}
                                                            (N/A)
                                                        {/if}
                                                    {/if}
                                                </span>
                                            {/if}
                                        </p>
                                    </div>
                                {/if}
                            </div>
                        </div>
                    </div>
                {/if}

                <!-- Open Positions -->
                <div class="flex items-center justify-between p-2 rounded-lg hover:bg-light-hover/30 dark:hover:bg-dark-hover/30">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-yellow-500 bg-opacity-10 flex items-center justify-center">
                            <svg class="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                        <div>
                            <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Open Positions</h3>
                            <p class="text-lg font-bold text-light-text dark:text-dark-text">{openTrades.length}</p>
                        </div>
                    </div>
                </div>

                <!-- Total Trades -->
                <div class="flex items-center justify-between p-2 rounded-lg hover:bg-light-hover/30 dark:hover:bg-dark-hover/30">
                    <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-theme-500 bg-opacity-10 flex items-center justify-center">
                                <svg class="w-4 h-4 text-theme-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                                </svg>
                            </div>
                        <div>
                            <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Total Trades</h3>
                            <p class="text-lg font-bold text-light-text dark:text-dark-text">{openTrades.length + closedTrades.length}</p>
                        </div>
                    </div>
                </div>

                <!-- Win Rate -->
                <div class="flex items-center justify-between p-2 rounded-lg hover:bg-light-hover/30 dark:hover:bg-dark-hover/30">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-green-500 bg-opacity-10 flex items-center justify-center">
                            <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                            </svg>
                        </div>
                        <div>
                            <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Win Rate</h3>
                            <p class="text-lg font-bold text-light-text dark:text-dark-text">
                                {winRate}%
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Average Win
                <div class="flex items-center justify-between p-2 rounded-lg hover:bg-light-hover/30 dark:hover:bg-dark-hover/30">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-green-500 bg-opacity-10 flex items-center justify-center">
                            <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 11l3 3L22 4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                        <div>
                            <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Average Win</h3>
                            <p class="text-lg font-bold text-green-500">${averageWin.toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                Average Loss
                <div class="flex items-center justify-between p-2 rounded-lg hover:bg-light-hover/30 dark:hover:bg-dark-hover/30">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-red-500 bg-opacity-10 flex items-center justify-center">
                            <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                        <div>
                            <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Average Loss</h3>
                            <p class="text-lg font-bold text-red-500">${averageLoss.toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                Profit Factor
                <div class="flex items-center justify-between p-2 rounded-lg hover:bg-light-hover/30 dark:hover:bg-dark-hover/30">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-theme-500 bg-opacity-10 flex items-center justify-center">
                            <svg class="w-4 h-4 text-theme-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"/>
                            </svg>
                        </div>
                        <div>
                            <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Profit Factor</h3>
                            <p class="text-lg font-bold text-theme-500">{profitFactor}</p>
                        </div>
                    </div>
                </div>

                Largest Win
                <div class="flex items-center justify-between p-2 rounded-lg hover:bg-light-hover/30 dark:hover:bg-dark-hover/30">
                    <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-green-500 bg-opacity-10 flex items-center justify-center">
                                <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                                </svg>
                            </div>
                        <div>
                            <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Largest Win</h3>
                            <p class="text-lg font-bold text-green-500">${largestWin.toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                Largest Loss 
                <div class="flex items-center justify-between p-2 rounded-lg hover:bg-light-hover/30 dark:hover:bg-dark-hover/30">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-red-500 bg-opacity-10 flex items-center justify-center">
                            <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/>
                            </svg>
                        </div>
                        <div>
                            <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Largest Loss</h3>
                            <p class="text-lg font-bold text-red-500">${largestLoss.toFixed(2)}</p>
                        </div>
                    </div>
                </div>-->
            </div>
        </div>
    </div>
</div>

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-0 rounded-lg shadow-lg;
        min-height: 0; /* This is important for flex containers to allow scrolling */
    }

    /* Custom scrollbar styles */
    .custom-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: var(--theme-500) transparent;
    }

    .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
    }

    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }

    .custom-scrollbar::-webkit-scrollbar-thumb {
        @apply bg-theme-500/50 rounded-full;
    }

    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        @apply bg-theme-500;
    }

    /* Existing styles */
    .small {
        @apply text-sm;
    }
    .medium {
        @apply text-base;
    }
    .large {
        @apply text-lg;
    }
    .extra-large {
        @apply text-xl;
    }

    /* Add smooth transitions */
    .transition-colors {
        transition: all 0.2s ease-in-out;
    }

    /* Add styles for calendar cell */
    .calendar-cell {
        @apply rounded-sm;
        min-height: 24px;
        min-width: 24px;
    }
</style>
