<script>
    import { createEventDispatcher, onMount } from "svelte";
    import { theme } from "$lib/stores/themeStore";
    import { accountStore } from "$lib/stores/accountStore";
    import { transactionStore } from "$lib/stores/transactionStore";
    import DayTradesModal from "./DayTradesModal.svelte";
    import Select from "../common/Select.svelte";
    import DatePicker from '../common/DatePicker.svelte';
    import { api } from '$lib/utils/api';

    const dispatch = createEventDispatcher();

    export let trades = [];
    export let isPreview = false;
    let showDayTradesModal = false;
    let selectedDayTrades = [];
    let selectedDayTransactions = [];
    let selectedDate = "";
    let selectedDisplayDate = "";
    let dayTradesLoading = false;
    let showMonthYearPicker = false;
    let showDatePicker = false;
    let currentAccountId = null;
    let dailyTrades = {};
    let dailyBalances = {};
    let selectedDayBalance = null;

    async function loadData() {
        if (isPreview) return;
        
        try {
            dayTradesLoading = true;
            await transactionStore.fetchTransactions($accountStore.currentAccount._id);
            trades = await api.getTrades($accountStore.currentAccount._id);
            
            // Force recalculation of reactive statements
            trades = [...trades];
            
        } catch (err) {
            console.error('Error loading data:', err);
        } finally {
            dayTradesLoading = false;
        }
    }

    onMount(async () => {
        await loadData();
    });

    $: {
        if ($accountStore.currentAccount?._id) {
            loadData();
        }
    }

    // Watch for account changes
    $: if ($accountStore.currentAccount?._id !== currentAccountId && !isPreview) {
        currentAccountId = $accountStore.currentAccount?._id;
        if (currentAccountId) {
            selectedMonth = new Date().getMonth();
            selectedYear = new Date().getFullYear();
        }
    }

    const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 6 }, (_, i) => currentYear - 5 + i);

    let selectedMonth = new Date().getMonth();
    let selectedYear = new Date().getFullYear();

    // Helper function to normalize date to noon
    function normalizeDate(date) {
        const d = new Date(date);
        d.setHours(12, 0, 0, 0);
        return d;
    }

    let calendarDays = [];
    let statsPerDay = {};

    // Combine all calculations into one reactive block
    $: {
        // สร้าง object ใหม่
        const newDailyTrades = {};
        
        // Process trades first
        trades.forEach(trade => {
            let tradeDate;
            if (trade.status === "CLOSED") {
                tradeDate = new Date(trade.exitDate);
            } else {
                tradeDate = new Date(trade.entryDate);
            }

            try {
                if (isNaN(tradeDate.getTime())) return;

                const dateKey = normalizeDate(tradeDate).toISOString().split("T")[0];
                if (!newDailyTrades[dateKey]) {
                    newDailyTrades[dateKey] = {
                        trades: [],
                        pnl: 0,
                        symbols: new Set(),
                        wins: 0,
                        losses: 0,
                        openTrades: 0,
                        transactions: [],
                        totalInvested: 0,
                    };
                }

                newDailyTrades[dateKey].trades.push(trade);
                if (trade.status === "CLOSED") {
                    newDailyTrades[dateKey].pnl += trade.pnl || 0;
                    if (trade.pnl > 0) newDailyTrades[dateKey].wins++;
                    else if (trade.pnl < 0) newDailyTrades[dateKey].losses++;
                    const investedAmount = (trade.entryPrice * trade.quantity) || 0;
                    newDailyTrades[dateKey].totalInvested += investedAmount;
                } else {
                    newDailyTrades[dateKey].openTrades++;
                }
            } catch (err) {
                console.error("Error processing trade date:", err);
            }
        });

        // Then process transactions
        if (Array.isArray($transactionStore.transactions)) {
            $transactionStore.transactions.forEach((transaction) => {
                const transDate = normalizeDate(transaction.date);
                const dateKey = transDate.toISOString().split("T")[0];

                if (!newDailyTrades[dateKey]) {
                    newDailyTrades[dateKey] = {
                        trades: [],
                        pnl: 0,
                        symbols: new Set(),
                        wins: 0,
                        losses: 0,
                        openTrades: 0,
                        transactions: [],
                        totalInvested: 0,
                    };
                }

                newDailyTrades[dateKey].transactions.push({
                    ...transaction,
                    date: transDate.toISOString(),
                });
            });
        }

        // Update dailyTrades with new object
        dailyTrades = newDailyTrades;

        // 2. Then calculate calendar days
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

        // 3. Finally calculate statsPerDay
        statsPerDay = {};
        calendarDays.forEach(day => {
            if (day !== null) {
                statsPerDay[day] = getDayStats(day);
            }
        });
    }

    // Calculate pnlPercentage for each day's stats
    $: {
        for (const dateKey in dailyTrades) {
            const stats = dailyTrades[dateKey];
            const balance = dailyBalances[dateKey];
            if (balance && balance !== 0) {
                // ปรับการคำนวณ percentage
                const pnlValue = stats.pnl || 0;
                const percentage = (pnlValue / Math.abs(balance)) * 100;
                stats.pnlPercentage = percentage;
            } else {
                stats.pnlPercentage = null;
            }
        }
    }

    // Compute daily balances based on transactions and trades
    $: {
        dailyBalances = {};
        let cumulativeBalance = $accountStore.currentAccount?.initialBalance || 0;

        // Sort all dates chronologically
        const allDates = [...new Set([
            ...trades.map(t => normalizeDate(t.status === "CLOSED" ? t.exitDate : t.entryDate).toISOString().split('T')[0]),
            ...$transactionStore.transactions.map(t => normalizeDate(t.date).toISOString().split('T')[0])
        ])].sort();

        // Calculate running balance for each date
        allDates.forEach(dateKey => {
            const dayTransactions = $transactionStore.transactions.filter(t => 
                normalizeDate(t.date).toISOString().split('T')[0] === dateKey
            );

            const dayTrades = trades.filter(t => 
                t.status === "CLOSED" && 
                normalizeDate(t.exitDate).toISOString().split('T')[0] === dateKey
            );

            const transactionChange = dayTransactions.reduce((sum, t) => 
                sum + (t.type === "deposit" ? t.amount : -t.amount), 0
            );
            
            const tradeChange = dayTrades.reduce((sum, t) => {
                const pnl = Number(t.pnl) || 0;
                return sum + pnl;
            }, 0);

            // Store the balance for this date
            dailyBalances[dateKey] = {
                startBalance: cumulativeBalance,
                endBalance: cumulativeBalance + transactionChange + tradeChange,
                transactions: dayTransactions,
                trades: dayTrades
            };

            // Update cumulative balance after storing
            cumulativeBalance += transactionChange + tradeChange;
        });

        // Fill in any missing dates in the current month
        const currentMonthStart = new Date(selectedYear, selectedMonth, 1);
        const currentMonthEnd = new Date(selectedYear, selectedMonth + 1, 0);

        let currentDate = new Date(currentMonthStart);
        while (currentDate <= currentMonthEnd) {
            const dateKey = currentDate.toISOString().split('T')[0];
            if (!dailyBalances[dateKey]) {
                dailyBalances[dateKey] = {
                    startBalance: cumulativeBalance,
                    endBalance: cumulativeBalance,
                    transactions: [],
                    trades: []
                };
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    function getDayStats(day) {
        if (!day) return null;
        try {
            const date = normalizeDate(
                new Date(selectedYear, selectedMonth, day)
            );
            if (isNaN(date.getTime())) return null;

            const dateKey = date.toISOString().split("T")[0];
            return dailyTrades[dateKey] || {
                trades: [],
                pnl: 0,
                symbols: new Set(),
                wins: 0,
                losses: 0,
                openTrades: 0,
                transactions: [],
                totalInvested: 0,
            };
        } catch (err) {
            console.error("Error getting day stats:", err);
            return null;
        }
    }

    function isFutureDate(day) {
        const date = normalizeDate(new Date(selectedYear, selectedMonth, day));
        const today = normalizeDate(new Date());
        return date > today;
    }

    function formatDateForInput(date) {
        const d = normalizeDate(date);
        return d.toISOString().slice(0, 10);
    }

    function getCardClass(stats, day) {
        if (isFutureDate(day))
            return "opacity-50 bg-light-hover/20 dark:bg-dark-hover/20";
        
        // ถ้าไม่มีข้อมูลใดๆ ไม่ต้องแสดง border
        if (
            !stats ||
            (!stats.pnl && !stats.openTrades && !stats.transactions?.length)
        )
            return "cursor-pointer rounded-md bg-light-hover/10 dark:bg-dark-hover/10";

        // Check for closed trades first
        const hasClosedTrades = stats.wins > 0 || stats.losses > 0;
        if (hasClosedTrades) {
            return `cursor-pointer rounded-md ${
                stats.pnl > 0 
                    ? "bg-green-100 border border-green-300/30 dark:border-0 dark:bg-green-900/20" 
                    : "bg-red-100 border border-red-300/30 dark:border-0 dark:bg-red-900/20"
            }`;
        }

        // If no closed trades but has open trades or transactions
        if (stats.openTrades > 0 || stats.transactions?.length > 0) {
            return `cursor-pointer rounded-md bg-yellow-50 border border-yellow-300/30 dark:border-0 dark:bg-yellow-900/10`;
        }

        return "cursor-pointer rounded-md";
    }

    function getTextClass(stats) {
        if (
            !stats ||
            (!stats.pnl && !stats.openTrades && !stats.transactions?.length)
        )
            return "";

        // Check for closed trades first
        const hasClosedTrades = stats.wins > 0 || stats.losses > 0;
        if (hasClosedTrades) {
            if ($theme === "dark") {
                return stats.pnl > 0 ? "text-green-300" : "text-red-300";
            }
            return stats.pnl > 0 ? "text-green-600" : "text-red-600";
        }

        // If no closed trades but has open trades or transactions
        if (stats.openTrades > 0 || stats.transactions?.length > 0) {
            return $theme === "dark" ? "text-yellow-300" : "text-yellow-600";
        }

        return "";
    }

    function formatPnL(pnl) {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(pnl);
    }

    function handleDayClick(day, stats) {
        if (isFutureDate(day)) return;

        const date = normalizeDate(new Date(selectedYear, selectedMonth, day));
        const formattedDate = formatDateForInput(date);
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
        selectedDayBalance = dailyBalances[formattedDate];
        
        console.log('TradeCalendar: Opening day modal with date:', formattedDate);
        showDayTradesModal = true;
    }

    function handleView(event) {
        dispatch('view', event.detail);
    }

    function handleEdit(event) {
        console.log('TradeCalendar: Handling edit event');
        dispatch('edit', event.detail);
        loadData();
    }

    function handleDelete(event) {
        console.log('TradeCalendar: Handling delete event');
        dispatch('delete', event.detail);
        loadData();
    }

    function handleDeleteTransaction(event) {
        console.log('TradeCalendar: Handling delete transaction event');
        dispatch('deleteTransaction', event.detail);
        loadData();
    }

    function handleNewTrade(event) {
        console.log('TradeCalendar: Handling new trade event');
        dispatch('newTrade');
        loadData();
    }

    function previousMonth() {
        if (selectedMonth === 0) {
            selectedMonth = 11;
            selectedYear--;
        } else {
            selectedMonth--;
        }
    }

    function nextMonth() {
        if (selectedMonth === 11) {
            selectedMonth = 0;
            selectedYear++;
        } else {
            selectedMonth++;
        }
    }

    function isToday(day) {
        const today = new Date();
        const date = new Date(selectedYear, selectedMonth, day);
        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        );
    }

</script>

<div class="card h-full flex flex-col">
    <div class="p-4 border-b border-light-border dark:border-0">
        <div class="flex justify-between items-center relative">
            <div class="flex items-center justify-between w-full gap-2">
                <span
                    class="text-xl font-semibold cursor-pointer text-light-text-muted dark:text-dark-text"
                    on:click={() => showDatePicker = !showDatePicker}
                >
                    {months[selectedMonth]} {selectedYear}
                    <svg class="w-5 h-5 inline ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </span>
                <div class="flex items-center">
                    <button
                        class="p-1"
                        on:click={previousMonth}
                        aria-label="Previous month"
                    >
                    <svg class="h-6 w-6 text-white bg-purple-500 hover:bg-purple-700  rounded-md"  width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">  <path stroke="none" d="M0 0h24v24H0z"/>  <polyline points="11 7 6 12 11 17" />  <polyline points="17 7 12 12 17 17" /></svg>
                    </button>
                    <button
                        class="p-1"
                        on:click={nextMonth}
                        aria-label="Next month"
                    >
                    <svg class="h-6 w-6 text-white bg-purple-500 hover:bg-purple-700 rounded-md"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round">  <polyline points="13 17 18 12 13 7" />  <polyline points="6 17 11 12 6 7" /></svg>
                    </button>
                </div>
            </div>
            {#if showDatePicker}
                <DatePicker
                    bind:selectedMonth
                    bind:selectedYear
                    bind:showDatePicker
                    months={months}
                    years={years}
                />
            {/if}
        </div>
    </div>

    <div class="flex-1 p-4 flex flex-col">
        <div class="grid grid-cols-7 gap-1">
            {#each ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as day}
                <div
                    class="text-center py-1 text-sm font-medium text-light-text-muted dark:text-dark-text-muted"
                >
                    {day}
                </div>
            {/each}
        </div>

        <div class="grid grid-cols-7 gap-1 lg:gap-1.5 flex-1 {$theme === 'dark' ? 'dark-calendar' : ''}">
            {#each calendarDays as day, index (day !== null ? day : 'empty-' + index)}
                {#if day !== null}
                    <div class="relative calendar-day-cell">
                        <div
                            class="absolute inset-0 {getCardClass(statsPerDay[day], day)} 
                                   hover:shadow 
                                   {!isFutureDate(day) && 'transform hover:scale-[1.04] transition-transform duration-300 ease-in-out'} 
                                   {isToday(day) ? 'today-card' : ''}"
                            on:click={() => handleDayClick(day, statsPerDay[day])}
                        >
                            <!-- วันที่ว่างเท่านั้นที่จะมี hover effect -->
                            {#if !statsPerDay[day]?.pnl && !statsPerDay[day]?.openTrades && !statsPerDay[day]?.transactions?.length && !isFutureDate(day)}
                                <div class="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300 z-30">
                                    <svg
                                        class="w-8 h-8 text-gray-400/50 dark:text-gray-500/50"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M12 4v16m8-8H4"
                                        />
                                    </svg>
                                </div>
                            {/if}

                            <!-- เนื้อหาปกติ -->
                            <div class="relative h-full flex flex-col z-20">
                                <div class="pt-0.5 px-1 pb-0 text-sm font-medium text-light-text-muted dark:text-dark-text-muted">
                                    <div class="flex w-full justify-end">
                                        {#if isToday(day)}
                                            <span class="mr-auto hidden md:block">to day!</span>
                                        {/if}
                                        <span>{day}</span>
                                    </div>
                                </div>

                                {#if statsPerDay[day]}
                                    <div
                                        class="absolute top-0 md:-top-2 inset-0 p-1.5 pt-5 flex flex-col"
                                    >
                                    <div class={`border-s border-s-[2.25px] border-transparent ${statsPerDay[day].pnl === 0 ? '' : statsPerDay[day].pnl < 0 ? 'dark:border-red-600 ps-1' : 'dark:border-green-600 ps-1'}`}>
                                        {#if statsPerDay[day].trades.length > 0}
                                        {@const isShowAllState = !(statsPerDay[day].openTrades > 0 && statsPerDay[day].wins > 0 && statsPerDay[day].losses > 0)}
                                            <div class="trade-stats space-y-0.5 overflow-y-auto">
                                                <div class=" hidden md:flex items-center gap-1 flex-wrap">
                                                    
                                                    {#if statsPerDay[day].openTrades > 0}
                                                        <span class="text-xs whitespace-nowrap bg-yellow-500/10 dark:bg-yellow-400/10 px-1 rounded text-yellow-600 dark:text-yellow-400">
                                                            {statsPerDay[day].openTrades}
                                                            {#if isShowAllState}
                                                                open
                                                            {:else}
                                                                <span class="text-xxs">open</span>
                                                            {/if}

                                                        </span>
                                                    {/if}
                                                    <div class="trade-results gap-1 text-xs">
                                                        {#if statsPerDay[day].wins > 0}
                                                            <span class="whitespace-nowrap bg-green-500/10 dark:bg-green-400/10 px-1 rounded text-green-600 dark:text-green-400">
                                                                {statsPerDay[day].wins}
                                                                {#if isShowAllState}
                                                                win
                                                                {:else}
                                                                <span class="text-xxs">win</span>
                                                                {/if}
                                                            </span>
                                                        {/if}
                                                        {#if statsPerDay[day].losses > 0}
                                                            <span class="whitespace-nowrap bg-red-500/10 dark:bg-red-400/10 px-1 rounded text-red-600 dark:text-red-400">
                                                                {statsPerDay[day].losses}
                                                                {#if isShowAllState}
                                                                    loss
                                                                {:else}
                                                                <span class="text-xxs">loss</span>
                                                                {/if}
                                                            </span>
                                                        {/if}
                                                    </div>
                                                </div>
                                            </div>
                                        {/if}
                                        {#if statsPerDay[day].pnl !== 0}
                                            {@const dateKey = formatDateForInput(new Date(selectedYear, selectedMonth, day))}
                                            {@const balance = dailyBalances[dateKey]?.endBalance}
                                            {@const pnl = statsPerDay[day].pnl}
                                            <div class="pnl-stats mt-auto flex-wrap flex flex-col md:flex-row justify-between items-start md:items-center">
                                                <span class="text-sm font-bold whitespace-nowrap  {pnl >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}">
                                                    {formatPnL(statsPerDay[day].pnl)}
                                                </span>
                                                {#if pnl !== 0 && balance > 0}
                                                    <span class="pnl-percentage whitespace-nowrap text-xs {pnl >= 0 ? 'text-green-500' : 'text-red-500'}">
                                                        {((pnl / balance) * 100).toFixed(1)}%
                                                    </span>
                                                {/if}
                                            </div>
                                        {/if}

                                        {#if statsPerDay[day].transactions.length > 0}
                                            <div
                                                class="absolute  bottom-1 right-1 flex gap-0.5 items-center opacity-60 dark:opacity-80"
                                            >
                                                {#if statsPerDay[day].transactions.some((t) => t.type === "deposit")}
                                                    <div class="flex items-center">
                                                        <svg
                                                            class="w-[17px] h-[17px] text-green-600 dark:text-green-400"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                stroke-linecap="round"
                                                                stroke-linejoin="round"
                                                                stroke-width="2"
                                                                d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                                                            />
                                                        </svg>
                                                    </div>
                                                {/if}
                                                {#if statsPerDay[day].transactions.some((t) => t.type === "withdrawal")}
                                                    <div class="flex items-center">
                                                        <svg
                                                            class="w-[17px] h-[17px] text-red-600 dark:text-red-400"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                stroke-linecap="round"
                                                                stroke-linejoin="round"
                                                                stroke-width="2"
                                                                d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                                                            />
                                                        </svg>
                                                    </div>
                                                {/if}
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                                {/if}
                            </div>
                        </div>
                    </div>
                {:else}
                    <div class="relative calendar-day-cell">
                    </div>
                {/if}
            {/each}
        </div>
    </div>
</div>

<DayTradesModal
    bind:show={showDayTradesModal}
    trades={selectedDayTrades}
    transactions={selectedDayTransactions}
    date={selectedDate}
    displayDate={selectedDisplayDate}
    accountId={$accountStore.currentAccount?._id}
    loading={dayTradesLoading}
    dailyBalance={selectedDayBalance}
    on:view={handleView}
    on:edit={handleEdit}
    on:delete={handleDelete}
    on:deleteTransaction={handleDeleteTransaction}
    on:newTrade={handleNewTrade}
    on:refresh={() => {
        console.log('TradeCalendar: Received refresh event from modal');
        loadData();
    }}
    on:close={() => {
        console.log('TradeCalendar: Modal closed');
        showDayTradesModal = false;
        selectedDayTrades = [];
        selectedDayTransactions = [];
        selectedDate = "";
        selectedDisplayDate = "";
        selectedDayBalance = null;
    }}
/>

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card 
               border border-light-border dark:border-0
               rounded-lg shadow-lg;
    }

    /* Default styles สำหรับ mobile */
    .calendar-day-cell {
        position: relative;
        min-height: 80px;
    }

    /* Desktop styles (md ขึ้นไป) */
    @media (min-width: 768px) {
        .calendar-day-cell {
            min-height: initial; /* ยกเลิก min-height */
        }
    }

    /* Mobile styles */
    @media (max-width: 767px) {
        .trade-stats {
            display: flex;
            flex-direction: column;
        }

        .pnl-stats {
            gap: 0.25rem;
        }

        .pnl-percentage {
            margin-left: 0;
        }
    }

    /* Desktop styles */
    @media (min-width: 768px) {
        .trade-stats {
            display: flex;
            flex-direction: row;
        }

        .pnl-stats {
            gap: 0.5rem;
        }
    }

    /* Dark mode styles */
    :global(.dark) .dark-calendar {
        @apply gap-2; /* เพิ่ม gap ระหว่าง cell ใน dark mode */
    }

    /* เพิ่ม styles สำหรับ today card animation */
    @keyframes border-dance {
        0% {
            background-position: 0% 50%;
        }
        50% {
            background-position: 100% 50%;
        }
        100% {
            background-position: 0% 50%;
        }
    }

    :global(.today-card) {
        position: relative;
        height: 100%;
        width: 100%;
        display: flex;
        flex-direction: column;
        background-color: theme(colors.indigo.50/0.1);
    }

    :global(.today-card)::before {
        content: '';
        position: absolute;
        inset: -2px;
        z-index: 1;
        border-radius: 0.5rem;
        padding: 2px;
        pointer-events: none;
        background: linear-gradient(
            45deg,
            theme(colors.purple.400),
            theme(colors.blue.400),
            theme(colors.indigo.400),
            theme(colors.purple.400)
        );
        background-size: 300% 300%;
        animation: border-dance 4s ease infinite;
        -webkit-mask: 
            linear-gradient(#fff 0 0) content-box, 
            linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
    }

    :global(.today-card > *) {
        position: relative;
        z-index: 2;
    }

    :global(.dark .today-card) {
        background-color: theme(colors.indigo.900/0.1);
    }

    :global(.today-card:hover)::before {
        animation: border-dance 2s ease infinite;
    }
</style>
