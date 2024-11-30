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
      <div class="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-2 rounded">
        {error}
      </div>
    {/if}
  
    <!-- Header -->
    <div class="flex justify-between items-center">
      <h1 class="text-4xl font-bold gradient-text">Trade History</h1>
      {#if $accountStore.currentAccount}
        <Button on:click={() => {
          selectedTrade = null;
          showTradeModal = true;
        }}>
          <i class="fas fa-plus mr-2"></i> New Trade
        </Button>
      {:else}
        <div class="text-slate-400">Create an account to start trading</div>
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
          <div>
            <h2 class="text-2xl font-bold gradient-text mb-4">Open Positions</h2>
            <TradeTable
              trades={openTrades}
              type="open"
              on:action={handleTradeAction}
            />
          </div>
        {/if}
      
        <!-- Closed Trades -->
        {#if closedTrades.length > 0}
          <div>
            <h2 class="text-2xl font-bold gradient-text mb-4">Closed Trades</h2>
            <TradeTable
              trades={closedTrades}
              type="closed"
              on:action={handleTradeAction}
            />
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
    .gradient-text {
      background: linear-gradient(45deg, #3b82f6, #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
</style>
