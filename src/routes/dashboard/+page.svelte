<!-- src/routes/dashboard/+page.svelte -->
<script>
    import { onMount } from 'svelte';
    import { accountStore } from '$lib/stores/accountStore';
    import TradingStats from '$lib/components/dashboard/TradingStats.svelte';
    import TradeChart from '$lib/components/dashboard/TradeChart.svelte';
    import Loading from '$lib/components/common/Loading.svelte';
    import { api } from '$lib/utils/api';
  
    let loading = false;
    let error = '';
    let openTrades = [];
    let closedTrades = [];
  
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
        
        const response = await api.getTrades($accountStore.currentAccount._id);
        openTrades = response.filter(trade => trade.status === 'OPEN');
        closedTrades = response.filter(trade => trade.status === 'CLOSED');
      } catch (err) {
        error = err.message;
      } finally {
        loading = false;
      }
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
      <h1 class="text-4xl font-bold gradient-text">Dashboard</h1>
    </div>

    {#if loading}
        <Loading message="Loading data..." overlay={true} />
    {:else if $accountStore.currentAccount}
        <!-- Stats -->
        <TradingStats />

        <!-- Performance Chart -->
        <div class="bg-slate-800 p-6 rounded-lg shadow-lg">
            <h2 class="text-2xl font-bold gradient-text mb-4">Performance Chart</h2>
            <TradeChart {openTrades} {closedTrades} />
        </div>

        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <!-- Win Rate -->
            <div class="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h3 class="text-lg font-semibold text-slate-300 mb-2">Win Rate</h3>
                <p class="text-3xl font-bold text-green-500">
                    {closedTrades.length > 0 
                        ? Math.round((closedTrades.filter(t => t.pnl > 0).length / closedTrades.length) * 100)
                        : 0}%
                </p>
            </div>

            <!-- Total Trades -->
            <div class="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h3 class="text-lg font-semibold text-slate-300 mb-2">Total Trades</h3>
                <p class="text-3xl font-bold text-blue-500">
                    {openTrades.length + closedTrades.length}
                </p>
            </div>

            <!-- Open Positions -->
            <div class="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h3 class="text-lg font-semibold text-slate-300 mb-2">Open Positions</h3>
                <p class="text-3xl font-bold text-yellow-500">
                    {openTrades.length}
                </p>
            </div>

            <!-- Total P&L -->
            <div class="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h3 class="text-lg font-semibold text-slate-300 mb-2">Total P&L</h3>
                <p class="text-3xl font-bold {closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) >= 0 ? 'text-green-500' : 'text-red-500'}">
                    ${closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0).toFixed(2)}
                </p>
            </div>
        </div>
    {:else}
        <div class="text-center text-slate-400 py-8">
            Create an account to see your trading statistics
        </div>
    {/if}
</div>
  
<style>
    .gradient-text {
      background: linear-gradient(45deg, #3b82f6, #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
</style>
