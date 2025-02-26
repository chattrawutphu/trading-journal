<script>
    import { fade, slide } from 'svelte/transition';
    import { accountStore } from '$lib/stores/accountStore';
    import { tradingStatsConfig, PERIOD_OPTIONS } from '$lib/utils/widgetUtils';
    import { api } from '$lib/utils/api';
    import { onMount, createEventDispatcher } from 'svelte';
    import { dailyBalancesStore } from '$lib/stores/dailyBalancesStore';

    const dispatch = createEventDispatcher();
    let stats = {};
    let error = '';
    let showConfig = false;
    let currentAccountId = null;
    let showOtherPeriods = false;
    let selectedPeriod = null;

    export let height;
    export let textSize;
    export let isPreview = false;

    // ปรับปรุงฟังก์ชัน loadStats
    let loadStatsTimeout;
    async function loadStats() {
        if (loadStatsTimeout) {
            clearTimeout(loadStatsTimeout);
        }

        loadStatsTimeout = setTimeout(async () => {
            if (!$accountStore.currentAccount) return;
            
            // Clear existing stats
            stats = {};
            
            const accountId = $accountStore.currentAccount._id;

            try {
                error = '';
                stats = {};

                const requests = $tradingStatsConfig.selectedPeriods.map(async period => {
                    const { startDate, endDate } = getPeriodDates(period);
                    
                    // ดึงข้อมูล stats
                    const periodStats = await api.getStats(accountId, period);
                    if (!periodStats) return null;

                    // ใช้ dailyBalances จาก store
                    const balances = $dailyBalancesStore;
                    
                    // หา start balance และ current balance
                    let startBalance = 0;
                    let currentBalance = 0;

                    if (balances && Object.keys(balances).length > 0) {
                        // เรียงวันที่
                        const sortedDates = Object.keys(balances).sort();
                        
                        if (period === 'all') {
                            // สำหรับ all-time หาวันแรกที่มีกิจกรรม (trade หรือ transaction)
                            for (const date of sortedDates) {
                                if (balances[date].hasActivity) {
                                    startBalance = balances[date].endBalance;
                                    break;
                                }
                            }
                            // ใช้ end balance ของวันล่าสุด
                            const lastDate = sortedDates[sortedDates.length - 1];
                            currentBalance = balances[lastDate].endBalance;
                        } else if (startDate) {
                            // สำหรับช่วงเวลาอื่นๆ ใช้ start balance ของวันแรกของช่วง
                            const firstDate = startDate.toISOString().split('T')[0];
                            
                            // ถ้าไม่มีข้อมูลของวันแรก ให้หาวันที่ใกล้เคียงที่สุด
                            if (!balances[firstDate]) {
                                const nearestDate = sortedDates.find(date => date >= firstDate);
                                if (nearestDate) {
                                    startBalance = balances[nearestDate].startBalance;
                                }
                            } else {
                                startBalance = balances[firstDate].startBalance;
                            }
                            
                            // ใช้ end balance ของวันสุดท้ายในช่วง
                            const endDateStr = endDate.toISOString().split('T')[0];
                            const lastAvailableDate = sortedDates
                                .filter(date => date <= endDateStr)
                                .pop();
                            if (lastAvailableDate) {
                                currentBalance = balances[lastAvailableDate].endBalance;
                            }
                        }
                    }

                    // คำนวณ percentage จาก balance
                    let balanceChange = 0;
                    if (startBalance !== 0) {
                        if (period === 'all') {
                            // สำหรับ all-time ใช้ผลต่างของ balance
                            balanceChange = ((currentBalance - startBalance) / Math.abs(startBalance)) * 100;
                        } else {
                            // สำหรับช่วงเวลาอื่นๆ ใช้ P&L
                            balanceChange = ((periodStats.pnl / Math.abs(startBalance)) * 100);
                        }
                    }

                    return {
                        ...periodStats,
                        balanceChange
                    };
                });

                const results = await Promise.all(requests);

                let newStats = {};
                $tradingStatsConfig.selectedPeriods.forEach((period, i) => {
                    if (results[i] !== null) {
                        newStats[period] = results[i];
                    }
                });
                
                stats = newStats;

                if (!selectedPeriod && $tradingStatsConfig.selectedPeriods.length > 0) {
                    selectedPeriod = $tradingStatsConfig.selectedPeriods[0];
                }
            } catch (err) {
                error = err.message;
                console.error('Error loading stats:', err);
            }
        }, 300);
    }

    // เพิ่ม event listeners สำหรับ trade และ transaction updates
    onMount(async () => {
        if (isPreview) return;
        if ($accountStore.currentAccount) {
            await loadStats();
        }

        // Subscribe to trade and transaction updates
        const handleUpdate = () => {
            console.log('TradingStats: Received update event');
            loadStats();
        };
        
        window.addEventListener('tradeupdated', handleUpdate);
        window.addEventListener('transactionupdated', handleUpdate);
        window.addEventListener('tradesynced', handleUpdate);
        
        return () => {
            window.removeEventListener('tradeupdated', handleUpdate);
            window.removeEventListener('transactionupdated', handleUpdate);
            window.removeEventListener('tradesynced', handleUpdate);
            if (loadStatsTimeout) {
                clearTimeout(loadStatsTimeout);
            }
        };
    });

    // เพิ่มฟังก์ชันสำหรับหาวันแรกและวันสุดท้ายของแต่ละช่วงเวลา
    function getPeriodDates(period) {
        const today = new Date();
        let startDate = new Date();
        
        switch (period) {
            case 'day':
                startDate = new Date(today.setHours(0, 0, 0, 0));
                break;
            case 'week':
                // หาวันแรกของสัปดาห์ (จันทร์)
                const day = today.getDay();
                const diff = today.getDate() - day + (day === 0 ? -6 : 1);
                startDate = new Date(today.setDate(diff));
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'month':
                // วันแรกของเดือน
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                break;
            case 'year':
                // วันแรกของปี
                startDate = new Date(today.getFullYear(), 0, 1);
                break;
            case 'all':
                // ใช้วันแรกที่มีการเทรด
                return { startDate: null, endDate: today };
        }
        
        return { startDate, endDate: today };
    }

    // Watch for account changes
    $: if ($accountStore.currentAccount?._id !== currentAccountId && !isPreview) {
        currentAccountId = $accountStore.currentAccount?._id;
        loadStats();
    }

    function formatPercentage(value) {
        // แปลงเป็น number ก่อนใช้งาน
        const numValue = Number(value);
        const sign = numValue > 0 ? '+' : '';
        return `${sign}${numValue.toFixed(2)}%`;
    }

    function formatCurrency(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    // เพิ่มฟังก์ชันสำหรับ format ตัวเลขให้สั้นลง
    function formatCompactNumber(value) {
        if (Math.abs(value) >= 1000000) {
            return (value / 1000000).toFixed(1) + 'M';
        } else if (Math.abs(value) >= 1000) {
            return (value / 1000).toFixed(1) + 'K';
        }
        return value.toFixed(0);
    }

    function toggleOtherPeriods() {
        showOtherPeriods = !showOtherPeriods;
    }

    $: {
        if ($tradingStatsConfig.selectedPeriods?.length > 0 && !selectedPeriod) {
            selectedPeriod = $tradingStatsConfig.selectedPeriods[0];
        }
    }

    $: currentPeriodData = selectedPeriod && stats[selectedPeriod] 
        ? stats[selectedPeriod] 
        : { pnl: 0, trades: 0, balanceChange: 0 };
</script>

<div class="h-full relative group">
    <!-- Mobile Layout -->
    <div class="md:hidden">
        {#if selectedPeriod && stats[selectedPeriod]}
            <!-- Main Card -->
            <div 
                class="card p-4 relative cursor-pointer hover:bg-light-hover/50 dark:hover:bg-dark-hover/50 transition-all" 
                on:click={toggleOtherPeriods}
            >
                <!-- Period Label & Icon -->
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-2">
                        <div class="w-10 h-10 rounded-full {currentPeriodData.pnl >= 0 ? 'bg-green-500' : 'bg-red-500'} bg-opacity-10 flex items-center justify-center">
                            <svg class="w-5 h-5 {currentPeriodData.pnl >= 0 ? 'text-green-500' : 'text-red-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={PERIOD_OPTIONS[selectedPeriod].icon}/>
                            </svg>
                        </div>
                        <div>
                            <h3 class="text-base font-medium text-light-text dark:text-dark-text capitalize">
                                {PERIOD_OPTIONS[selectedPeriod].label}
                            </h3>
                            <p class="text-xs text-light-text-muted dark:text-dark-text-muted">
                                {currentPeriodData.trades} trade{currentPeriodData.trades !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                    <svg 
                        class=" absolute bottom-2 right-2/4 w-5 h-5 text-light-text-muted dark:text-dark-text-muted transition-transform duration-200 {showOtherPeriods ? 'rotate-180' : ''}"
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                </div>

                <!-- PnL Display -->
                <div class="flex items-baseline gap-2">
                    <p class="text-3xl font-bold {currentPeriodData.pnl >= 0 ? 'text-green-500' : 'text-red-500'}">
                        {formatCurrency(currentPeriodData.pnl)}
                    </p>
                    {#if currentPeriodData.balanceChange !== 0}
                        <p class="text-sm font-medium {currentPeriodData.balanceChange > 0 ? 'text-green-500' : 'text-red-500'}">
                            {formatPercentage(currentPeriodData.balanceChange)}
                        </p>
                    {/if}
                </div>
            </div>

            <!-- Period List Dropdown -->
            {#if showOtherPeriods}
                <div 
                    class="mt-2 rounded-lg overflow-hidden shadow-lg divide-y divide-light-border dark:divide-dark-border"
                    transition:slide={{ duration: 200 }}
                >
                    {#each $tradingStatsConfig.selectedPeriods as period}
                        {#if stats[period]}
                            <button
                                class="w-full flex items-center justify-between p-4 bg-light-card dark:bg-dark-card hover:bg-light-hover dark:hover:bg-dark-hover transition-colors {period === selectedPeriod ? 'bg-theme-500/5 border-l-4 border-theme-500' : 'border-l-4 border-transparent'}"
                                on:click={() => {
                                    selectedPeriod = period;
                                    showOtherPeriods = false;
                                }}
                            >
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-full {stats[period]?.pnl >= 0 ? 'bg-green-500' : 'bg-red-500'} bg-opacity-10 flex items-center justify-center">
                                        <svg class="w-5 h-5 {stats[period]?.pnl >= 0 ? 'text-green-500' : 'text-red-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={PERIOD_OPTIONS[period].icon}/>
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 class="text-base font-medium text-light-text dark:text-dark-text capitalize">
                                            {PERIOD_OPTIONS[period].label}
                                        </h3>
                                        <p class="text-xs text-light-text-muted dark:text-dark-text-muted">
                                            {stats[period]?.trades || 0} trades
                                        </p>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <p class="text-base font-bold {stats[period]?.pnl >= 0 ? 'text-green-500' : 'text-red-500'}">
                                        {formatCompactNumber(stats[period]?.pnl || 0)}
                                    </p>
                                    {#if stats[period]?.balanceChange !== 0}
                                        <p class="text-xs font-medium {stats[period]?.balanceChange > 0 ? 'text-green-500' : 'text-red-500'}">
                                            {formatPercentage(stats[period]?.balanceChange || 0)}
                                        </p>
                                    {/if}
                                </div>
                            </button>
                        {/if}
                    {/each}
                </div>
            {/if}
        {:else}
            <div class="card p-4 text-center">
                <div class="animate-pulse flex flex-col items-center gap-4">
                    <div class="w-10 h-10 bg-light-hover dark:bg-dark-hover rounded-full"></div>
                    <div class="h-4 w-24 bg-light-hover dark:bg-dark-hover rounded"></div>
                    <div class="h-6 w-32 bg-light-hover dark:bg-dark-hover rounded"></div>
                </div>
            </div>
        {/if}
    </div>

    <!-- Desktop Layout -->
    <div class="hidden md:grid gap-2 lg:gap-4" 
        style="grid-template-columns: repeat({$tradingStatsConfig.selectedPeriods.length}, minmax(0, 1fr));">
        {#if selectedPeriod && stats[selectedPeriod]}
            {#each $tradingStatsConfig.selectedPeriods as period}
                {@const data = stats[period] || { pnl: 0, trades: 0, balanceChange: 0 }}
                <div class="card p-4">
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="text-sm font-medium text-light-text dark:text-dark-text capitalize">
                            {PERIOD_OPTIONS[period].label}
                        </h3>
                        <div class="w-8 h-8 rounded-full {data.pnl >= 0 ? 'bg-green-500' : 'bg-red-500'} bg-opacity-10 flex items-center justify-center">
                            <svg class="w-4 h-4 {data.pnl >= 0 ? 'text-green-500' : 'text-red-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={PERIOD_OPTIONS[period].icon}/>
                            </svg>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <div class="flex flex-wrap items-baseline justify-between">
                            <p class="text-md {data.pnl >= 0 ? 'text-green-500' : 'text-red-500'}">
                                {formatCurrency(data.pnl)}
                            </p>
                            {#if data.balanceChange !== 0}
                                <p class="text-sm font-bold {data.balanceChange > 0 ? 'text-green-500' : 'text-red-500'}">
                                    {formatPercentage(data.balanceChange)}
                                </p>
                            {/if}
                        </div>
                        <div class="flex items-baseline justify-between">
                            <p class="text-sm text-light-text-muted dark:text-dark-text-muted">
                                {data.trades} trade{data.trades !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                </div>
            {/each}
        {:else}
            <!-- Skeleton Loading for Desktop -->
            {#each Array($tradingStatsConfig.selectedPeriods.length) as _, i}
                <div class="card p-4">
                    <div class="animate-pulse space-y-4">
                        <!-- Header -->
                        <div class="flex items-center justify-between">
                            <div class="h-4 w-20 bg-light-hover dark:bg-dark-hover rounded"></div>
                            <div class="w-8 h-8 rounded-full bg-light-hover dark:bg-dark-hover"></div>
                        </div>
                        
                        <!-- PnL and Stats -->
                        <div class="space-y-2">
                            <div class="h-6 w-32 bg-light-hover dark:bg-dark-hover rounded"></div>
                            <div class="h-4 w-24 bg-light-hover dark:bg-dark-hover rounded"></div>
                        </div>
                        
                        <!-- Trade Count -->
                        <div class="h-4 w-16 bg-light-hover dark:bg-dark-hover rounded"></div>
                    </div>
                </div>
            {/each}
        {/if}
    </div>

    <!-- Config Button -->
</div>

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-0 rounded-lg shadow-lg;
    }

    /* Add active state for mobile */
    @media (max-width: 768px) {
        .card:active {
            @apply bg-light-hover/50 dark:bg-dark-hover/50;
        }
    }

    /* Optional hover effect for desktop */
    @media (hover: hover) {
        .card:hover {
            @apply shadow-xl;
            transform: translateY(-1px);
        }
    }
</style>
