<script>
    import { onMount } from "svelte";
    import { accountStore } from "$lib/stores/accountStore";
    import { transactionStore } from "$lib/stores/transactionStore";
    import WidgetLayout from "$lib/components/dashboard/WidgetLayout.svelte";
    import TradeModal from "$lib/components/trades/TradeModal.svelte";
    import TradeViewModal from "$lib/components/trades/TradeViewModal.svelte";
    import DayTradesModal from "$lib/components/dashboard/DayTradesModal.svelte";
    import EmptyDayModal from "$lib/components/dashboard/EmptyDayModal.svelte";
    import NewAccountModal from "$lib/components/accounts/NewAccountModal.svelte";
    import Loading from "$lib/components/common/Loading.svelte";
    import Button from "$lib/components/common/Button.svelte";
    import Modal from "$lib/components/common/Modal.svelte";
    import { api } from "$lib/utils/api";
    import { loadingStore } from '$lib/stores/loadingStore';

    // Add widget configurations
    const defaultWidgetConfigs = {
        TradingStats: { cols: 12, rows: 2, height: 140 },
        StatsCards: { cols: 2, rows: 8, height: 560 },
        TradeCalendar: { cols: 6, rows: 8, height: 560 },
        TradeChart: { cols: 4, rows: 8, height: 560 }
    };

    // Add helper functions
    function createUniqueId(baseType) {
        return `${baseType}_${generateUUID()}`;
    }

    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function getDefaultWidgets() {
        return [
            { 
                id: createUniqueId('TradingStats'),
                config: {...defaultWidgetConfigs.TradingStats}
            },
            { 
                id: createUniqueId('StatsCards'),
                config: {...defaultWidgetConfigs.StatsCards}
            },
            { 
                id: createUniqueId('TradeCalendar'),
                config: {...defaultWidgetConfigs.TradeCalendar}
            },
            { 
                id: createUniqueId('TradeChart'),
                config: {...defaultWidgetConfigs.TradeChart}
            }
        ];
    }

    // Rest of the existing script remains the same...
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
    let currentAccountId = null;
    let showDeleteConfirmModal = false;
    let deleteType = ''; 
    let deleteContext = ''; 
    let selectedItems = [];
    let dayTradesLoading = false;
    let editMode = false;

    // Layout management
    let layouts = [{
        name: 'Default',
        widgets: []  // Initialize empty, will be populated after data loads
    }];
    let activeLayoutIndex = 0;
    let showNewLayoutModal = false;
    let newLayoutName = '';
    let showLayoutDropdown = false;

    onMount(async () => {
        try {
            loadingStore.set(true);
            const account = await accountStore.loadAccounts();
            if (account) {
                await Promise.all([
                    loadTrades(),
                    transactionStore.fetchTransactions($accountStore.currentAccount._id),
                ]);
                // Load layouts from localStorage
                loadLayouts();
            }
        } catch (err) {
            error = err.message;
        } finally {
            loadingStore.set(false);
        }
    });

    // Modified loadLayouts function with better error handling
    function loadLayouts() {
        try {
            const savedLayouts = localStorage.getItem('dashboardLayouts');
            if (savedLayouts) {
                layouts = JSON.parse(savedLayouts);
                // Ensure there's always at least one layout
                if (!layouts || layouts.length === 0) {
                    layouts = [{
                        name: 'Default',
                        widgets: getDefaultWidgets()
                    }];
                }
            } else {
                // Create default layout
                layouts = [{
                    name: 'Default',
                    widgets: getDefaultWidgets()
                }];
            }
            // Ensure active index is valid
            if (activeLayoutIndex >= layouts.length) {
                activeLayoutIndex = 0;
            }
            saveLayouts();
        } catch (error) {
            console.error('Error loading layouts:', error);
            // Reset to default if there's an error
            layouts = [{
                name: 'Default',
                widgets: getDefaultWidgets()
            }];
            activeLayoutIndex = 0;
        }
    }

    function saveLayouts() {
        localStorage.setItem('dashboardLayouts', JSON.stringify(layouts));
    }

    function addNewLayout() {
        if (newLayoutName.trim()) {
            layouts = [...layouts, {
                name: newLayoutName.trim(),
                widgets: []
            }];
            saveLayouts();
            activeLayoutIndex = layouts.length - 1;
            showNewLayoutModal = false;
            newLayoutName = '';
        }
    }

    function deleteLayout(index) {
        if (layouts.length > 1 && confirm('Are you sure you want to delete this layout?')) {
            layouts = layouts.filter((_, i) => i !== index);
            saveLayouts();
            if (activeLayoutIndex >= layouts.length) {
                activeLayoutIndex = layouts.length - 1;
            }
        }
    }

    async function loadTrades() {
        if (!$accountStore.currentAccount) return;

        const accountId = $accountStore.currentAccount._id;

        try {
            error = "";
            const response = await api.getTrades(accountId);
            openTrades = response.filter((trade) => trade.status === "OPEN");
            closedTrades = response.filter((trade) => trade.status === "CLOSED");
        } catch (err) {
            error = err.message;
        }
    }
    // Watch for account changes
    $: if ($accountStore.currentAccount?._id !== currentAccountId) {
        currentAccountId = $accountStore.currentAccount?._id;
        if (currentAccountId) {
            loadTrades();
            transactionStore.fetchTransactions(currentAccountId);
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
        try {
            dayTradesLoading = true; // Set loading to true
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
            dayTradesLoading = false; // Set loading to false
        }
    }

    async function handleDeleteTransaction(transactionId) {
        try {
            dayTradesLoading = true; // Set loading to true
            error = "";

            await transactionStore.deleteTransaction(transactionId);
            // Fetch updated transactions
            await transactionStore.fetchTransactions($accountStore.currentAccount._id);
        } catch (err) {
            error = err.message;
        } finally {
            dayTradesLoading = false; // Set loading to false
        }
    }

    async function handleSubmit(event) {
        try {
            loadingStore.set(true); // Set loading to true
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
            loadingStore.set(false); // Set loading to false
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
</script>


<div class="space-y-4 p-8 pb-0 pt-4">
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
        <!-- Replace the h1 title with this button -->
        <div class="relative">
            <button 
                class="flex items-center text-4xl font-bold bg-gradient-purple bg-clip-text text-transparent focus:outline-none"
                on:click={() => showLayoutDropdown = !showLayoutDropdown}
            >
                Dashboard
                <svg class="w-6 h-6 ml-2 text-theme-500 transform transition-transform duration-200" fill="currentColor" viewBox="0 0 20 20"
                    class:rotate-180={showLayoutDropdown}>
                    <path fill-rule="evenodd" d="M10 12a1 1 0 01-.707-.293l-3-3a1 1 0 011.414-1.414L10 9.586l2.293-2.293a1 1 0 111.414 1.414l-3 3A1 1 0 0110 12z" clip-rule="evenodd" />
                </svg>
            </button>

            <!-- Layout Dropdown Menu -->
            {#if showLayoutDropdown}
                <div class="absolute left-0 mt-2 w-48 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-lg z-50">
                    <div class="py-1">
                        {#each layouts as layout, i}
                            <button
                                class="flex items-center justify-between w-full px-4 py-2 text-sm hover:bg-light-hover dark:hover:bg-dark-hover {i === activeLayoutIndex ? 'text-theme-500 bg-theme-500/10' : 'text-light-text dark:text-dark-text'}"
                                on:click={() => {
                                    activeLayoutIndex = i;
                                    showLayoutDropdown = false;
                                }}
                            >
                                <span>{layout.name}</span>
                                {#if layouts.length > 1}
                                    <button
                                        class="p-1 rounded-full hover:bg-red-500 hover:text-white"
                                        on:click|stopPropagation={() => deleteLayout(i)}
                                    >
                                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                {/if}
                            </button>
                        {/each}

                        <!-- Add New Layout Button -->
                        <button
                            class="flex items-center w-full px-4 py-2 text-sm text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover border-t border-light-border dark:border-dark-border"
                            on:click={() => {
                                showNewLayoutModal = true;
                                showLayoutDropdown = false;
                            }}
                        >
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                            </svg>
                            New Layout
                        </button>
                    </div>
                </div>
            {/if}
        </div>

        {#if $accountStore.currentAccount}
            <div class="flex items-center gap-4">
                <Button variant="primary" size="sm" on:click={handleNewTrade}>
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
            </div>
        {/if}
    </div>

    {#if $loadingStore}
        <Loading message="Loading..." overlay={true} />
    {:else if $accountStore.currentAccount}
        <!-- Widget Layout with null check -->
        <WidgetLayout 
            {openTrades} 
            {closedTrades} 
            {totalPnL} 
            {winRate}
            accountId={$accountStore.currentAccount._id}
            widgets={layouts[activeLayoutIndex]?.widgets || []}
            on:updateWidgets={(e) => {
                if (layouts[activeLayoutIndex]) {
                    layouts[activeLayoutIndex].widgets = e.detail;
                    saveLayouts();
                }
            }}
        />
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
                <Button variant="primary" size="sm" on:click={handleAddAccount}>
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

<!-- New Layout Modal -->
{#if showNewLayoutModal}
    <Modal 
        bind:show={showNewLayoutModal}
        title="Create New Layout"
    >
        <div class="space-y-4">
            <div>
                <label class="block mb-2 text-sm font-medium text-light-text dark:text-dark-text">Layout Name</label>
                <input 
                    type="text"
                    bind:value={newLayoutName}
                    class="w-full border border-light-border dark:border-dark-border bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text rounded-lg p-2 focus:ring-2 focus:ring-theme-500 focus:border-transparent"
                    placeholder="Enter layout name..."
                />
            </div>
            <div class="flex justify-end gap-2 mt-4">
                <Button 
                    variant="secondary" 
                    size="sm"
                    on:click={() => {
                        showNewLayoutModal = false;
                        newLayoutName = '';
                    }}
                >
                    Cancel
                </Button>
                <Button 
                    variant="primary"
                    size="sm"
                    disabled={!newLayoutName.trim()}
                    on:click={addNewLayout}
                >
                    Create Layout
                </Button>
            </div>
        </div>
    </Modal>
{/if}

<!-- Existing Modals remain the same -->
<NewAccountModal
    bind:show={showAccountModal}
    on:close={() => (showAccountModal = false)}
/>

{#if $accountStore.currentAccount}
    <!-- Existing Modals remain the same -->
{/if}

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-lg;
    }
    
    /* Add these new styles */
    .group:hover .group-hover\:visible {
        visibility: visible;
    }
    
    .group:hover .group-hover\:opacity-100 {
        opacity: 1;
    }

    /* Optional: Rotate the dropdown icon when open */
    .rotate-180 {
        transform: rotate(180deg);
    }

    /* Add border indication for edit mode */
    .edit-mode-background {
        border: 2px dashed #1E90FF; /* DodgerBlue color */
    }
</style>
