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
    import { createDefaultLayout } from '$lib/utils/widgetUtils';
    import { fade } from 'svelte/transition';
    import LimitReachedModal from '$lib/components/common/LimitReachedModal.svelte';
    import { subscriptionStore } from '$lib/stores/subscriptionStore';
    import { SUBSCRIPTION_TYPES } from '$lib/config/subscription';
    import { goto } from '$app/navigation';

    const dispatch = createEventDispatcher();

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

    // เพิ่ม function สำหรับตรวจสอบ limit
    function checkLayoutLimit() {
        if ($subscriptionStore.type === SUBSCRIPTION_TYPES.BASIC && layouts.length >= 2) {
            showNewLayoutModal = false;
            showUpgradeModal = true;
            return true;
        }
        return false;
    }

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
            if (savedLayouts?.length > 0) {
                layouts = savedLayouts;
            } else {
                // Create default layout if no layouts exist
                layouts = [createDefaultLayout()];
                await layoutStore.saveLayouts(layouts);
            }
            // Ensure active index is valid
            if (activeLayoutIndex >= layouts.length) {
                activeLayoutIndex = 0;
            }
        } catch (error) {
            console.error('Error loading layouts:', error);
            // Reset to default if there's an error
            layouts = [createDefaultLayout()];
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
        if (checkLayoutLimit()) return;

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

    // เพิ่ม event handlers สำหรับ click outside และ scroll
    function handleClickOutside(event) {
        const dropdown = document.querySelector('.layout-picker-dropdown');
        const button = document.querySelector('.layout-picker-button');
        
        if (dropdown && !dropdown.contains(event.target) && !button.contains(event.target)) {
            showLayoutDropdown = false;
        }
    }

    function handleScroll() {
        if (showLayoutDropdown) {
            showLayoutDropdown = false;
        }
    }

    onMount(() => {
        document.addEventListener('click', handleClickOutside);
        window.addEventListener('scroll', handleScroll, true);

        return () => {
            document.removeEventListener('click', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    });

    // เพิ่ม function สำหรับ upgrade
    function upgradePlan() {
        showUpgradeModal = false;
        goto('/settings/subscription');
    }

    let showUpgradeModal = false;
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
            <div class="relative inline-block">
                <button 
                    class="flex items-center text-4xl font-bold bg-gradient-purple bg-clip-text text-transparent focus:outline-none layout-picker-button" 
                    on:click|stopPropagation={() => showLayoutDropdown = !showLayoutDropdown}
                >
                    Dashboard
                    <svg class="w-5 h-5 ml-2 text-theme-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {#if showLayoutDropdown}
                    <div 
                        class="absolute left-0 top-full mt-1 z-50 p-2 rounded-lg shadow-xl 
                               border border-light-border dark:border-dark-border
                               bg-light-card dark:bg-dark-card backdrop-blur-lg w-[240px] layout-picker-dropdown"
                        transition:fade={{ duration: 150 }}
                        on:click|stopPropagation
                    >
                        <div class="flex flex-col gap-2">
                            <div class="flex flex-col gap-1">
                                <div class="text-xs font-medium text-light-text-muted dark:text-dark-text-muted px-1">
                                    Select Layout
                                </div>
                                <div class="flex flex-col gap-0.5">
                                    {#each layouts as layout, i}
                                        <button
                                            class="flex items-center justify-between px-2 py-1.5 rounded text-sm
                                                   {i === activeLayoutIndex 
                                                       ? 'bg-theme-500 text-white' 
                                                       : 'bg-light-hover/50 dark:bg-dark-hover/50 hover:bg-light-hover dark:hover:bg-dark-hover text-light-text dark:text-dark-text'}"
                                            on:click={() => {
                                                editMode = false;
                                                activeLayoutIndex = i;
                                                showLayoutDropdown = false;
                                            }}
                                        >
                                            <span class="text-xs">{layout.name}</span>
                                            {#if layouts.length > 1}
                                                <button
                                                    class="p-0.5 rounded-full hover:bg-red-500/20 hover:text-red-500 dark:hover:text-red-400"
                                                    on:click|stopPropagation={() => deleteLayout(i)}
                                                >
                                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            {/if}
                                        </button>
                                    {/each}
                                </div>
                            </div>

                            {#if $subscriptionStore.type === SUBSCRIPTION_TYPES.BASIC && layouts.length >= 2}
                                <button
                                    class="w-full px-2 py-1.5 text-xs font-medium rounded
                                           bg-theme-500/10 text-theme-500 dark:text-theme-400
                                           hover:bg-theme-500/20 transition-colors"
                                    on:click={() => {
                                        showLayoutDropdown = false;
                                        showUpgradeModal = true;
                                    }}
                                >
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center gap-1.5">
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                            </svg>
                                            New Layout
                                        </div>
                                        <span class="text-[10px] opacity-70">Pro Feature</span>
                                    </div>
                                </button>
                            {:else}
                                <button
                                    class="w-full px-2 py-1.5 text-xs font-medium rounded
                                           bg-theme-500/10 text-theme-500 dark:text-theme-400
                                           hover:bg-theme-500/20 transition-colors"
                                    on:click={() => {
                                        showNewLayoutModal = true;
                                        showLayoutDropdown = false;
                                    }}
                                >
                                    <div class="flex items-center justify-center gap-1.5">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                        </svg>
                                        New Layout
                                    </div>
                                </button>
                            {/if}
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
    on:refreshLayout={async () => {
        // รีโหลด layout และ refresh widgets
        await reloadLayoutAndRefresh();
        
        // โหลดข้อมูล account ใหม่
        await accountStore.loadAccounts();
        
        // โหลดข้อมูล trades ใหม่
        if ($accountStore.currentAccount) {
            await loadTrades();
            await transactionStore.fetchTransactions($accountStore.currentAccount._id);
        }
    }}
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

<!-- เพิ่ม Upgrade Modal -->
{#if showUpgradeModal}
    <LimitReachedModal
        show={showUpgradeModal}
        title="Layout Limit Reached"
        description="Basic users are limited to 2 layouts. Upgrade to Pro for unlimited layouts and advanced features."
        upgradeText="Upgrade to Pro"
        cancelText="Maybe Later"
        width="md"
        on:close={() => showUpgradeModal = false}
        on:upgrade={upgradePlan}
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
