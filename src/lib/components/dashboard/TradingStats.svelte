<script>
    import { fade, slide } from 'svelte/transition';
    import { accountStore } from '$lib/stores/accountStore';
    import { tradingStatsStore, PERIOD_OPTIONS } from '$lib/stores/tradingStatsStore';
    import { api } from '$lib/utils/api';
    import { onMount, createEventDispatcher } from 'svelte';
    import TradingStatsConfig from './TradingStatsConfig.svelte';

    const dispatch = createEventDispatcher();
    let stats = {};
    let error = '';
    let showConfig = false;
    let isHovering = false;
    let currentAccountId = null;
    let showOtherPeriods = false;
    let selectedPeriod = null;

    export let height;
    export let textSize;
    export let isPreview = false;

    onMount(async () => {
        if (isPreview) return;
        if ($accountStore.currentAccount) {
            await loadStats();
        }

        // Subscribe to trade updates
        window.addEventListener('tradeupdate', loadStats);
        return () => {
            window.removeEventListener('tradeupdate', loadStats);
        };
    });

    async function loadStats() {
        if (!$accountStore.currentAccount) return;
        
        const accountId = $accountStore.currentAccount._id;

        try {
            error = '';
            stats = {};

            // Create a single batch request for all periods
            const requests = $tradingStatsStore.selectedPeriods.map(period => 
                api.getStats(accountId, period).catch(err => null)
            );

            // Wait for all requests to complete
            const results = await Promise.all(requests);

            // Process results
            let newStats = {};
            $tradingStatsStore.selectedPeriods.forEach((period, i) => {
                if (results[i] !== null) {
                    newStats[period] = results[i];
                }
            });
            
            stats = newStats;

            // Set selectedPeriod if not set
            if (!selectedPeriod && $tradingStatsStore.selectedPeriods.length > 0) {
                selectedPeriod = $tradingStatsStore.selectedPeriods[0];
            }
        } catch (err) {
            error = err.message;
        }
    }

    // Watch for account changes
    $: if ($accountStore.currentAccount?._id !== currentAccountId && !isPreview) {
        currentAccountId = $accountStore.currentAccount?._id;
        if (currentAccountId) {
            loadStats();
        }
    }

    function formatPercentage(value) {
        const sign = value > 0 ? '+' : '';
        return `${sign}${value.toFixed(2)}%`;
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
        if ($tradingStatsStore.selectedPeriods?.length > 0 && !selectedPeriod) {
            selectedPeriod = $tradingStatsStore.selectedPeriods[0];
        }
    }

    $: currentPeriodData = selectedPeriod && stats[selectedPeriod] 
        ? stats[selectedPeriod] 
        : { pnl: 0, trades: 0, balanceChange: 0 };
</script>

<div 
    class="h-full relative group"
    on:mouseenter={() => isHovering = true}
    on:mouseleave={() => isHovering = false}
>
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
                    {#each $tradingStatsStore.selectedPeriods as period}
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
    <div class="hidden md:grid grid-cols-5 gap-4">
        {#if selectedPeriod && stats[selectedPeriod]}
            {#each $tradingStatsStore.selectedPeriods as period}
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
                            <p class="text-lg {data.pnl >= 0 ? 'text-green-500' : 'text-red-500'}">
                                {formatCurrency(data.pnl)}
                            </p>
                            {#if data.balanceChange !== 0}
                                <p class="text-xl font-bold {data.balanceChange > 0 ? 'text-green-500' : 'text-red-500'}">
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
            {#each Array(5) as _, i}
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
    {#if isHovering}
        <button
            class="absolute -top-2 -right-2 p-2 rounded-lg bg-light-card dark:bg-dark-card border border-light-border dark:border-0 shadow-lg text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover"
            on:click={() => showConfig = true}
            transition:fade={{ duration: 100 }}
        >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
            </svg>
        </button>
    {/if}
</div>

<TradingStatsConfig bind:show={showConfig} />

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-0 rounded-lg shadow-lg;
    }

    /* Add smooth transitions */
    .card, button {
        transition: all 0.2s ease-in-out;
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
