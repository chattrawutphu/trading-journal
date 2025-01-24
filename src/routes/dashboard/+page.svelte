<script>
    import { onMount, createEventDispatcher } from "svelte";
    import { accountStore } from "$lib/stores/accountStore";
    import { transactionStore } from "$lib/stores/transactionStore";
    import WidgetLayout from "$lib/components/dashboard/WidgetLayout.svelte";
    import TradeModal from "$lib/components/trades/TradeModal.svelte";
    import TradeViewModal from "$lib/components/trades/TradeViewModal.svelte";
    import NewAccountModal from "$lib/components/accounts/NewAccountModal.svelte";
    import Loading from "$lib/components/common/Loading.svelte";
    import Button from "$lib/components/common/Button.svelte";
    import Modal from "$lib/components/common/Modal.svelte";
    import { api } from "$lib/utils/api";
    import { loadingStore } from '$lib/stores/loadingStore';
    import { layoutStore } from '$lib/stores/layoutStore';

    const dispatch = createEventDispatcher();

    // Add widget configurations
    const defaultWidgetConfigs = {
        TradingStats: { cols: 12, rows: 2, height: 140 },
        StatsCards: { cols: 2, rows: 8, height: 560 },
        TradeCalendar: { cols: 6, rows: 8, height: 560 },
        MonthTradeCalendar: { cols: 6, rows: 8, height: 560 },
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
    let showEditModal = false;
    let showViewModal = false;
    let showAccountModal = false;
    let selectedTrade = null;
    let currentAccountId = null;
    let editMode = false;
    let trades = [];

    // Layout management
    let layouts = [{
        name: 'Default',
        widgets: []  // Initialize empty, will be populated after data loads
    }];
    let activeLayoutIndex = 0;
    let showNewLayoutModal = false;
    let newLayoutName = '';
    let showLayoutDropdown = false;

    // Add state for temporary layout
    let tempLayouts = null;

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
                await loadLayouts();
            }
        } catch (err) {
            error = err.message;
        } finally {
            loadingStore.set(false);
        }
    });

    // Modified loadLayouts function
    async function loadLayouts() {
        try {
            const savedLayouts = await layoutStore.loadLayouts();
            if (savedLayouts && savedLayouts.length > 0) {
                layouts = savedLayouts;
            } else {
                // Create default layout if no layouts exist
                layouts = [{
                    name: 'Default',
                    widgets: getDefaultWidgets()
                }];
                await layoutStore.saveLayouts(layouts);
            }
            // Ensure active index is valid
            if (activeLayoutIndex >= layouts.length) {
                activeLayoutIndex = 0;
            }
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

    // Modified saveLayouts function
    async function saveLayouts() {
        try {
            await layoutStore.saveLayouts(layouts);
        } catch (error) {
            console.error('Error saving layouts:', error);
            // Show error message to user
            error = 'Failed to save layouts. Please try again.';
        }
    }

    // Modified addNewLayout function
    async function addNewLayout() {
        if (newLayoutName.trim()) {
            layouts = [...layouts, {
                name: newLayoutName.trim(),
                widgets: []
            }];
            try {
                await saveLayouts();
                activeLayoutIndex = layouts.length - 1;
                showNewLayoutModal = false;
                newLayoutName = '';
            } catch (error) {
                // Handle error
                console.error('Error adding new layout:', error);
            }
        }
    }

    // Modified deleteLayout function
    async function deleteLayout(index) {
        if (layouts.length > 1 && confirm('Are you sure you want to delete this layout?')) {
            layouts = layouts.filter((_, i) => i !== index);
            try {
                await saveLayouts();
                if (activeLayoutIndex >= layouts.length) {
                    activeLayoutIndex = layouts.length - 1;
                }
            } catch (error) {
                // Handle error
                console.error('Error deleting layout:', error);
            }
        }
    }

    // Modified function to handle edit mode
    function handleEditModeChange(e) {
        editMode = e.detail;
        if (editMode) {
            console.log('🔄 Storing current layouts state');
            // Store current layouts state when entering edit mode
            tempLayouts = JSON.parse(JSON.stringify(layouts));
        }
    }

    // Modified handleUpdateWidgets
    function handleUpdateWidgets(e) {
        if (layouts[activeLayoutIndex]) {
            layouts[activeLayoutIndex].widgets = e.detail;
            // Force update
            layouts = [...layouts];
        }
    }

    // Add new function to handle layout save
    async function handleSaveLayout(widgets) {
        try {
            console.log('💾 Saving layout from dashboard', {
                layoutIndex: activeLayoutIndex,
                layoutName: layouts[activeLayoutIndex]?.name
            });
            
            if (layouts[activeLayoutIndex]) {
                layouts[activeLayoutIndex].widgets = widgets;
                await saveLayouts();
            }
        } catch (error) {
            console.error('❌ Error saving layout:', error);
            error = 'Failed to save layout. Please try again.';
        }
    }

    async function loadTrades() {
        if (!$accountStore.currentAccount) return;

        const accountId = $accountStore.currentAccount._id;

        try {
            error = "";
            const response = await api.getTrades(accountId);
            trades = response;
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

    function handleNewTradeFromCalendar() {
        selectedTrade = null;
        showEditModal = true;
    }

    function handleView(event) {
        selectedTrade = event.detail;
        showViewModal = true;
    }

    function handleEdit(event) {
        selectedTrade = event.detail;
        showEditModal = true;
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

    function closeViewModal() {
        showViewModal = false;
        selectedTrade = null;
    }

    function handleNewTrade() {
        selectedTrade = null; 
        showEditModal = true;
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

    function handleTradeView(trade) {
        selectedTrade = trade;
        showViewModal = true;
    }

    function handleTradeEdit(trade) {
        selectedTrade = trade;
        showEditModal = true;
    }

    async function handleTradeFavorite(tradeId) {
        try {
            await loadTrades();
        } catch (error) {
            console.error('Error updating favorite:', error);
        }
    }

    async function handleTransactionFavorite(transactionId) {
        try {
            await transactionStore.fetchTransactions($accountStore.currentAccount._id);
        } catch (error) {
            console.error('Error updating favorite:', error);
        }
    }

    async function handleTradeDelete(event) {
        try {
            const { items } = event;
            await api.deleteTrades(items);
            await loadTrades();
        } catch (error) {
            console.error('Error deleting trades:', error);
        }
    }

    // Shared function to reload layout and refresh widgets
    async function reloadLayoutAndRefresh() {
        dispatch('setLoading', true);
        
        try {
            const savedLayouts = await layoutStore.loadLayouts();
            
            if (savedLayouts && savedLayouts.length > 0) {
                layouts = savedLayouts;
                if (layouts[activeLayoutIndex]) {
                    layouts[activeLayoutIndex].widgets = [...layouts[activeLayoutIndex].widgets];
                }
            }
        } catch (error) {
            console.error('Error reloading layout:', error);
        } finally {
            dispatch('setLoading', false);
        }
    }

    async function handleTradeUpdated() {
        await loadTrades();
        showEditModal = false;
        selectedTrade = null;
        await reloadLayoutAndRefresh();
    }

    async function cancelEdit() {
        await reloadLayoutAndRefresh();
        editMode = false;
        dispatch('editModeChange', false);
    }

    function handleSetLoading(e) {
        loadingStore.set(e.detail);
    }
</script>


<div class="space-y-4 p-1 lg:p-4 lg:py-0 py-0">
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
        <!-- Left side with title and edit button -->
        <div class="flex items-center gap-3">
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
                    <div class="absolute left-0 mt-2 w-48 bg-light-card dark:bg-dark-card border border-light-border dark:border-0 rounded-lg shadow-lg z-50">
                        <div class="py-1">
                            {#each layouts as layout, i}
                                <button
                                    class="flex items-center justify-between w-full px-4 py-2 text-sm hover:bg-light-hover dark:hover:bg-dark-hover {i === activeLayoutIndex ? 'text-theme-500 bg-theme-500/10' : 'text-light-text dark:text-dark-text'}"
                                    on:click={() => {
                                        editMode = false;
                                        activeLayoutIndex = i;
                                        showLayoutDropdown = false;
                                        // Close any open modals when switching layouts
                                        if (showDayModal) showDayModal = false;
                                        if (showEditModal) showEditModal = false;
                                        if (showViewModal) showViewModal = false;
                                        if (showNewTradeModal) showNewTradeModal = false;
                                        // Close month modal in calendar widgets
                                        const widgets = document.querySelectorAll('svelte\\:component');
                                        widgets.forEach(widget => {
                                            if (widget.__svelte_component__ && widget.__svelte_component__.closeMonthModal) {
                                                widget.__svelte_component__.closeMonthModal();
                                            }
                                        });
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
                                class="flex items-center w-full px-4 py-2 text-sm text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover border-t border-light-border dark:border-0"
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

            <!-- Add Edit Layout Button -->
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

        {#if $accountStore.currentAccount}
            <div class="flex items-center gap-4">
                <Button variant="primary" size="sm" on:click={handleNewTrade}>
                    <svg
                        class="w-5 h-5 mr-0 md:mr-2"
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
                    <span class="hidden md:flex">New Trade</span>
                </Button>
            </div>
        {/if}
    </div>

    <!-- Content -->
    <div class="relative">
        {#if $loadingStore}
            <Loading message="Loading..." overlay={true} />
        {/if}
        
        <div class="transition-opacity duration-200" class:opacity-0={$loadingStore}>
            {#if $accountStore.currentAccount}
                <WidgetLayout 
                    {trades}
                    accountId={$accountStore.currentAccount._id}
                    {openTrades} 
                    {closedTrades} 
                    {totalPnL} 
                    {winRate}
                    widgets={layouts[activeLayoutIndex]?.widgets || []}
                    {activeLayoutIndex}
                    bind:editMode
                    on:updateWidgets={handleUpdateWidgets}
                    onSaveLayout={handleSaveLayout}
                    on:editModeChange={(e) => editMode = e.detail}
                    on:setLoading={handleSetLoading}
                    on:view={handleView}
                    on:edit={handleEdit}
                    on:newTrade={() => {
                        selectedTrade = null;
                        showEditModal = true;
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
    </div>
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
                    class="w-full border border-light-border dark:border-0 bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text rounded-lg p-2 focus:ring-2 focus:ring-theme-500 focus:border-transparent"
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
    <TradeModal
        bind:show={showEditModal}
        trade={selectedTrade}
        accountId={$accountStore.currentAccount._id}
        on:tradeUpdated={handleTradeUpdated}
    />

    <TradeViewModal
        bind:show={showViewModal}
        trade={selectedTrade}
        on:close={closeViewModal}
    />
{/if}

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-0 rounded-lg shadow-lg;
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
