<script>
    import { onMount } from 'svelte';
    import { fade, fly } from 'svelte/transition';
    import { page } from '$app/stores';
    import { accountStore } from '$lib/stores/accountStore';
    import { transactionStore } from '$lib/stores/transactionStore';
    import TradeTable from '$lib/components/trades/TradeTable.svelte';
    import TradeModal from '$lib/components/trades/TradeModal.svelte';
    import TradeViewModal from '$lib/components/trades/TradeViewModal.svelte';
    import TradeFilters from '$lib/components/trades/TradeFilters.svelte';
    import TransactionTable from '$lib/components/transactions/TransactionTable.svelte';
    import NewAccountModal from '$lib/components/accounts/NewAccountModal.svelte';
    import Loading from '$lib/components/common/Loading.svelte';
    import Button from '$lib/components/common/Button.svelte';
    import Input from '$lib/components/common/Input.svelte';
    import { api } from '$lib/utils/api';
    import Modal from '$lib/components/common/Modal.svelte';
    import { loadingStore } from '$lib/stores/loadingStore'; // Import loading store
    import TradeFilterBar from '$lib/components/trades/TradeFilterBar.svelte';

    let error = '';
    let trades = [];
    let hasTrades = false;
    let openTrades = [];
    let closedTrades = [];
    let hasOpenTrades = false;
    let hasClosedTrades = false;
    let showEditModal = false;
    let showViewModal = false;
    let showDepositModal = false;
    let showWithdrawModal = false;
    let showAccountModal = false;
    let selectedTrade = null;
    let selectedTransaction = null;
    let activeTab = 'trades';
    let transactionAmount = 0;
    let transactionDate = new Date().toLocaleString('sv').slice(0, 16); // Use user's local time in 'YYYY-MM-DDTHH:MM' format
    let currentAccountId = null;
    let transactionNote = ''; // Add this variable if not already present
    let showDeleteConfirmModal = false;

    let filters = {
        symbol: '',
        status: [],
        side: [],
        dateRange: {
            start: '',
            end: ''
        },
        type: [],
        favorite: false,
        tags: [],
        profitableOnly: false,
        unprofitableOnly: false,
        showAdvanced: false,
        strategy: '',
        emotions: [],
        confidenceLevel: {
            min: 1,
            max: 10
        },
        greedLevel: {
            min: 1,
            max: 10
        },
        hasStopLoss: null,
        hasTakeProfit: null,
        amount: {
            min: '',
            max: ''
        },
        pnl: {
            min: '',
            max: ''
        },
        pnlPercentage: {
            min: '',
            max: ''
        },
        excludeZeroPnL: false,
        disabled: null,
        positionHistory: false
    };

    function updateTradeStats(tradeList) {
        // แยกและอัพเดท trades ทั้งหมด
        openTrades = tradeList.filter(t => t.status === 'OPEN');
        closedTrades = tradeList.filter(t => t.status === 'CLOSED');
        hasOpenTrades = openTrades.length > 0;
        hasClosedTrades = closedTrades.length > 0;
        hasTrades = tradeList.length > 0;
        trades = tradeList;
    }

    $: if ($page.url.searchParams.get('newTrade') === 'true') {
        showEditModal = true;
        // Clear the URL parameter without refreshing the page
        const url = new URL(window.location);
        url.searchParams.delete('newTrade');
        window.history.replaceState({}, '', url);
    }

    onMount(async () => {
        try {
            await loadTrades();
        } catch (err) {
            error = err.message;
        }
    });

    async function loadTrades() {
        if (!$accountStore.currentAccount) return;
        
        try {
            loadingStore.set(true); // Set loading to true
            error = '';
            
            const response = await api.getTrades($accountStore.currentAccount._id);
            
            // อัพเดทข้อมูล
            updateTradeStats(response);

        } catch (err) {
            error = err.message;
        } finally {
            loadingStore.set(false); // Set loading to false
        }
    }

    // Watch for account changes
    $: if ($accountStore.currentAccount?._id !== currentAccountId) {
        currentAccountId = $accountStore.currentAccount?._id;
        if (currentAccountId) {
            loadTrades();
        }
    }

    // Step 1: Fetch transactions when 'transactions' tab is active
    $: if (activeTab === 'transactions' && currentAccountId) {
        transactionStore.fetchTransactions(currentAccountId);
    }

    async function handleSubmit(event) {
        try {
            loadingStore.set(true); // Set loading to true
            error = '';

            if (selectedTrade) {
                await api.updateTrade(selectedTrade._id, event.detail);
            } else {
                await api.createTrade(event.detail);
            }

            showEditModal = false;
            selectedTrade = null;
            await loadTrades();
            // Refresh account data to update balance
            await accountStore.setCurrentAccount($accountStore.currentAccount._id);
            // Dispatch trade update event
            window.dispatchEvent(new CustomEvent('tradeupdate'));
        } catch (err) {
            error = err.message;
        } finally {
            loadingStore.set(false); // Set loading to false
        }
    }

    async function handleDeposit() {
        if (transactionAmount > 0) {
            try {
                error = '';
                await transactionStore.createTransaction(
                    $accountStore.currentAccount._id,
                    'deposit',
                    transactionAmount,
                    new Date(transactionDate), // Use user's local time
                    transactionNote // Pass note to createTransaction
                );
                await accountStore.setCurrentAccount($accountStore.currentAccount._id);
                // Fetch updated transactions
                await transactionStore.fetchTransactions(currentAccountId);
                showDepositModal = false;
                transactionAmount = 0;
                transactionDate = new Date().toLocaleString('en-GB', { hour12: false }).slice(0, 16).replace(',', '');
                transactionNote = ''; // Reset note
            } catch (err) {
                error = err.message;
            }
        }
    }

    async function handleWithdraw() {
        if (transactionAmount > 0) {
            try {
                error = '';
                await transactionStore.createTransaction(
                    $accountStore.currentAccount._id,
                    'withdrawal',
                    transactionAmount,
                    new Date(transactionDate), // Use user's local time
                    transactionNote // Pass note to createTransaction
                );
                await accountStore.setCurrentAccount($accountStore.currentAccount._id);
                // Fetch updated transactions
                await transactionStore.fetchTransactions(currentAccountId);
                showWithdrawModal = false;
                transactionAmount = 0;
                transactionDate = new Date().toLocaleString('en-GB', { hour12: false }).slice(0, 16).replace(',', '');
                transactionNote = ''; // Reset note
            } catch (err) {
                error = err.message;
            }
        }
    }

    function handleView(event) {
        selectedTrade = event.detail;
        showViewModal = true;
    }

    function handleEdit(event) {
        selectedTrade = event.detail;
        showEditModal = true;
    }

    function handleEditTransaction(event) {
        selectedTransaction = event.detail;
        if (selectedTransaction.type === 'deposit') {
            transactionAmount = selectedTransaction.amount;
            transactionDate = new Date(selectedTransaction.date).toLocaleString('en-GB', { hour12: false }).slice(0, 16).replace(',', '');
            showDepositModal = true;
        } else {
            transactionAmount = selectedTransaction.amount;
            transactionDate = new Date(selectedTransaction.date).toLocaleString('en-GB', { hour12: false }).slice(0, 16).replace(',', '');
            showWithdrawModal = true;
        }
    }

    async function handleFavorite(tradeId) {
        try {
            loadingStore.set(true); // Set loading to true
            error = '';

            await api.toggleFavorite(tradeId);
            await loadTrades();
        } catch (err) {
            error = err.message;
        } finally {
            loadingStore.set(false); // Set loading to false
        }
    }

    async function handleDisable(tradeId) {
        try {
            loadingStore.set(true); // Set loading to true
            error = '';

            await api.toggleDisabled(tradeId);
            await loadTrades();
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

    function handleAddAccount() {
        showAccountModal = true;
    }

    async function handleFilterChange(event) {
        console.log("Filter changed:", event.detail);
        filters = event.detail;
        
        // Apply the filters - if they're complex, use server-side filtering
        if (isComplexFiltering(filters)) {
            try {
                loadingStore.set(true);
                error = '';
                
                console.log("Using server-side filtering");
                
                try {
                    // Try to get filtered trades from the server
                    const response = await api.getFilteredTrades($accountStore.currentAccount._id, filters);
                    console.log("Server returned filtered trades:", response.length);
                    updateTradeStats(response);
                } catch (err) {
                    console.error("Server filtering failed, falling back to client-side:", err);
                    
                    // Fallback to client-side filtering if server fails
                    // Note: This only filters the trades we already have loaded client-side
                    const clientFiltered = filterTradesClientSide(trades, filters);
                    console.log("Client-side filtering found:", clientFiltered.length);
                    updateTradeStats(clientFiltered);
                }
            } catch (err) {
                error = err.message;
                console.error("Error during filtering:", err);
            } finally {
                loadingStore.set(false);
            }
        } else {
            console.log("Using client-side filtering");
            // For simple filters, we'll notify the TradeTable that filters have changed
            // by forcing a change detection
            openTrades = [...openTrades]; 
            closedTrades = [...closedTrades];
        }
    }

    // Implement client-side filtering as a fallback
    function filterTradesClientSide(tradeList, filters) {
        return tradeList.filter(trade => {
            // Symbol filter
            if (filters.symbol && !trade.symbol.toLowerCase().includes(filters.symbol.toLowerCase())) {
                return false;
            }

            // Status filter
            if (filters.status.length > 0 && !filters.status.includes(trade.status)) {
                return false;
            }

            // Side filter
            if (filters.side.length > 0 && !filters.side.includes(trade.side)) {
                return false;
            }

            // Basic date filtering - you may need to adjust this
            if (filters.dateRange.start || filters.dateRange.end) {
                const entryDate = new Date(trade.entryDate);
                if (filters.dateRange.start) {
                    const startDate = new Date(filters.dateRange.start);
                    if (entryDate < startDate) return false;
                }
                if (filters.dateRange.end) {
                    const endDate = new Date(filters.dateRange.end);
                    endDate.setHours(23, 59, 59, 999); // End of the day
                    if (entryDate > endDate) return false;
                }
            }

            // Basic implementation of other filters
            // Add more as needed from the TradeTable filterTrades function
            
            return true; // Include trade if it passes all filters
        });
    }

    // Helper function to determine if filters are complex enough to warrant server call
    function isComplexFiltering(filters) {
        // Add null checks for all properties
        if (!filters) return false;
        
        return (
            (filters.dateRange && filters.dateRange.start && filters.dateRange.end) ||
            (filters.tags && filters.tags.length > 0) ||
            (filters.pnl && (filters.pnl.min || filters.pnl.max)) ||
            (filters.emotions && filters.emotions.length > 0) ||
            filters.strategy ||
            (filters.amount && (filters.amount.min || filters.amount.max)) ||
            (filters.pnlPercentage && (filters.pnlPercentage.min || filters.pnlPercentage.max)) ||
            filters.excludeZeroPnL ||
            filters.hasStopLoss !== null ||
            filters.hasTakeProfit !== null
        );
    }
</script>

<div class="space-y-4 p-1 lg:p-4 lg:py-0 py-0">
    {#if error}
        <div class="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
            <div class="flex">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                </svg>
                <span>{error}</span>
            </div>
        </div>
    {/if}

    <!-- Header -->
    <div class="flex justify-between items-center">
        <h1 class="text-4xl font-bold bg-gradient-purple bg-clip-text text-transparent">History</h1>
        {#if $accountStore.currentAccount}
            <div class="flex items-center gap-4">
                <Button variant="primary" size="sm" on:click={() => showEditModal = true}>
                    <svg class="w-5 h-5 mr-0 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
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
                <!-- Tab Navigation -->
                <div class="border-b border-light-border dark:border-0 mb-6">
                    <nav class="-mb-px flex space-x-8">
                        <button
                            class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'trades' ? 'border-theme-500 text-theme-500' : 'border-transparent text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text hover:border-light-border dark:hover:border-dark-border'}"
                            on:click={() => activeTab = 'trades'}
                        >
                            Trades
                        </button>
                        <button
                            class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'transactions' ? 'border-theme-500 text-theme-500' : 'border-transparent text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text hover:border-light-border dark:hover:border-dark-border'}"
                            on:click={() => activeTab = 'transactions'}
                        >
                            Transactions
                        </button>
                    </nav>
                </div>

                {#if activeTab === 'trades'}
                    {#if hasTrades}
                        <!-- Filters -->
                        <TradeFilterBar 
                            bind:filters={filters}
                            on:filter={handleFilterChange}
                        />

                        {#if hasOpenTrades}
                            <!-- Open Trades -->
                            <div class="card mb-6">
                                <div class="p-4 border-b border-light-border dark:border-0">
                                    <h2 class="text-xl font-semibold text-light-text-muted dark:text-dark-text">Open Positions</h2>
                                </div>
                                <TradeTable 
                                    trades={openTrades}
                                    type="open"
                                    filters={filters}
                                    isTradesPage={true}
                                    key={JSON.stringify(filters)}
                                    on:view={handleView}
                                    on:edit={handleEdit}
                                    on:deleted={loadTrades}
                                    on:favorite={e => handleFavorite(e.detail)}
                                    on:disable={e => handleDisable(e.detail)}
                                />
                            </div>
                        {/if}

                        {#if hasClosedTrades}
                            <!-- Closed Trades -->
                            <div class="card">
                                <div class="p-4 border-b border-light-border dark:border-0">
                                    <h2 class="text-xl font-semibold text-light-text-muted dark:text-dark-text">Closed Positions</h2>
                                </div>
                                <TradeTable 
                                    trades={closedTrades}
                                    type="closed"
                                    filters={filters}
                                    isTradesPage={true}
                                    key={JSON.stringify(filters)}
                                    on:view={handleView}
                                    on:edit={handleEdit}
                                    on:deleted={loadTrades}
                                    on:favorite={e => handleFavorite(e.detail)}
                                    on:disable={e => handleDisable(e.detail)}
                                />
                            </div>
                        {/if}
                    {:else}
                        <div class="card p-8 text-center">
                            <div class="flex flex-col items-center justify-center space-y-4">
                                <svg class="w-16 h-16 text-light-text-muted dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <h2 class="text-2xl font-bold text-light-text dark:text-dark-text">No trades found</h2>
                                <p class="text-light-text-muted dark:text-dark-text-muted max-w-md">
                                    Start tracking your trades by clicking the "New Trade" button above.
                                </p>
                            </div>
                        </div>
                    {/if}
                {:else if activeTab === 'transactions'}
                    <div class="card">
                        <TransactionTable 
                            accountId={currentAccountId}
                            transactions={$transactionStore.transactions}
                            readOnly={false}
                            on:deleted={() => transactionStore.fetchTransactions(currentAccountId)}
                        />
                    </div>
                {/if}
            {:else}
                <div class="card p-16 text-center space-y-6">
                    <div class="flex flex-col items-center justify-center space-y-4">
                        <svg class="w-16 h-16 text-light-text-muted dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        <h2 class="text-2xl font-bold text-light-text dark:text-dark-text">Create an account to see your trading history</h2>
                        <p class="text-light-text-muted dark:text-dark-text-muted max-w-md">
                            Track your trades, manage your transactions, and analyze your performance with our comprehensive trading tools.
                        </p>
                        <Button variant="primary" size="sm" on:click={handleAddAccount}>
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                            </svg>
                            Add Account
                        </Button>
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div>

<!-- Modals -->
<NewAccountModal 
    bind:show={showAccountModal}
    on:close={() => showAccountModal = false}
/>

{#if $accountStore.currentAccount}
    <TradeModal
        bind:show={showEditModal}
        trade={selectedTrade}
        accountId={$accountStore.currentAccount._id}
        on:submit={handleSubmit}
        on:close={closeEditModal}
    />

    <TradeViewModal
        bind:show={showViewModal}
        trade={selectedTrade}
        on:close={closeViewModal}
    />

    <!-- Transaction Modals -->
    {#if showDepositModal}
        <Modal 
            bind:show={showDepositModal}
            title="Deposit"
        >
            <div class="space-y-4">
                <Input
                    label="Amount"
                    type="number"
                    bind:value={transactionAmount}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                />
                <Input
                    label="Date"
                    type="datetime-local"
                    bind:value={transactionDate}
                />
                <Input
                    label="Note"
                    type="text"
                    bind:value={transactionNote}
                    placeholder="Add a note..."
                />
                <div class="flex justify-end gap-2">
                    <Button variant="secondary" on:click={() => showDepositModal = false}>Cancel</Button>
                    <Button variant="primary" on:click={handleDeposit}>Deposit</Button>
                </div>
            </div>
        </Modal>
    {/if}

    {#if showWithdrawModal}
        <Modal 
            bind:show={showWithdrawModal}
            title="Withdraw"
        >
            <div class="space-y-4">
                <Input
                    label="Amount"
                    type="number"
                    bind:value={transactionAmount}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                />
                <Input
                    label="Date"
                    type="datetime-local"
                    bind:value={transactionDate}
                />
                <Input
                    label="Note"
                    type="text"
                    bind:value={transactionNote}
                    placeholder="Add a note..."
                />
                <div class="flex justify-end gap-2">
                    <Button variant="secondary" on:click={() => showWithdrawModal = false}>Cancel</Button>
                    <Button variant="primary" on:click={handleWithdraw}>Withdraw</Button>
                </div>
            </div>
        </Modal>
    {/if}
{/if}

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-0 rounded-lg shadow-lg;
    }

    :global(.bg-gradient-purple) {
        @apply bg-gradient-to-r from-theme-500 to-purple-500;
    }
</style>
