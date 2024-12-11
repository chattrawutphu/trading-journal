<script>
    import { onMount } from "svelte";
    import { accountStore } from "$lib/stores/accountStore";
    import { transactionStore } from "$lib/stores/transactionStore";
    import TradingStats from "$lib/components/dashboard/TradingStats.svelte";
    import TradeChart from "$lib/components/dashboard/TradeChart.svelte";
    import TradeCalendar from "$lib/components/dashboard/TradeCalendar.svelte";
    import TradeModal from "$lib/components/trades/TradeModal.svelte";
    import TradeViewModal from "$lib/components/trades/TradeViewModal.svelte";
    import DayTradesModal from "$lib/components/dashboard/DayTradesModal.svelte";
    import EmptyDayModal from "$lib/components/dashboard/EmptyDayModal.svelte";
    import NewAccountModal from "$lib/components/accounts/NewAccountModal.svelte";
    import Loading from "$lib/components/common/Loading.svelte";
    import Button from "$lib/components/common/Button.svelte";
    import { api } from "$lib/utils/api";
    import { tradeCacheStore } from "$lib/stores/tradeCache";

    let loading = true;
    let error = "";
    let openTrades = [];
    let closedTrades = [];
    let showDayModal = false;
    let showEditModal = false;
    let showViewModal = false;
    let showNewTradeModal = false;
    let showEmptyDayModal = false;
    let showAccountModal = false;
    let selectedTrade = null;
    let selectedDate = "";
    let selectedDisplayDate = "";
    let selectedDayTrades = [];
    let selectedDayTransactions = [];
    let newTradeDate = "";
    let initialLoad = true;
    let currentAccountId = null;

    onMount(async () => {
        try {
            const account = await accountStore.loadAccounts();
            if (account) {
                await Promise.all([
                    loadTrades(),
                    transactionStore.fetchTransactions(
                        $accountStore.currentAccount._id,
                    ),
                ]);
            }
        } catch (err) {
            error = err.message;
        } finally {
            initialLoad = false;
        }
    });

    async function loadTrades() {
        if (!$accountStore.currentAccount) return;

        const accountId = $accountStore.currentAccount._id;

        // console.log('Current cache:', $tradeCacheStore);
        // console.log('Checking cache for account:', accountId);
        // console.log('Cache exists:', !!$tradeCacheStore[accountId]);

        if (
            $tradeCacheStore[accountId] &&
            Array.isArray($tradeCacheStore[accountId].openTrades) &&
            Array.isArray($tradeCacheStore[accountId].closedTrades)
        ) {
            loading = false;
            openTrades = $tradeCacheStore[accountId].openTrades;
            closedTrades = $tradeCacheStore[accountId].closedTrades;
            try {
                error = "";
                const response = await api.getTrades(accountId);
                openTrades = response.filter(
                    (trade) => trade.status === "OPEN",
                );
                closedTrades = response.filter(
                    (trade) => trade.status === "CLOSED",
                );

                tradeCacheStore.setCache(accountId, {
                    openTrades: [...openTrades],
                    closedTrades: [...closedTrades],
                });
            } catch (err) {
                error = err.message;
            }
            return;
        }

        try {
            error = "";
            const response = await api.getTrades(accountId);
            openTrades = response.filter((trade) => trade.status === "OPEN");
            closedTrades = response.filter(
                (trade) => trade.status === "CLOSED",
            );

            tradeCacheStore.setCache(accountId, {
                openTrades: [...openTrades],
                closedTrades: [...closedTrades],
            });
        } catch (err) {
            error = err.message;
        } finally {
            loading = false;
        }
    }

    // Watch for account changes
    $: if ($accountStore.currentAccount?._id !== currentAccountId) {
        currentAccountId = $accountStore.currentAccount?._id;
        if (currentAccountId) {
            loadTrades();
        }
    }

    function handleDayClick(event) {
        selectedDate = event.detail.date;
        selectedDisplayDate = event.detail.displayDate;
        selectedDayTrades = event.detail.trades;
        selectedDayTransactions = event.detail.transactions;
        showDayModal = true;
    }

    function handleNewTradeFromCalendar(event) {
        // Format date for date input (YYYY-MM-DD)
        const date = new Date(event.detail);
        date.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
        newTradeDate = date.toISOString().slice(0, 10);
        showNewTradeModal = true;
        showDayModal = false; // Close the day modal when opening new trade modal
    }

    function handleView(event) {
        selectedTrade = event.detail;
        showViewModal = true;
        showDayModal = false;
    }

    function handleEdit(event) {
        selectedTrade = event.detail;
        showEditModal = true;
        showDayModal = false;
    }

    async function handleDelete(event) {
        if (!confirm("Are you sure you want to delete this trade?")) return;

        try {
            loading = true;
            error = "";

            await api.deleteTrade(event.detail);
            await loadTrades();
            // Refresh account data to update balance
            await accountStore.setCurrentAccount(
                $accountStore.currentAccount._id,
            );
            // Dispatch trade update event for stats
            window.dispatchEvent(new CustomEvent("tradeupdate"));
            showDayModal = false;
        } catch (err) {
            error = err.message;
        } finally {
            loading = false;
        }
    }

    async function handleSubmit(event) {
        try {
            loading = true;
            error = "";

            if (selectedTrade) {
                await api.updateTrade(selectedTrade._id, event.detail);
            } else {
                await api.createTrade(event.detail);
            }

            await loadTrades();
            // Refresh account data to update balance
            await accountStore.setCurrentAccount(
                $accountStore.currentAccount._id,
            );
            // Dispatch trade update event for stats
            window.dispatchEvent(new CustomEvent("tradeupdate"));
            showEditModal = false;
            showNewTradeModal = false;
            selectedTrade = null;
            newTradeDate = "";
        } catch (err) {
            error = err.message;
        } finally {
            loading = false;
        }
    }

    function closeEditModal() {
        showEditModal = false;
        selectedTrade = null;
    }

    function closeViewModal() {
        showViewModal = false;
        selectedTrade = null;
    }

    function closeDayModal() {
        showDayModal = false;
        selectedDate = "";
        selectedDisplayDate = "";
        selectedDayTrades = [];
        selectedDayTransactions = [];
    }

    function closeNewTradeModal() {
        showNewTradeModal = false;
        newTradeDate = "";
    }

    function handleNewTrade() {
        // When clicking New Trade button, use current date
        const now = new Date();
        now.setHours(12, 0, 0, 0);
        newTradeDate = now.toISOString().slice(0, 10);
        showNewTradeModal = true;
    }

    function handleAddAccount() {
        showAccountModal = true;
    }

    $: totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    $: winRate =
        closedTrades.length > 0
            ? Math.round(
                  (closedTrades.filter((t) => t.pnl > 0).length /
                      closedTrades.length) *
                      100,
              )
            : 0;

    function openDayTradesModal(selectedDate) {
        selectedDisplayDate = selectedDate;
        showDayModal = true;
        transactionStore.fetchTransactions(currentAccountId);
    }
</script>

<div class="space-y-4 p-8">
    {#if error}
        <div
            class="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-3 rounded-lg"
        >
            <div class="flex">
                <svg
                    class="w-5 h-5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path
                        fill-rule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clip-rule="evenodd"
                    />
                </svg>
                <span>{error}</span>
            </div>
        </div>
    {/if}

    <!-- Header -->
    <div class="flex justify-between items-center">
        <h1
            class="text-4xl font-bold bg-gradient-purple bg-clip-text text-transparent"
        >
            Dashboard
        </h1>
        {#if $accountStore.currentAccount}
            <Button variant="primary" on:click={handleNewTrade}>
                <svg
                    class="w-5 h-5 mr-2"
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
                New Trade
            </Button>
        {/if}
    </div>

    {#if loading}
        <Loading message="Loading..." overlay={true} />
    {:else if $accountStore.currentAccount}
        <!-- Stats -->
        <TradingStats />

        <!-- Calendar Section -->
        <div class="flex gap-4 h-[500px]">
            <!-- Stats Cards -->
            <div class="w-[18.6%] card p-4 flex flex-col gap-4">
                <!-- Total P&L -->
                <div class="flex-1">
                    <div class="flex items-center justify-between mb-2">
                        <h3
                            class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted"
                        >
                            Total P&L
                        </h3>
                        <div
                            class="w-8 h-8 rounded-full {totalPnL >= 0
                                ? 'bg-green-500'
                                : 'bg-red-500'} bg-opacity-10 flex items-center justify-center"
                        >
                            <svg
                                class="w-4 h-4 {totalPnL >= 0
                                    ? 'text-green-500'
                                    : 'text-red-500'}"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        </div>
                    </div>
                    <p
                        class="text-2xl font-bold {totalPnL >= 0
                            ? 'text-green-500'
                            : 'text-red-500'}"
                    >
                        ${totalPnL.toFixed(2)}
                    </p>
                </div>

                <!-- Open Positions -->
                <div class="flex-1">
                    <div class="flex items-center justify-between mb-2">
                        <h3
                            class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted"
                        >
                            Open Positions
                        </h3>
                        <div
                            class="w-8 h-8 rounded-full bg-yellow-500 bg-opacity-10 flex items-center justify-center"
                        >
                            <svg
                                class="w-4 h-4 text-yellow-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        </div>
                    </div>
                    <p
                        class="text-2xl font-bold text-light-text dark:text-dark-text"
                    >
                        {openTrades.length}
                    </p>
                </div>

                <!-- Total Trades -->
                <div class="flex-1">
                    <div class="flex items-center justify-between mb-2">
                        <h3
                            class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted"
                        >
                            Total Trades
                        </h3>
                        <div
                            class="w-8 h-8 rounded-full bg-theme-500 bg-opacity-10 flex items-center justify-center"
                        >
                            <svg
                                class="w-4 h-4 text-theme-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                />
                            </svg>
                        </div>
                    </div>
                    <p
                        class="text-2xl font-bold text-light-text dark:text-dark-text"
                    >
                        {openTrades.length + closedTrades.length}
                    </p>
                </div>

                <!-- Win Rate -->
                <div class="flex-1">
                    <div class="flex items-center justify-between mb-2">
                        <h3
                            class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted"
                        >
                            Win Rate
                        </h3>
                        <div
                            class="w-8 h-8 rounded-full bg-green-500 bg-opacity-10 flex items-center justify-center"
                        >
                            <svg
                                class="w-4 h-4 text-green-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                                />
                            </svg>
                        </div>
                    </div>
                    <p
                        class="text-2xl font-bold text-light-text dark:text-dark-text"
                    >
                        {winRate}%
                    </p>
                </div>
            </div>

            <!-- Calendar -->
            <div class="flex-1">
                <TradeCalendar
                    trades={[...openTrades, ...closedTrades]}
                    accountId={$accountStore.currentAccount._id}
                    on:dayClick={handleDayClick}
                    on:newTrade={handleNewTradeFromCalendar}
                />
            </div>
        </div>

        <!-- Performance Chart -->
        <TradeChart {openTrades} {closedTrades} />
    {:else}
        <div class="card p-16 text-center space-y-6">
            <div class="flex flex-col items-center justify-center space-y-4">
                <svg
                    class="w-16 h-16 text-light-text-muted dark:text-dark-text-muted"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                </svg>
                <h2
                    class="text-2xl font-bold text-light-text dark:text-dark-text"
                >
                    Create an account to see your trading statistics
                </h2>
                <p
                    class="text-light-text-muted dark:text-dark-text-muted max-w-md"
                >
                    Track your performance, analyze your trades, and improve
                    your trading strategy with our comprehensive trading tools.
                </p>
                <Button variant="primary" on:click={handleAddAccount}>
                    <svg
                        class="w-5 h-5 mr-2"
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
                    Add Account
                </Button>
            </div>
        </div>
    {/if}
</div>

<!-- Modals -->
<NewAccountModal
    bind:show={showAccountModal}
    on:close={() => (showAccountModal = false)}
/>

<!-- Modals -->
{#if $accountStore.currentAccount}
    <DayTradesModal
        bind:show={showDayModal}
        trades={selectedDayTrades}
        transactions={selectedDayTransactions}
        date={selectedDate}
        displayDate={selectedDisplayDate}
        accountId={$accountStore.currentAccount?._id}
        on:view={handleView}
        on:edit={handleEdit}
        on:delete={handleDelete}
        on:newTrade={handleNewTradeFromCalendar}
    />

    <TradeModal
        bind:show={showEditModal}
        trade={selectedTrade}
        accountId={$accountStore.currentAccount?._id}
        on:submit={handleSubmit}
        on:close={closeEditModal}
    />

    <TradeModal
        bind:show={showNewTradeModal}
        accountId={$accountStore.currentAccount?._id}
        entryDate={newTradeDate || selectedDate}
        on:submit={handleSubmit}
        on:close={closeNewTradeModal}
    />

    <TradeViewModal bind:show={showViewModal} trade={selectedTrade} />

    <EmptyDayModal
        bind:show={showEmptyDayModal}
        date={selectedDate}
        on:newTrade={handleNewTradeFromCalendar}
    />
{/if}

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-lg;
    }
</style>
