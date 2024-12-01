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

    $: totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    $: winRate = closedTrades.length > 0 
        ? Math.round((closedTrades.filter(t => t.pnl > 0).length / closedTrades.length) * 100)
        : 0;
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
        <h1 class="text-4xl font-bold bg-gradient-purple bg-clip-text text-transparent">Dashboard</h1>
    </div>

    {#if loading}
        <Loading message="Loading data..." overlay={true} />
    {:else if $accountStore.currentAccount}
        <!-- Stats -->
        <TradingStats />

        <!-- Performance Chart -->
        <TradeChart {openTrades} {closedTrades} />

        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <!-- Win Rate -->
            <div class="card p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Win Rate</h3>
                    <div class="w-10 h-10 rounded-full bg-green-500 bg-opacity-10 flex items-center justify-center">
                        <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                        </svg>
                    </div>
                </div>
                <p class="text-3xl font-bold text-light-text dark:text-dark-text">{winRate}%</p>
            </div>

            <!-- Total Trades -->
            <div class="card p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Total Trades</h3>
                    <div class="w-10 h-10 rounded-full bg-theme-500 bg-opacity-10 flex items-center justify-center">
                        <svg class="w-5 h-5 text-theme-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                        </svg>
                    </div>
                </div>
                <p class="text-3xl font-bold text-light-text dark:text-dark-text">
                    {openTrades.length + closedTrades.length}
                </p>
            </div>

            <!-- Open Positions -->
            <div class="card p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Open Positions</h3>
                    <div class="w-10 h-10 rounded-full bg-yellow-500 bg-opacity-10 flex items-center justify-center">
                        <svg class="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                </div>
                <p class="text-3xl font-bold text-light-text dark:text-dark-text">
                    {openTrades.length}
                </p>
            </div>

            <!-- Total P&L -->
            <div class="card p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Total P&L</h3>
                    <div class="w-10 h-10 rounded-full {totalPnL >= 0 ? 'bg-green-500' : 'bg-red-500'} bg-opacity-10 flex items-center justify-center">
                        <svg class="w-5 h-5 {totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                </div>
                <p class="text-3xl font-bold {totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}">
                    ${totalPnL.toFixed(2)}
                </p>
            </div>
        </div>
    {:else}
        <div class="card p-8 text-center">
            <p class="text-light-text-muted dark:text-dark-text-muted">
                Create an account to see your trading statistics
            </p>
        </div>
    {/if}
</div>
  
<style>
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-lg transition-colors duration-200;
    }
</style>
