<!-- src/routes/trades/+page.svelte -->
<script>
    import { onMount } from 'svelte';
    import { accountStore } from '$lib/stores/accountStore';
    import TradeFilters from '$lib/components/trades/TradeFilters.svelte';
    import TradeTable from '$lib/components/trades/TradeTable.svelte';
    import TradeModal from '$lib/components/trades/TradeModal.svelte';
    import Loading from '$lib/components/common/Loading.svelte';
    import Button from '$lib/components/common/Button.svelte';
    import { api } from '$lib/utils/api';
  
    let showTradeModal = false;
    let selectedTrade = null;
    let filters = {
      startDate: '',
      endDate: '',
      symbol: '',
      filterType: 'all',
      itemsPerPage: '10'
    };
  
    let openTrades = [];
    let closedTrades = [];
    let loading = false;
    let error = '';
  
    $: if ($accountStore.currentAccount) {
      loadTrades();
    }
  
    onMount(() => {
      accountStore.loadAccounts();
    });
  
    async function loadTrades() {
      try {
        loading = true;
        error = '';
        
        const response = await api.getTrades($accountStore.currentAccount._id, filters);
        openTrades = response.filter(trade => trade.status === 'OPEN');
        closedTrades = response.filter(trade => trade.status === 'CLOSED');
      } catch (err) {
        error = err.message;
      } finally {
        loading = false;
      }
    }
  
    async function handleTradeAction(event) {
      const { action, tradeId } = event.detail;
      
      try {
        switch (action) {
          case 'view':
            selectedTrade = openTrades.concat(closedTrades).find(t => t._id === tradeId);
            showTradeModal = true;
            break;
            
          case 'edit':
            selectedTrade = openTrades.concat(closedTrades).find(t => t._id === tradeId);
            showTradeModal = true;
            break;
            
          case 'duplicate':
            const tradeToDuplicate = openTrades.concat(closedTrades).find(t => t._id === tradeId);
            if (tradeToDuplicate) {
              const { _id, exitDate, exitPrice, exitReason, ...rest } = tradeToDuplicate;
              selectedTrade = { ...rest, status: 'OPEN' };
              showTradeModal = true;
            }
            break;
            
          case 'delete':
            if (confirm('Are you sure you want to delete this trade?')) {
              await api.deleteTrade(tradeId);
              await loadTrades();
            }
            break;
            
          case 'favorite':
            await api.toggleFavorite(tradeId);
            await loadTrades();
            break;
            
          case 'toggle-disable':
            await api.toggleDisabled(tradeId);
            await loadTrades();
            break;
        }
      } catch (err) {
        error = err.message;
      }
    }
  
    async function handleTradeSubmit(event) {
      try {
        const tradeData = event.detail;
        
        if (selectedTrade?._id) {
          await api.updateTrade(selectedTrade._id, tradeData);
        } else {
          await api.createTrade({
            ...tradeData,
            account: $accountStore.currentAccount._id
          });
        }
        
        showTradeModal = false;
        selectedTrade = null;
        await loadTrades();
      } catch (err) {
        error = err.message;
      }
    }
  
    function handleFilterChange() {
      loadTrades();
    }
</script>
  
<div class="space-y-8 p-8">
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
        <h1 class="text-4xl font-bold bg-gradient-purple bg-clip-text text-transparent">Trade History</h1>
        {#if $accountStore.currentAccount}
            <Button 
                variant="primary"
                icon='<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>'
                on:click={() => {
                    selectedTrade = null;
                    showTradeModal = true;
                }}
            >
                New Trade
            </Button>
        {:else}
            <div class="text-light-text-muted dark:text-dark-text-muted">Create an account to start trading</div>
        {/if}
    </div>

    {#if loading}
        <Loading message="Loading trades..." overlay={true} />
    {:else}
        <!-- Filters -->
        {#if $accountStore.currentAccount}
            <TradeFilters
                bind:filters
                on:filter={handleFilterChange}
            />
        {/if}
      
        <!-- Open Positions -->
        {#if openTrades.length > 0}
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <h2 class="text-xl font-semibold text-light-text dark:text-dark-text">Open Positions</h2>
                    <span class="text-sm text-light-text-muted dark:text-dark-text-muted">{openTrades.length} trades</span>
                </div>
                <TradeTable
                    trades={openTrades}
                    type="open"
                    on:action={handleTradeAction}
                />
            </div>
        {/if}
      
        <!-- Closed Trades -->
        {#if closedTrades.length > 0}
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <h2 class="text-xl font-semibold text-light-text dark:text-dark-text">Closed Trades</h2>
                    <span class="text-sm text-light-text-muted dark:text-dark-text-muted">{closedTrades.length} trades</span>
                </div>
                <TradeTable
                    trades={closedTrades}
                    type="closed"
                    on:action={handleTradeAction}
                />
            </div>
        {/if}

        <!-- Empty State -->
        {#if openTrades.length === 0 && closedTrades.length === 0}
            <div class="card p-8 text-center">
                <div class="flex flex-col items-center space-y-4">
                    <div class="w-16 h-16 rounded-full bg-theme-500 bg-opacity-10 flex items-center justify-center">
                        <svg class="w-8 h-8 text-theme-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                        </svg>
                    </div>
                    <div class="space-y-2">
                        <h3 class="text-lg font-medium text-light-text dark:text-dark-text">No trades yet</h3>
                        <p class="text-light-text-muted dark:text-dark-text-muted">Start by adding your first trade</p>
                    </div>
                    <Button 
                        variant="primary"
                        on:click={() => {
                            selectedTrade = null;
                            showTradeModal = true;
                        }}
                    >
                        Add Trade
                    </Button>
                </div>
            </div>
        {/if}
    {/if}
  
    <!-- Trade Modal -->
    {#if $accountStore.currentAccount}
        <TradeModal
            show={showTradeModal}
            trade={selectedTrade}
            accountId={$accountStore.currentAccount._id}
            on:submit={handleTradeSubmit}
            on:close={() => {
                showTradeModal = false;
                selectedTrade = null;
            }}
        />
    {/if}
</div>

<style>
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-lg transition-colors duration-200;
    }
</style>
