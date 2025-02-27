<script>
    import { onMount } from 'svelte';
    import { accountStore } from '$lib/stores/accountStore';
    import { api } from '$lib/utils/api';
    
    export let trades = [];
    export let period = 'daily'; // 'daily', 'weekly', etc.
    export let target = 1000;
    export let height;
    export let textSize;
    export let isPreview = false;

    let currentPnL = 0;
    let progress = 0;
    let daysLeft = 0;
    let currentAccountId = null;

    // เพิ่มฟังก์ชันสำหรับโหลด trades
    async function loadTrades() {
        if (!$accountStore.currentAccount) return;
        
        try {
            trades = await api.getTrades($accountStore.currentAccount._id);
            calculatePnL();
        } catch (err) {
            console.error('Error loading trades:', err);
        }
    }

    onMount(() => {
        if (isPreview) return;
        loadTrades();

        // Subscribe to trade and transaction updates
        const handleUpdate = async () => {
            // console.log('ProfitTarget: Received update event');
            await loadTrades();
        };
        
        window.addEventListener('tradeupdated', handleUpdate);
        window.addEventListener('transactionupdated', handleUpdate);
        window.addEventListener('tradesynced', handleUpdate);
        
        return () => {
            window.removeEventListener('tradeupdated', handleUpdate);
            window.removeEventListener('transactionupdated', handleUpdate);
            window.removeEventListener('tradesynced', handleUpdate);
        };
    });

    // Watch for account changes
    $: if ($accountStore.currentAccount?._id !== currentAccountId && !isPreview) {
        currentAccountId = $accountStore.currentAccount?._id;
        loadTrades();
    }

    // Watch for trades changes
    $: if (trades) {
        calculatePnL();
    }

    function calculatePnL() {
        // Filter trades by the chosen period
        const now = new Date();
        let filteredTrades = trades;

        if (period === 'daily') {
            filteredTrades = trades.filter(t => {
                const tradeDate = new Date(t.exitDate || t.entryDate);
                return tradeDate.toDateString() === now.toDateString();
            });
            daysLeft = 1;
        } else if (period === 'weekly') {
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            filteredTrades = trades.filter(t => {
                const tradeDate = new Date(t.exitDate || t.entryDate);
                return tradeDate >= startOfWeek;
            });
            daysLeft = 7 - now.getDay();
        } else if (period === 'monthly') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            filteredTrades = trades.filter(t => {
                const tradeDate = new Date(t.exitDate || t.entryDate);
                return tradeDate >= startOfMonth;
            });
            daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
        } else if (period === 'quarterly') {
            const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth()/3)*3, 1);
            filteredTrades = trades.filter(t => {
                const tradeDate = new Date(t.exitDate || t.entryDate);
                return tradeDate >= quarterStart;
            });
            const nextQuarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth()/3)*3 + 3, 1);
            daysLeft = Math.ceil((nextQuarterStart - now) / (1000 * 60 * 60 * 24));
        } else if (period === 'yearly') {
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            filteredTrades = trades.filter(t => {
                const tradeDate = new Date(t.exitDate || t.entryDate);
                return tradeDate >= startOfYear;
            });
            const nextYearStart = new Date(now.getFullYear() + 1, 0, 1);
            daysLeft = Math.ceil((nextYearStart - now) / (1000 * 60 * 60 * 24));
        }

        currentPnL = filteredTrades.reduce((sum, trade) => {
            if (trade.status === "CLOSED") {
                return sum + (trade.pnl || 0);
            }
            return sum;
        }, 0);

        progress = currentPnL <= 0 ? 0 : Math.min(currentPnL / target, 1);
    }

    function formatCompactNumber(value) {
        if (Math.abs(value) >= 1000000) {
            return (value / 1000000).toFixed(1) + 'M';
        } else if (Math.abs(value) >= 1000) {
            return (value / 1000).toFixed(1) + 'K';
        }
        return value.toFixed(0);
    }

    function formatTimeRemaining(daysLeft) {
        const now = new Date();
        let endDate;
        
        // Calculate end date based on period
        if (period === 'daily') {
            endDate = new Date(now);
            endDate.setHours(23, 59, 59, 999);
        } else if (period === 'weekly') {
            endDate = new Date(now);
            endDate.setDate(now.getDate() + (6 - now.getDay()));
            endDate.setHours(23, 59, 59, 999);
        } else if (period === 'monthly') {
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        } else if (period === 'quarterly') {
            const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
            endDate = new Date(quarterEnd.setHours(23, 59, 59, 999));
        } else if (period === 'yearly') {
            endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        }

        const diffMs = endDate - now;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (diffDays >= 3) {
            return `${Math.floor(diffDays)} days remaining`;
        } else if (diffDays >= 1) {
            return `${Math.floor(diffDays)} days ${diffHours}h remaining`;
        } else {
            return diffHours > 0 
                ? `${diffHours}h ${diffMinutes}m remaining`
                : `${diffMinutes} minutes remaining`;
        }
    }
</script>

<!-- Desktop Layout -->
<div class="hidden md:block space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-theme-500 bg-opacity-10 flex items-center justify-center">
                <svg class="w-4 h-4 text-theme-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
            </div>
            <div>
                <h3 class="text-sm font-medium text-light-text dark:text-dark-text capitalize">
                    {period} Goal
                </h3>
                <p class="text-xs text-light-text-muted dark:text-dark-text-muted">
                    {formatTimeRemaining(daysLeft)}
                </p>
            </div>
        </div>
        <div class="text-right">
            <p class="text-xl font-bold text-theme-500">
                {currentPnL >= 0 ? Math.round(progress * 100) : 0}%
            </p>
        </div>
    </div>

    <!-- Progress Bar -->
    <div class="relative">
        <div class="w-full h-2.5 bg-light-card dark:bg-dark-border rounded-full overflow-hidden">
            <div 
                class="h-full bg-theme-500 transition-all duration-300 rounded-full"
                style="width: {progress * 100}%"
            />
        </div>
        <div class="mt-2 flex justify-between items-center text-xs">
            <div>
                <p class="font-medium text-light-text-muted dark:text-dark-text-muted">
                    ${formatCompactNumber(currentPnL)}
                </p>
            </div>
            <div class="text-right">
                <p class="font-medium text-light-text-muted dark:text-dark-text-muted">
                    ${formatCompactNumber(target)}
                </p>
            </div>
        </div>
    </div>
</div>

<!-- Mobile Layout -->
<div class="md:hidden">
    <div class="space-y-4">
        <!-- Header -->
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
                <div class="w-10 h-10 rounded-full bg-theme-500 bg-opacity-10 flex items-center justify-center">
                    <svg class="w-5 h-5 text-theme-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                </div>
                <div>
                    <h3 class="text-base font-medium text-light-text dark:text-dark-text">
                        {period} Goal
                    </h3>
                    <p class="text-xs text-light-text-muted dark:text-dark-text-muted">
                        {formatTimeRemaining(daysLeft)}
                    </p>
                </div>
            </div>
            <div class="text-right">
                <p class="text-2xl font-bold text-theme-500">
                    {currentPnL >= 0 ? Math.round(progress * 100) : 0}%
                    {#if currentPnL < 0}
                    <span class="text-sm">(-{Math.abs(Math.round(currentPnL / target * 100))}%)</span>
                    {/if}
                </p>
            </div>
        </div>

        <!-- Progress Bar -->
        <div class="relative">
            <div class="w-full h-3 bg-light-card dark:bg-dark-border rounded-full overflow-hidden">
                <div 
                    class="h-full bg-theme-500 transition-all duration-300 rounded-full"
                    style="width: {progress * 100}%"
                />
            </div>
            <div class="mt-2 flex justify-between items-center text-sm">
                <div>
                    <p class="font-medium text-light-text-muted dark:text-dark-text-muted">
                        ${formatCompactNumber(currentPnL)}
                    </p>
                </div>
                <div class="text-right">
                    <p class="font-medium text-light-text-muted dark:text-dark-text-muted">
                        ${formatCompactNumber(target)}
                    </p>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    /* Add smooth transitions */
    .bg-theme-500, .bg-red-500 {
        transition: width 0.3s ease-in-out;
    }

    /* Add hover effect for progress bar */
    .bg-theme-500:hover, .bg-red-500:hover {
        filter: brightness(1.1);
    }
</style>