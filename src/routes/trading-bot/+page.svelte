<script>
    import { onMount } from "svelte";
    import { accountStore } from "$lib/stores/accountStore";
    import { loadingStore } from "$lib/stores/loadingStore";
    import { layoutStore } from "$lib/stores/layoutStore";
    import { subscriptionStore } from "$lib/stores/subscriptionStore";
    import { SUBSCRIPTION_TYPES } from "$lib/config/subscription";
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import { fade } from "svelte/transition";
    
    // Components
    import Button from "$lib/components/common/Button.svelte";
    import Loading from "$lib/components/common/Loading.svelte";
    import Modal from "$lib/components/common/Modal.svelte";
    import Toast from "$lib/components/common/Toast.svelte";
    import LimitReachedModal from "$lib/components/common/LimitReachedModal.svelte";
    import WidgetLayout from "$lib/components/dashboard/WidgetLayout.svelte";
    import VisualScriptModal from "$lib/components/trading/VisualScriptModal.svelte";
    
    // State variables
    let error = "";
    let editMode = false;
    let activeLayoutIndex = 0;
    let showUpgradeModal = false;
    let showToast = false;
    let toastType = "";
    let toastMessage = "";
    let showLayoutDropdown = false;
    
    // Bot specific state
    let botStatus = "inactive"; // inactive, active, paused
    let activeStrategies = [];
    let botPerformance = {
        totalTrades: 0,
        winRate: 0,
        profitLoss: 0,
        averageProfit: 0,
        averageLoss: 0
    };
    let botHistory = [];
    let selectedStrategy = null;
    let showNewStrategyModal = false;
    let showEditStrategyModal = false;
    
    // Layout management
    let layouts = [{
        name: 'Default',
        widgets: []  // Initialize empty, will be populated after data loads
    }];
    
    // Mock data for development
    function loadMockData() {
        activeStrategies = [
            {
                id: "strat-1",
                name: "EMA Crossover",
                symbol: "BTCUSDT",
                timeframe: "1h",
                status: "active",
                profit: 245.32,
                tradesCount: 12,
                winRate: 75,
                description: "Strategy based on EMA crossover with risk management",
                created: "2023-12-01T10:30:00Z",
                lastUpdated: "2024-02-15T14:20:00Z"
            },
            {
                id: "strat-2",
                name: "RSI Divergence",
                symbol: "ETHUSDT",
                timeframe: "4h",
                status: "paused",
                profit: 120.45,
                tradesCount: 8,
                winRate: 62.5,
                description: "RSI divergence detection with auto stop-loss",
                created: "2024-01-05T08:15:00Z",
                lastUpdated: "2024-02-10T11:45:00Z"
            },
            {
                id: "strat-3",
                name: "Bollinger Breakout",
                symbol: "SOLUSDT",
                timeframe: "15m",
                status: "active",
                profit: -32.18,
                tradesCount: 15,
                winRate: 40,
                description: "Bollinger band breakout with volume confirmation",
                created: "2024-01-20T16:40:00Z",
                lastUpdated: "2024-02-18T09:30:00Z"
            }
        ];
        
        botHistory = [
            {
                id: "trade-1",
                strategyId: "strat-1",
                strategyName: "EMA Crossover",
                symbol: "BTCUSDT",
                type: "BUY",
                entryPrice: 42350.25,
                exitPrice: 43100.50,
                quantity: 0.05,
                profit: 37.51,
                profitPercentage: 1.77,
                entryTime: "2024-02-10T08:30:00Z",
                exitTime: "2024-02-10T14:45:00Z",
                status: "CLOSED"
            },
            {
                id: "trade-2",
                strategyId: "strat-2",
                strategyName: "RSI Divergence",
                symbol: "ETHUSDT",
                type: "SELL",
                entryPrice: 2250.75,
                exitPrice: 2180.25,
                quantity: 0.2,
                profit: 14.10,
                profitPercentage: 3.13,
                entryTime: "2024-02-12T10:15:00Z",
                exitTime: "2024-02-13T02:30:00Z",
                status: "CLOSED"
            },
            {
                id: "trade-3",
                strategyId: "strat-3",
                strategyName: "Bollinger Breakout",
                symbol: "SOLUSDT",
                type: "BUY",
                entryPrice: 102.45,
                exitPrice: 98.75,
                quantity: 5,
                profit: -18.50,
                profitPercentage: -3.61,
                entryTime: "2024-02-15T16:20:00Z",
                exitTime: "2024-02-15T18:45:00Z",
                status: "CLOSED"
            },
            {
                id: "trade-4",
                strategyId: "strat-1",
                strategyName: "EMA Crossover",
                symbol: "BTCUSDT",
                type: "BUY",
                entryPrice: 43850.50,
                quantity: 0.03,
                entryTime: "2024-02-18T09:10:00Z",
                status: "OPEN"
            }
        ];
        
        // Calculate bot performance
        const closedTrades = botHistory.filter(trade => trade.status === "CLOSED");
        botPerformance.totalTrades = closedTrades.length;
        botPerformance.profitLoss = closedTrades.reduce((sum, trade) => sum + trade.profit, 0);
        const winningTrades = closedTrades.filter(trade => trade.profit > 0);
        botPerformance.winRate = winningTrades.length / closedTrades.length * 100 || 0;
        
        if (winningTrades.length > 0) {
            botPerformance.averageProfit = winningTrades.reduce((sum, trade) => sum + trade.profit, 0) / winningTrades.length;
        }
        
        const losingTrades = closedTrades.filter(trade => trade.profit < 0);
        if (losingTrades.length > 0) {
            botPerformance.averageLoss = losingTrades.reduce((sum, trade) => sum + trade.profit, 0) / losingTrades.length;
        }
        
        // Set bot status based on active strategies
        if (activeStrategies.some(strat => strat.status === "active")) {
            botStatus = "active";
        } else if (activeStrategies.some(strat => strat.status === "paused")) {
            botStatus = "paused";
        } else {
            botStatus = "inactive";
        }
    }
    
    onMount(async () => {
        try {
            loadingStore.set(true);
            const account = await accountStore.loadAccounts();
            
            // Load layouts from localStorage
            await loadLayouts();
            
            // Check URL parameter and select layout
            const layoutParam = $page.url.searchParams.get('layout');
            if (layoutParam !== null && layoutParam !== undefined) {
                const layoutIndex = parseInt(layoutParam);
                if (!isNaN(layoutIndex) && layoutIndex >= 0 && layoutIndex < layouts.length) {
                    activeLayoutIndex = layoutIndex;
                    layoutStore.setActiveLayout(layoutIndex);
                }
            }
            
            // Load mock data for development
            loadMockData();
            
        } catch (err) {
            error = err.message;
        } finally {
            loadingStore.set(false);
        }
    });
    
    // Layout management functions
    async function loadLayouts() {
        try {
            const savedLayouts = await layoutStore.loadLayouts();
            
            layoutStore.subscribe(state => {
                layouts = state.layouts || [];
                if (activeLayoutIndex === undefined || activeLayoutIndex >= layouts.length) {
                    activeLayoutIndex = 0;
                }
            })();
            
        } catch (error) {
            console.error('Error loading layouts:', error);
            layouts = [{
                name: 'Default',
                widgets: []
            }];
            activeLayoutIndex = 0;
        }
    }
    
    async function saveLayouts() {
        try {
            await layoutStore.saveLayouts(layouts);
            window.dispatchEvent(new CustomEvent('layoutupdate'));
        } catch (error) {
            console.error('Error saving layouts:', error);
            error = 'Failed to save layouts. Please try again.';
        }
    }
    
    function checkLayoutLimit() {
        if ($subscriptionStore.type === SUBSCRIPTION_TYPES.BASIC && layouts.length >= 2) {
            showUpgradeModal = true;
            return true;
        }
        return false;
    }
    
    function upgradePlan() {
        showUpgradeModal = false;
        goto('/settings/subscription');
    }
    
    // Bot control functions
    function startBot() {
        if ($subscriptionStore.type === SUBSCRIPTION_TYPES.BASIC) {
            showUpgradeModal = true;
            return;
        }
        
        botStatus = "active";
        toastType = "success";
        toastMessage = "Trading bot started successfully";
        showToast = true;
    }
    
    function pauseBot() {
        botStatus = "paused";
        toastType = "info";
        toastMessage = "Trading bot paused";
        showToast = true;
    }
    
    function stopBot() {
        botStatus = "inactive";
        toastType = "info";
        toastMessage = "Trading bot stopped";
        showToast = true;
    }
    
    function createNewStrategy() {
        if ($subscriptionStore.type === SUBSCRIPTION_TYPES.BASIC && activeStrategies.length > 0) {
            showUpgradeModal = true;
        } else {
            goto('/trading-bot/create');
        }
    }
    
    function editStrategy(strategy) {
        goto(`/trading-bot/edit/${strategy.id}`);
    }
    
    function deleteStrategy(strategyId) {
        if (confirm("Are you sure you want to delete this strategy?")) {
            activeStrategies = activeStrategies.filter(s => s.id !== strategyId);
            toastType = "success";
            toastMessage = "Strategy deleted successfully";
            showToast = true;
        }
    }
    
    function toggleStrategyStatus(strategyId) {
        activeStrategies = activeStrategies.map(s => {
            if (s.id === strategyId) {
                const newStatus = s.status === "active" ? "paused" : "active";
                return { ...s, status: newStatus };
            }
            return s;
        });
        
        // Update bot status
        if (activeStrategies.some(strat => strat.status === "active")) {
            botStatus = "active";
        } else if (activeStrategies.some(strat => strat.status === "paused")) {
            botStatus = "paused";
        } else {
            botStatus = "inactive";
        }
    }
    
    // Helper functions
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString();
    }
    
    function formatCurrency(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(value);
    }
    
    function formatPercentage(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'percent',
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        }).format(value / 100);
    }
    
    function getStatusColor(status) {
        switch (status) {
            case "active":
                return "text-green-500";
            case "paused":
                return "text-yellow-500";
            case "inactive":
                return "text-red-500";
            default:
                return "text-gray-500";
        }
    }
    
    function getStatusBg(status) {
        switch (status) {
            case "active":
                return "bg-green-500 bg-opacity-10 border-green-500";
            case "paused":
                return "bg-yellow-500 bg-opacity-10 border-yellow-500";
            case "inactive":
                return "bg-red-500 bg-opacity-10 border-red-500";
            default:
                return "bg-gray-500 bg-opacity-10 border-gray-500";
        }
    }
    
    function getProfitColor(value) {
        return value >= 0 ? "text-green-500" : "text-red-500";
    }

    // เพิ่มฟังก์ชันสำหรับจัดการกับการบันทึกกลยุทธ์
    function handleSaveStrategy(event) {
        const strategyData = event.detail;
        
        // ถ้าเป็นการแก้ไข
        if (showEditStrategyModal && selectedStrategy) {
            // หาและอัปเดตกลยุทธ์ที่มีอยู่
            const index = activeStrategies.findIndex(s => s.id === strategyData.id);
            if (index !== -1) {
                activeStrategies[index] = strategyData;
                activeStrategies = [...activeStrategies]; // Trigger reactivity
            }
        } else {
            // เพิ่มกลยุทธ์ใหม่
            activeStrategies = [...activeStrategies, strategyData];
        }
        
        // แสดงข้อความแจ้งเตือน
        toastType = "success";
        toastMessage = showEditStrategyModal 
            ? "Strategy updated successfully" 
            : "Strategy created successfully";
        showToast = true;
        
        // รีเซ็ตสถานะ
        showNewStrategyModal = false;
        showEditStrategyModal = false;
        selectedStrategy = null;
    }
</script>

<div class="space-y-4 p-1 lg:p-4 lg:py-0 py-0">
    {#if error}
        <div class="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
            <div class="flex">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
                <span>{error}</span>
            </div>
        </div>
    {/if}

    <!-- Header -->
    <div class="flex justify-between items-center">
        <!-- Left side with title -->
        <div class="flex items-center gap-3">
            <h1 class="text-4xl font-bold bg-gradient-purple bg-clip-text text-transparent">
                Trading Bot
            </h1>
            
            {#if $accountStore.currentAccount && !editMode}
                <button
                    class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md
                           text-light-text-muted dark:text-dark-text-muted
                           hover:bg-light-hover dark:hover:bg-dark-hover
                           border border-light-border dark:border-0
                           transition-colors duration-200"
                    on:click={() => editMode = true}
                >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span class="hidden md:block">Edit layout</span>
                </button>
            {/if}
        </div>

        <!-- Right side with controls -->
        {#if $accountStore.currentAccount}
            <div class="flex items-center gap-2">
                {#if botStatus === "inactive"}
                    <Button variant="primary" size="sm" on:click={startBot}>
                        <svg class="w-5 h-5 mr-0 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span class="hidden md:flex">Start Bot</span>
                    </Button>
                {:else if botStatus === "active"}
                    <Button variant="secondary" size="sm" on:click={pauseBot}>
                        <svg class="w-5 h-5 mr-0 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span class="hidden md:flex">Pause Bot</span>
                    </Button>
                    <Button variant="danger" size="sm" on:click={stopBot}>
                        <svg class="w-5 h-5 mr-0 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                        </svg>
                        <span class="hidden md:flex">Stop Bot</span>
                    </Button>
                {:else if botStatus === "paused"}
                    <Button variant="primary" size="sm" on:click={startBot}>
                        <svg class="w-5 h-5 mr-0 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span class="hidden md:flex">Resume Bot</span>
                    </Button>
                    <Button variant="danger" size="sm" on:click={stopBot}>
                        <svg class="w-5 h-5 mr-0 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                        </svg>
                        <span class="hidden md:flex">Stop Bot</span>
                    </Button>
                {/if}
                
                <Button variant="secondary" size="sm" on:click={createNewStrategy}>
                    <svg class="w-5 h-5 mr-0 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span class="hidden md:flex">New Strategy</span>
                </Button>
            </div>
        {/if}
    </div>

    <!-- Bot Status Banner -->
    {#if $accountStore.currentAccount}
        <div class="flex items-center p-4 rounded-lg border {getStatusBg(botStatus)}">
            <div class="flex-shrink-0 mr-4">
                {#if botStatus === "active"}
                    <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                {:else if botStatus === "paused"}
                    <svg class="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                {:else}
                    <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                {/if}
            </div>
            <div>
                <h3 class="text-lg font-semibold {getStatusColor(botStatus)}">
                    Bot Status: {botStatus.charAt(0).toUpperCase() + botStatus.slice(1)}
                </h3>
                <p class="text-light-text-muted dark:text-dark-text-muted">
                    {#if botStatus === "active"}
                        Your trading bot is currently active and monitoring the market for trading opportunities.
                    {:else if botStatus === "paused"}
                        Your trading bot is paused. No new trades will be executed, but existing positions are still being monitored.
                    {:else}
                        Your trading bot is inactive. Start the bot to begin automated trading.
                    {/if}
                </p>
            </div>
        </div>
    {/if}

    <!-- Content -->
    <div class="relative">
        {#if $loadingStore}
            <Loading message="Loading..." overlay={true} />
        {/if}
        
        <div class="transition-opacity duration-200" class:opacity-0={$loadingStore}>
            {#if $accountStore.currentAccount}
                <!-- Performance Metrics -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <!-- Total Trades -->
                    <div class="bg-light-card dark:bg-dark-card border border-light-border dark:border-0 rounded-lg p-4 shadow-sm">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-light-text-muted dark:text-dark-text-muted text-sm">Total Trades</p>
                                <h3 class="text-2xl font-bold text-light-text dark:text-dark-text">{botPerformance.totalTrades}</h3>
                            </div>
                            <div class="p-3 rounded-full bg-blue-500 bg-opacity-10">
                                <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Win Rate -->
                    <div class="bg-light-card dark:bg-dark-card border border-light-border dark:border-0 rounded-lg p-4 shadow-sm">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-light-text-muted dark:text-dark-text-muted text-sm">Win Rate</p>
                                <h3 class="text-2xl font-bold text-light-text dark:text-dark-text">{formatPercentage(botPerformance.winRate)}</h3>
                            </div>
                            <div class="p-3 rounded-full bg-green-500 bg-opacity-10">
                                <svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Profit/Loss -->
                    <div class="bg-light-card dark:bg-dark-card border border-light-border dark:border-0 rounded-lg p-4 shadow-sm">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-light-text-muted dark:text-dark-text-muted text-sm">Total P&L</p>
                                <h3 class="text-2xl font-bold {getProfitColor(botPerformance.profitLoss)}">{formatCurrency(botPerformance.profitLoss)}</h3>
                            </div>
                            <div class="p-3 rounded-full {botPerformance.profitLoss >= 0 ? 'bg-green-500 bg-opacity-10' : 'bg-red-500 bg-opacity-10'}">
                                <svg class="w-6 h-6 {getProfitColor(botPerformance.profitLoss)}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {#if botPerformance.profitLoss >= 0}
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    {:else}
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                                    {/if}
                                </svg>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Active Strategies -->
                    <div class="bg-light-card dark:bg-dark-card border border-light-border dark:border-0 rounded-lg p-4 shadow-sm">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-light-text-muted dark:text-dark-text-muted text-sm">Active Strategies</p>
                                <h3 class="text-2xl font-bold text-light-text dark:text-dark-text">
                                    {activeStrategies.filter(s => s.status === "active").length} / {activeStrategies.length}
                                </h3>
                            </div>
                            <div class="p-3 rounded-full bg-purple-500 bg-opacity-10">
                                <svg class="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Strategies Section -->
                <div class="bg-light-card dark:bg-dark-card border border-light-border dark:border-0 rounded-lg shadow-sm mb-6">
                    <div class="p-4 border-b border-light-border dark:border-dark-border">
                        <h2 class="text-xl font-bold text-light-text dark:text-dark-text">Trading Strategies</h2>
                    </div>
                    
                    {#if activeStrategies.length === 0}
                        <div class="p-8 text-center">
                            <svg class="w-16 h-16 mx-auto text-light-text-muted dark:text-dark-text-muted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <h3 class="text-lg font-semibold text-light-text dark:text-dark-text mb-2">No Strategies Found</h3>
                            <p class="text-light-text-muted dark:text-dark-text-muted mb-4">Create your first trading strategy to start automated trading.</p>
                            <Button variant="primary" size="sm" on:click={createNewStrategy}>
                                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                                </svg>
                                Create Strategy
                            </Button>
                        </div>
                    {:else}
                        <div class="overflow-x-auto">
                            <table class="w-full">
                                <thead>
                                    <tr class="text-left text-light-text-muted dark:text-dark-text-muted text-xs uppercase tracking-wider">
                                        <th class="p-4">Name</th>
                                        <th class="p-4">Symbol</th>
                                        <th class="p-4">Timeframe</th>
                                        <th class="p-4">Status</th>
                                        <th class="p-4">P&L</th>
                                        <th class="p-4">Win Rate</th>
                                        <th class="p-4">Trades</th>
                                        <th class="p-4">Last Updated</th>
                                        <th class="p-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-light-border dark:divide-dark-border">
                                    {#each activeStrategies as strategy}
                                        <tr class="hover:bg-light-hover dark:hover:bg-dark-hover">
                                            <td class="p-4">
                                                <div class="font-medium text-light-text dark:text-dark-text">{strategy.name}</div>
                                                <div class="text-xs text-light-text-muted dark:text-dark-text-muted">{strategy.description}</div>
                                            </td>
                                            <td class="p-4 font-medium">{strategy.symbol}</td>
                                            <td class="p-4">{strategy.timeframe}</td>
                                            <td class="p-4">
                                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusColor(strategy.status)} {getStatusBg(strategy.status)}">
                                                    {strategy.status.charAt(0).toUpperCase() + strategy.status.slice(1)}
                                                </span>
                                            </td>
                                            <td class="p-4 font-medium {getProfitColor(strategy.profit)}">{formatCurrency(strategy.profit)}</td>
                                            <td class="p-4">{formatPercentage(strategy.winRate)}</td>
                                            <td class="p-4">{strategy.tradesCount}</td>
                                            <td class="p-4 text-light-text-muted dark:text-dark-text-muted text-sm">{formatDate(strategy.lastUpdated)}</td>
                                            <td class="p-4">
                                                <div class="flex space-x-2">
                                                    <button 
                                                        class="p-1.5 rounded-md text-light-text-muted dark:text-dark-text-muted hover:bg-light-hover dark:hover:bg-dark-hover"
                                                        on:click={() => toggleStrategyStatus(strategy.id)}
                                                        title={strategy.status === "active" ? "Pause Strategy" : "Activate Strategy"}
                                                    >
                                                        {#if strategy.status === "active"}
                                                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        {:else}
                                                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        {/if}
                                                    </button>
                                                    <button 
                                                        class="p-1.5 rounded-md text-light-text-muted dark:text-dark-text-muted hover:bg-light-hover dark:hover:bg-dark-hover"
                                                        on:click={() => editStrategy(strategy)}
                                                        title="Edit Strategy"
                                                    >
                                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button 
                                                        class="p-1.5 rounded-md text-light-text-muted dark:text-dark-text-muted hover:bg-light-hover dark:hover:bg-dark-hover hover:text-red-500"
                                                        on:click={() => deleteStrategy(strategy.id)}
                                                        title="Delete Strategy"
                                                    >
                                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        </div>
                    {/if}
                </div>

                <!-- Bot Trade History -->
                <div class="bg-light-card dark:bg-dark-card border border-light-border dark:border-0 rounded-lg shadow-sm">
                    <div class="p-4 border-b border-light-border dark:border-dark-border">
                        <h2 class="text-xl font-bold text-light-text dark:text-dark-text">Trade History</h2>
                    </div>
                    
                    {#if botHistory.length === 0}
                        <div class="p-8 text-center">
                            <svg class="w-16 h-16 mx-auto text-light-text-muted dark:text-dark-text-muted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            <h3 class="text-lg font-semibold text-light-text dark:text-dark-text mb-2">No Trade History</h3>
                            <p class="text-light-text-muted dark:text-dark-text-muted">Your bot hasn't executed any trades yet.</p>
                        </div>
                    {:else}
                        <div class="overflow-x-auto">
                            <table class="w-full">
                                <thead>
                                    <tr class="text-left text-light-text-muted dark:text-dark-text-muted text-xs uppercase tracking-wider">
                                        <th class="p-4">Strategy</th>
                                        <th class="p-4">Symbol</th>
                                        <th class="p-4">Type</th>
                                        <th class="p-4">Entry Price</th>
                                        <th class="p-4">Exit Price</th>
                                        <th class="p-4">Quantity</th>
                                        <th class="p-4">P&L</th>
                                        <th class="p-4">P&L %</th>
                                        <th class="p-4">Entry Time</th>
                                        <th class="p-4">Exit Time</th>
                                        <th class="p-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-light-border dark:divide-dark-border">
                                    {#each botHistory as trade}
                                        <tr class="hover:bg-light-hover dark:hover:bg-dark-hover">
                                            <td class="p-4 font-medium text-light-text dark:text-dark-text">{trade.strategyName}</td>
                                            <td class="p-4">{trade.symbol}</td>
                                            <td class="p-4">
                                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {trade.type === 'BUY' ? 'text-green-500 bg-green-500 bg-opacity-10' : 'text-red-500 bg-red-500 bg-opacity-10'}">
                                                    {trade.type}
                                                </span>
                                            </td>
                                            <td class="p-4">{trade.entryPrice.toFixed(2)}</td>
                                            <td class="p-4">{trade.exitPrice ? trade.exitPrice.toFixed(2) : '-'}</td>
                                            <td class="p-4">{trade.quantity}</td>
                                            <td class="p-4 font-medium {trade.profit ? getProfitColor(trade.profit) : ''}">
                                                {trade.profit ? formatCurrency(trade.profit) : '-'}
                                            </td>
                                            <td class="p-4 {trade.profitPercentage ? getProfitColor(trade.profitPercentage) : ''}">
                                                {trade.profitPercentage ? formatPercentage(trade.profitPercentage) : '-'}
                                            </td>
                                            <td class="p-4 text-light-text-muted dark:text-dark-text-muted text-sm">{formatDate(trade.entryTime)}</td>
                                            <td class="p-4 text-light-text-muted dark:text-dark-text-muted text-sm">{trade.exitTime ? formatDate(trade.exitTime) : '-'}</td>
                                            <td class="p-4">
                                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {trade.status === 'OPEN' ? 'text-blue-500 bg-blue-500 bg-opacity-10' : 'text-green-500 bg-green-500 bg-opacity-10'}">
                                                    {trade.status}
                                                </span>
                                            </td>
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        </div>
                    {/if}
                </div>
            {:else}
                <!-- No Account State -->
                <div class="card p-16 text-center space-y-6">
                    <div class="flex flex-col items-center justify-center space-y-4">
                        <svg class="w-16 h-16 text-light-text-muted dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                        <h2 class="text-2xl font-bold text-light-text dark:text-dark-text">
                            Create an account to use the Trading Bot
                        </h2>
                        <p class="text-light-text-muted dark:text-dark-text-muted max-w-md">
                            Connect your trading account to set up automated trading strategies and let the bot trade for you.
                        </p>
                        <Button variant="primary" size="sm" on:click={() => goto('/settings/accounts')}>
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Add Account
                        </Button>
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div>

<!-- Modals -->
{#if showUpgradeModal}
    <LimitReachedModal
        show={showUpgradeModal}
        title="Subscription Required"
        description="Trading Bot features are available for Pro users only. Upgrade to Pro for automated trading and advanced features."
        upgradeText="Upgrade to Pro"
        cancelText="Maybe Later"
        width="md"
        on:close={() => showUpgradeModal = false}
        on:upgrade={upgradePlan}
    />
{/if}

{#if showNewStrategyModal}
    <VisualScriptModal
        bind:show={showNewStrategyModal}
        isEdit={false}
        on:save={handleSaveStrategy}
        on:close={() => showNewStrategyModal = false}
    />
{/if}

{#if showEditStrategyModal && selectedStrategy}
    <VisualScriptModal
        bind:show={showEditStrategyModal}
        isEdit={true}
        strategy={selectedStrategy}
        on:save={handleSaveStrategy}
        on:close={() => {
            showEditStrategyModal = false;
            selectedStrategy = null;
        }}
    />
{/if}

<!-- Toast notification -->
<Toast 
    bind:show={showToast}
    message={toastMessage}
    type={toastType}
    duration={3000}
/>

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-0 rounded-lg shadow-lg;
    }
    
    .bg-gradient-purple {
        @apply bg-gradient-to-r from-purple-500 to-theme-500;
    }
</style> 