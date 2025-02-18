<script>
    import { createEventDispatcher } from "svelte";
    import { theme } from "$lib/stores/themeStore";
    import DayTradesModal from "./DayTradesModal.svelte";
    import { accountStore } from "$lib/stores/accountStore";
    import { transactionStore } from "$lib/stores/transactionStore";
    import { browser } from '$app/environment';
    import { onMount } from 'svelte';
    import { api } from '$lib/utils/api';

    const dispatch = createEventDispatcher();

    export let trades = [];
    export let isPreview = false;
    
    let showDayTradesModal = false;
    let selectedDayTrades = [];
    let selectedDayTransactions = [];
    let selectedDate = "";
    let selectedDisplayDate = "";
    let selectedDayBalance = null;
    let currentIndex = 0; // ใช้เก็บตำแหน่งปัจจุบันของการแสดงผล

    // Add screen width tracking
    let screenWidth;
    let isMobile = false;

    let currentAccountId = null;

    if (browser) {
        // Initialize and update screen width
        const updateScreenWidth = () => {
            screenWidth = window.innerWidth;
            isMobile = screenWidth < 768; // md breakpoint is 768px
        };
        
        updateScreenWidth();
        window.addEventListener('resize', updateScreenWidth);
    }

    // สร้างฟังก์ชันสำหรับการนำเข้าข้อมูล
    function getDaysArray() {
        const today = new Date();
        const days = [];
        
        // Number of days based on screen size
        const numberOfDays = isMobile ? 4 : 7;
        
        for (let i = 0; i < numberOfDays; i++) {
            const date = new Date();
            // If mobile (4 days):
            //   index 0 = tomorrow
            //   index 1 = today
            //   index 2-3 = previous days
            // If desktop (7 days):
            //   index 0 = tomorrow
            //   index 1 = today
            //   index 2-6 = previous days
            const offset = i === 0 ? 1 : (i === 1 ? 0 : -(i-1));
            date.setDate(today.getDate() + offset + (currentIndex * (isMobile ? 4 : 7)));
            days.push(date);
        }
        
        return days;
    }

    $: days = getDaysArray();

    // Helper function to normalize date to noon
    function normalizeDate(date) {
        const d = new Date(date);
        d.setHours(12, 0, 0, 0);
        return d;
    }

    // Process trades data
    $: dailyTrades = trades.reduce((acc, trade) => {
        let tradeDate;
        if (trade.status === "CLOSED") {
            tradeDate = new Date(trade.exitDate);
        } else {
            tradeDate = new Date(trade.entryDate);
        }

        try {
            if (isNaN(tradeDate.getTime())) return acc;

            const dateKey = normalizeDate(tradeDate)
                .toISOString()
                .split("T")[0];
            if (!acc[dateKey]) {
                acc[dateKey] = {
                    trades: [],
                    pnl: 0,
                    symbols: new Set(),
                    wins: 0,
                    losses: 0,
                    openTrades: 0,
                    transactions: [],
                };
            }

            acc[dateKey].trades.push(trade);
            if (trade.status === "CLOSED") {
                acc[dateKey].pnl += trade.pnl || 0;
                if (trade.pnl > 0) acc[dateKey].wins++;
                else if (trade.pnl < 0) acc[dateKey].losses++;
            } else {
                acc[dateKey].openTrades++;
            }
        } catch (err) {
            console.error("Error processing trade date:", err);
        }
        return acc;
    }, {});

    function getDayStats(date) {
        try {
            const dateKey = normalizeDate(date).toISOString().split("T")[0];
            return dailyTrades[dateKey] || null;
        } catch (err) {
            console.error("Error getting day stats:", err);
            return null;
        }
    }

    function formatPnL(pnl) {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(pnl);
    }

    function getTextClass(stats) {
        if (!stats || (!stats.pnl && !stats.openTrades)) return "";

        const hasClosedTrades = stats.wins > 0 || stats.losses > 0;
        if (hasClosedTrades) {
            if ($theme === "dark") {
                return stats.pnl > 0 ? "text-green-300" : "text-red-300";
            }
            return stats.pnl > 0 ? "text-green-600" : "text-red-600";
        }

        if (stats.openTrades > 0) {
            return $theme === "dark" ? "text-yellow-300" : "text-yellow-600";
        }

        return "";
    }

    function handleDayClick(date, stats) {
        const formattedDate = date.toISOString().split("T")[0];
        const displayDate = date.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });

        selectedDate = formattedDate;
        selectedDisplayDate = displayDate;
        selectedDayTrades = stats?.trades || [];
        selectedDayTransactions = stats?.transactions || [];
        showDayTradesModal = true;
    }

    function isToday(date) {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    }

    function isFutureDate(date) {
        return date > new Date();
    }

    function getCardClass(stats, date) {
        if (isFutureDate(date))
            return "opacity-50";
        if (!stats || (!stats.pnl && !stats.openTrades))
            return "bg-light-card dark:bg-dark-card";

        const hasClosedTrades = stats.wins > 0 || stats.losses > 0;
        if (hasClosedTrades) {
            if (stats.pnl > 0) {
                return "bg-gradient-to-b from-green-100 to-green-200/80 dark:from-green-900/30 dark:to-green-900/40 border-green-300 dark:border-green-700";
            } else {
                return "bg-gradient-to-b from-red-100 to-red-200/80 dark:from-red-900/30 dark:to-red-900/40 border-red-300 dark:border-red-700";
            }
        }

        if (stats.openTrades > 0) {
            return "bg-gradient-to-b from-yellow-100 to-yellow-200/80 dark:from-yellow-900/30 dark:to-yellow-900/40 border-yellow-300 dark:border-yellow-700";
        }

        return "bg-light-card dark:bg-dark-card";
    }

    function navigateDays(direction) {
        currentIndex += direction;
    }

    // เพิ่มฟังก์ชันสำหรับโหลด trades
    async function loadTrades() {
        if (!$accountStore.currentAccount) return;
        
        try {
            trades = await api.getTrades($accountStore.currentAccount._id);
        } catch (err) {
            console.error('Error loading trades:', err);
        }
    }

    onMount(() => {
        if (isPreview) return;
        loadTrades();

        // Subscribe to trade and transaction updates
        const handleUpdate = async () => {
            console.log('ShortCalendar: Received update event');
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
</script>

<div class="card h-full flex flex-col">
    <div class="grid grid-cols-4 md:grid-cols-7 h-full">
        {#each days as date, index}
            {@const stats = getDayStats(date)}
            <div 
                class="relative border-r last:border-r-0 border-b border-light-border dark:border-0
                       transition-all duration-200 group cursor-pointer
                       hover:bg-light-hover/50 dark:hover:bg-dark-hover/50
                       {isToday(date) ? 'bg-theme-500/5 dark:bg-theme-400/5' : ''}
                       {getCardClass(stats, date)}"
                on:click={() => handleDayClick(date, stats)}
            >
                <div class="p-4 h-full flex flex-col">
                    <!-- Date Header -->
                    <div class="flex flex-col">
                        <div class="text-xs font-medium mb-1 text-light-text-muted dark:text-dark-text-muted">
                            {date.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div class="text-2xl font-bold mb-3 {isToday(date) ? 'text-theme-500 dark:text-theme-400' : 'text-light-text dark:text-dark-text'}">
                            {date.getDate()}
                        </div>
                    </div>
                    
                    <!-- Stats -->
                    {#if stats}
                        <div class="flex flex-col gap-2 mt-auto">
                            <!-- Trades Count -->
                            <div class="flex flex-col gap-1">
                                {#if stats.openTrades > 0}
                                    <div class="flex items-center gap-2">
                                        <div class="w-2 h-2 rounded-full bg-yellow-500"></div>
                                        <span class="text-sm text-yellow-600 dark:text-yellow-400">
                                            {stats.openTrades} Open
                                        </span>
                                    </div>
                                {/if}
                                {#if stats.wins > 0 || stats.losses > 0}
                                    <div class="flex items-center gap-2">
                                        <div class="flex gap-2">
                                            {#if stats.wins > 0}
                                                <div class="flex items-center gap-1">
                                                    <div class="w-2 h-2 rounded-full bg-green-500"></div>
                                                    <span class="text-sm text-green-600 dark:text-green-400">{stats.wins}W</span>
                                                </div>
                                            {/if}
                                            {#if stats.losses > 0}
                                                <div class="flex items-center gap-1">
                                                    <div class="w-2 h-2 rounded-full bg-red-500"></div>
                                                    <span class="text-sm text-red-600 dark:text-red-400">{stats.losses}L</span>
                                                </div>
                                            {/if}
                                        </div>
                                    </div>
                                {/if}
                            </div>

                            <!-- P&L -->
                            {#if stats.pnl !== 0}
                                <div class="flex items-center justify-between mt-2 pt-2 border-t border-light-border dark:border-0">
                                    <span class="text-xs text-light-text-muted dark:text-dark-text-muted">P&L</span>
                                    <span class="text-sm font-bold {getTextClass(stats)}">
                                        {formatPnL(stats.pnl)}
                                        {#if $dailyBalancesStore[date]?.startBalance && $dailyBalancesStore[date].startBalance !== 0}
                                            <span class="text-xs">
                                                ({((stats.pnl / Math.abs($dailyBalancesStore[date].startBalance)) * 100).toFixed(1)}%)
                                            </span>
                                        {/if}
                                    </span>
                                </div>
                            {/if}
                        </div>
                    {:else}
                        <div class="mt-auto text-xs text-light-text-muted dark:text-dark-text-muted text-center">
                            No trades
                        </div>
                    {/if}

                    <!-- Hover Indicator -->
                    <div class="absolute inset-x-0 bottom-0 h-1 bg-theme-500 transform scale-x-0 transition-transform group-hover:scale-x-100"></div>
                </div>
            </div>
        {/each}
    </div>
</div>

<DayTradesModal
    bind:show={showDayTradesModal}
    trades={selectedDayTrades}
    transactions={selectedDayTransactions}
    date={selectedDate}
    displayDate={selectedDisplayDate}
    accountId={$accountStore.currentAccount?._id}
    on:view
    on:edit
    on:delete
    on:deleteTransaction
    on:close={() => {
        showDayTradesModal = false;
        selectedDayTrades = [];
        selectedDayTransactions = [];
        selectedDate = "";
        selectedDisplayDate = "";
    }}
/>

<style>
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-0 rounded-lg shadow-lg overflow-hidden;
    }

    /* Make cards more compact on mobile */
    @media (max-width: 767px) {
        .card {
            @apply text-sm;
        }
        
        /* Adjust padding for mobile */
        :global(.card .p-4) {
            @apply p-2;
        }

        /* Make date numbers smaller on mobile */
        :global(.text-2xl) {
            @apply text-lg;
        }
    }

    /* Desktop styles */
    @media (min-width: 768px) {
        :global(.card .p-4) {
            @apply p-3;
        }
    }

    /* Hover effect */
    .group:hover .group-hover\:scale-x-100 {
        transform: scaleX(1);
    }
</style>