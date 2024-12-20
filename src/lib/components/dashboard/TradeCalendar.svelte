<script>
    import { createEventDispatcher, onMount } from "svelte";
    import { theme } from "$lib/stores/themeStore";
    import { accountStore } from "$lib/stores/accountStore";
    import { transactionStore } from "$lib/stores/transactionStore";
    import Select from "../common/Select.svelte";
    import EmptyDayModal from "./EmptyDayModal.svelte";
    import { api } from '$lib/utils/api';
    import DatePicker from '../common/DatePicker.svelte';

    const dispatch = createEventDispatcher();

    export let trades = [];
    let showEmptyDayModal = false;
    let selectedDate = "";
    let showMonthYearPicker = false;
    let showDatePicker = false;
    let currentAccountId = null;
    let dailyTrades = {};
    let dailyBalances = {}; // Add this line to store balances per day

    onMount(async () => {
        try {
            await transactionStore.fetchTransactions($accountStore.currentAccount._id);
            trades = await api.getTrades($accountStore.currentAccount._id);
        } catch (err) {
            console.error('Error initializing page:', err);
        }
    });

    // Watch for account changes
    $: if ($accountStore.currentAccount?._id !== currentAccountId) {
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

    $: daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    $: firstDayOfWeek = (new Date(selectedYear, selectedMonth, 1).getDay() + 6) % 7;
    $: lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0).getDay();

    let calendarDays = [];
    let statsPerDay = {};
    $: calendarDays = Array.from(
        { length: 42 }, // 7 days * 6 weeks
        (_, i) => {
            const dayNumber = i - firstDayOfWeek + 1;
            if (dayNumber < 1 || dayNumber > daysInMonth) return null;
            return dayNumber;
        },
    );

    $: if (Array.isArray(calendarDays) && dailyTrades) {
        statsPerDay = {};
        calendarDays.forEach(day => {
            if (day !== null) {
                statsPerDay[day] = getDayStats(day);
            }
        });
    }

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
                    totalInvested: 0, // Ensure totalInvested is initialized
                };
            }

            acc[dateKey].trades.push(trade);
            if (trade.status === "CLOSED") {
                acc[dateKey].pnl += trade.pnl || 0;
                if (trade.pnl > 0) acc[dateKey].wins++;
                else if (trade.pnl < 0) acc[dateKey].losses++;

                // Calculate and accumulate invested amount per closed trade
                const investedAmount = (trade.entryPrice * trade.quantity) || 0;
                acc[dateKey].totalInvested += investedAmount;
            } else {
                acc[dateKey].openTrades++;
            }
        } catch (err) {
            console.error("Error processing trade date:", err);
        }
        return acc;
    }, {});

    // Calculate pnlPercentage for each day's stats
    $: {
        for (const dateKey in dailyTrades) {
            const stats = dailyTrades[dateKey];
            if (stats.totalInvested !== 0) {
                stats.pnlPercentage = (stats.pnl / stats.totalInvested) * 100;
            } else {
                stats.pnlPercentage = null;
            }
        }
    }

    // Process transactions into dailyTrades
    $: {
        const transactions = $transactionStore.transactions;
        if (Array.isArray(transactions)) {
            transactions.forEach((transaction) => {
                const transDate = normalizeDate(transaction.date);
                const dateKey = transDate.toISOString().split("T")[0];

                if (!dailyTrades[dateKey]) {
                    dailyTrades[dateKey] = {
                        trades: [],
                        pnl: 0,
                        symbols: new Set(),
                        wins: 0,
                        losses: 0,
                        openTrades: 0,
                        transactions: [],
                    };
                }

                dailyTrades[dateKey].transactions.push({
                    ...transaction,
                    date: transDate.toISOString(), // Store normalized date
                });
            });
        }
    }

    // Compute daily balances based on transactions and trades
    $: {
        dailyBalances = {};
        let cumulativeBalance = $accountStore.currentAccount.initialBalance || 0;

        // Collect all relevant dates
        let allDatesSet = new Set();

        trades.forEach(trade => {
            let date = trade.status === "CLOSED" ? trade.exitDate : trade.entryDate;
            date = normalizeDate(date).toISOString().split("T")[0];
            allDatesSet.add(date);
        });

        $transactionStore.transactions.forEach(transaction => {
            let date = normalizeDate(transaction.date).toISOString().split("T")[0];
            allDatesSet.add(date);
        });

        // Sort the dates in chronological order
        let allDates = Array.from(allDatesSet).sort();

        // Calculate cumulative balance for each date
        allDates.forEach(dateKey => {
            // Apply transactions on that date
            const transactions = $transactionStore.transactions.filter(t => {
                return normalizeDate(t.date).toISOString().split("T")[0] === dateKey;
            });

            transactions.forEach(transaction => {
                if (transaction.type === "deposit") {
                    cumulativeBalance += transaction.amount;
                } else if (transaction.type === "withdrawal") {
                    cumulativeBalance -= transaction.amount;
                }
            });

            // Apply P&L from closed trades on that date
            const dayTrades = trades.filter(trade => {
                const tradeDate = normalizeDate(trade.exitDate).toISOString().split("T")[0];
                return tradeDate === dateKey && trade.status === "CLOSED";
            });

            dayTrades.forEach(trade => {
                cumulativeBalance += trade.pnl || 0;
            });

            dailyBalances[dateKey] = cumulativeBalance;
        });
    }

    // Adjust pnlPercentage calculation to use daily balance
    $: {
        for (const dateKey in dailyTrades) {
            const stats = dailyTrades[dateKey];
            const balance = dailyBalances[dateKey];
            if (balance && balance !== 0) {
                stats.pnlPercentage = (stats.pnl / balance) * 100;
            } else {
                stats.pnlPercentage = null;
            }
        }
    }

    function getDayStats(day) {
        if (!day) return null;
        try {
            const date = normalizeDate(
                new Date(selectedYear, selectedMonth, day),
            );
            if (isNaN(date.getTime())) return null;

            const dateKey = date.toISOString().split("T")[0];
            return dailyTrades[dateKey] || null;
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
            return "opacity-50 bg-light-hover/10 dark:bg-dark-hover/10";
        if (
            !stats ||
            (!stats.pnl && !stats.openTrades && !stats.transactions?.length)
        )
            return "cursor-pointer";

        // Check for closed trades first
        const hasClosedTrades = stats.wins > 0 || stats.losses > 0;
        if (hasClosedTrades) {
            return `cursor-pointer ${stats.pnl > 0 ? "bg-green-100 dark:bg-green-900/20" : "bg-red-100 dark:bg-red-900/20"}`;
        }

        // If no closed trades but has open trades or transactions
        if (stats.openTrades > 0 || stats.transactions?.length > 0) {
            return `cursor-pointer bg-yellow-50 dark:bg-yellow-900/10`;
        }

        return "cursor-pointer";
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

        if (!stats?.trades.length && !stats?.transactions?.length) {
            selectedDate = formattedDate;
            showEmptyDayModal = true;
            return;
        }

        dispatch("dayClick", {
            date: formattedDate,
            displayDate,
            trades: [...(stats.trades || [])].sort((a, b) => {
                if (a.status !== b.status) {
                    return a.status === "OPEN" ? -1 : 1;
                }
                return (b.pnl || 0) - (a.pnl || 0);
            }),
            transactions: stats.transactions || [],
        });
    }

    function handleNewTrade() {
        dispatch("newTrade", selectedDate);
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

</script>

<!-- Rest of the template remains the same as in the previous version -->
<div class="card h-full flex flex-col">
    <div class="p-4 border-b border-light-border dark:border-dark-border">
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
                        class="p-1 hover:bg-light-hover/10 dark:hover:bg-dark-hover/10 rounded-full transition-colors"
                        on:click={previousMonth}
                        aria-label="Previous month"
                    >
                    <svg class="h-6 w-6 text-purple-500"  width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">  <path stroke="none" d="M0 0h24v24H0z"/>  <polyline points="11 7 6 12 11 17" />  <polyline points="17 7 12 12 17 17" /></svg>
                    </button>
                    <button
                        class="p-1 hover:bg-light-hover/10 dark:hover:bg-dark-hover/10 rounded-full transition-colors"
                        on:click={nextMonth}
                        aria-label="Next month"
                    >
                    <svg class="h-6 w-6 text-purple-500"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round">  <polyline points="13 17 18 12 13 7" />  <polyline points="6 17 11 12 6 7" /></svg>
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

    <!-- Calendar Grid -->
    <div class="flex-1 p-4 flex flex-col">
        <!-- Day headers -->
        <div class="grid grid-cols-7 gap-1">
            {#each ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as day}
                <div
                    class="text-center py-1 text-xs font-medium text-light-text-muted dark:text-dark-text-muted"
                >
                    {day}
                </div>
            {/each}
        </div>

        <!-- Calendar days -->
        <div class="grid grid-cols-7 gap-1 flex-1">
            {#each calendarDays as day, index (day !== null ? day : 'empty-' + index)}
                {#if day !== null}
                    <div class="relative flex-1">
                        <div
                            class="absolute inset-0 border border-light-border dark:border-dark-border rounded-md
                                   {getCardClass(
                                statsPerDay[day],
                                day,
                            )} hover:shadow {!isFutureDate(
                                day,
                            ) && 'hover:scale-[1.02]'}"
                            on:click={() => handleDayClick(day, statsPerDay[day])}
                        >
                            <!-- Date in top right -->
                            <div
                                class="absolute top-1 right-1.5 text-xs font-medium text-light-text-muted dark:text-dark-text-muted"
                            >
                                {day}
                            </div>

                            {#if statsPerDay[day]}
                                <div
                                    class="absolute inset-0 p-1.5 pt-5 flex flex-col"
                                >
                                <div class={`border-s border-s-2 border-transparent ${statsPerDay[day].pnl === 0 ? '' : statsPerDay[day].pnl < 0 ? 'dark:border-red-600 ps-1' : 'dark:border-green-600 ps-1'}`}>
                                    <!-- Trade count & Win/Loss -->
                                    {#if statsPerDay[day].trades.length > 0}
                                        <div class="space-y-0.5">
                                            <div
                                                class="flex items-center gap-1"
                                            >
                                                
                                                    {#if statsPerDay[day].openTrades > 0}
                                                        <span class="text-[10px] text-yellow-600 dark:text-yellow-400">
                                                            {statsPerDay[day].openTrades} open{statsPerDay[day].openTrades !== 1 ? "s" : ""}
                                                        </span>
                                                    {/if}
                                                    <div class="flex gap-1 text-[10px]">
                                                        {#if statsPerDay[day].wins > 0}
                                                            <span class="text-green-600 dark:text-green-400">
                                                                {statsPerDay[day].wins} win{statsPerDay[day].wins !== 1 ? "s" : ""}
                                                            </span>
                                                        {/if}
                                                        {#if statsPerDay[day].losses > 0}
                                                            <span class="text-red-600 dark:text-red-400">
                                                                {statsPerDay[day].losses} loss{statsPerDay[day].losses !== 1 ? "es" : ""}
                                                            </span>
                                                        {/if}
                                                    </div>
                                            </div>
                                        </div>
                                    {/if}

                                    <!-- P&L -->
                                    {#if statsPerDay[day].pnl !== 0}
                                        <div class="mt-auto flex justify-between items-center">
                                            <span
                                                class="text-xs font-bold {getTextClass(
                                                    statsPerDay[day],
                                                )}"
                                            >
                                                {formatPnL(statsPerDay[day].pnl)}
                                            </span>
                                            <span
                                                class=" text-[10px] {statsPerDay[day].pnl > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}"
                                                >
                                                {#if statsPerDay[day].pnlPercentage !== null}
                                                    {statsPerDay[day].pnlPercentage >= 0 ? '+' : ''}{statsPerDay[day].pnlPercentage.toFixed(2)}%
                                                {/if}
                                            </span>
                                        </div>
                                    {/if}

                                    <!-- Transaction Icons -->
                                    {#if statsPerDay[day].transactions?.length > 0}
                                        <div
                                            class="absolute bottom-1 right-1 flex gap-0.5 items-center opacity-60 dark:opacity-80"
                                        >
                                            {#if statsPerDay[day].transactions.some((t) => t.type === "deposit")}
                                                <div class="flex items-center">
                                                    <svg
                                                        class="w-[14px] h-[14px] text-green-600 dark:text-green-400"
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
                                                        class="w-[14px] h-[14px] text-red-600 dark:text-red-400"
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
                {:else}
                    <!-- Empty day placeholder -->
                    <div class="relative aspect-square">
                        <!-- ...existing code (if any) ... -->
                    </div>
                {/if}
            {/each}
        </div>
    </div>
</div>

<EmptyDayModal
    bind:show={showEmptyDayModal}
    date={selectedDate}
    accountId={$accountStore.currentAccount._id}
    on:newTrade={handleNewTrade}
    key="empty-day-modal"
/>

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-lg ;
    }
</style>
