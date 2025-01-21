<script>
    import { onMount } from 'svelte';
    import { accountStore } from '$lib/stores/accountStore';
    import TradeChart from '$lib/components/dashboard/TradeChart.svelte';
    import Select from '$lib/components/common/Select.svelte';
    import Loading from '$lib/components/common/Loading.svelte';
    import Button from '$lib/components/common/Button.svelte';
    import NewAccountModal from '$lib/components/accounts/NewAccountModal.svelte';
    import { api } from '$lib/utils/api';
    import { loadingStore } from '$lib/stores/loadingStore'; // Import loading store

    let initialLoad = true;
    let error = '';
    let openTrades = [];
    let closedTrades = [];
    let selectedPeriod = '30';
    let dataLoaded = false;
    let showAccountModal = false;
    let currentAccountId = null;

    const periods = [
        { value: '7', label: 'Last 7 Days' },
        { value: '30', label: 'Last 30 Days' },
        { value: '90', label: 'Last 90 Days' },
        { value: '180', label: 'Last 180 Days' },
        { value: '365', label: 'Last Year' },
        { value: 'all', label: 'All Time' }
    ];

    onMount(async () => {
        try {
            const account = await accountStore.loadAccounts();
            if (account) {
                await loadTrades();
            }
        } catch (err) {
            error = err.message;
        } finally {
            initialLoad = false;
        }
    });

    async function loadTrades() {
        if (!$accountStore.currentAccount) return;
        
        try {
            loadingStore.set(true); // Set loading to true
            dataLoaded = false;
            error = '';
            
            const response = await api.getTrades($accountStore.currentAccount._id);
            openTrades = response.filter(trade => trade.status === 'OPEN');
            closedTrades = response.filter(trade => trade.status === 'CLOSED');
            dataLoaded = true;
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

    function handleAddAccount() {
        showAccountModal = true;
    }

    // Calculate metrics
    $: totalTrades = closedTrades.length;
    $: winningTrades = closedTrades.filter(t => t.pnl > 0).length;
    $: winRate = totalTrades > 0 ? (winningTrades / totalTrades * 100).toFixed(1) : 0;
    $: profitFactor = (() => {
        const gains = closedTrades.reduce((sum, t) => sum + (t.pnl > 0 ? t.pnl : 0), 0);
        const losses = Math.abs(closedTrades.reduce((sum, t) => sum + (t.pnl < 0 ? t.pnl : 0), 0));
        return losses > 0 ? (gains / losses).toFixed(2) : '0.00';
    })();
    $: expectancy = (() => {
        if (totalTrades === 0) return '$0.00';
        const totalPnL = closedTrades.reduce((sum, t) => sum + t.pnl, 0);
        return `$${(totalPnL / totalTrades).toFixed(2)}`;
    })();
    $: maxDrawdown = (() => {
        let peak = 0;
        let maxDrawdown = 0;
        let runningPnL = 0;
        
        closedTrades.forEach(trade => {
            runningPnL += trade.pnl;
            if (runningPnL > peak) peak = runningPnL;
            const drawdown = peak - runningPnL;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        });
        
        return `$${maxDrawdown.toFixed(2)}`;
    })();

    // Trading session analysis
    $: tradingSessions = {
        morning: closedTrades.filter(t => {
            const hour = new Date(t.entryDate).getHours();
            return hour >= 6 && hour < 12;
        }).length,
        afternoon: closedTrades.filter(t => {
            const hour = new Date(t.entryDate).getHours();
            return hour >= 12 && hour < 18;
        }).length,
        evening: closedTrades.filter(t => {
            const hour = new Date(t.entryDate).getHours();
            return hour >= 18 || hour < 6;
        }).length
    };

    $: showLoading = $loadingStore || initialLoad || !dataLoaded;
</script>

<div class="space-y-8 p-8">
    {#if $loadingStore}
        <Loading message="Loading..." overlay={true} />
    {/if}

    <div class="transition-opacity duration-200" class:opacity-0={$loadingStore}>
        <!-- Header -->
        <div class="flex justify-between items-center">
            <h1 class="text-4xl font-bold bg-gradient-purple bg-clip-text text-transparent">Advanced Analytics</h1>
            {#if $accountStore.currentAccount}
                <Select
                    options={periods}
                    bind:value={selectedPeriod}
                    class="w-40"
                />
            {/if}
        </div>

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

        {#if $accountStore.currentAccount}
            <!-- Key Metrics -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div class="card p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Profit Factor</h3>
                        <div class="w-10 h-10 rounded-full bg-theme-500 bg-opacity-10 flex items-center justify-center">
                            <svg class="w-5 h-5 text-theme-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                            </svg>
                        </div>
                    </div>
                    <p class="text-3xl font-bold text-light-text dark:text-dark-text">{profitFactor}</p>
                </div>

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

                <div class="card p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Expectancy</h3>
                        <div class="w-10 h-10 rounded-full bg-theme-500 bg-opacity-10 flex items-center justify-center">
                            <svg class="w-5 h-5 text-theme-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                    </div>
                    <p class="text-3xl font-bold text-light-text dark:text-dark-text">{expectancy}</p>
                </div>

                <div class="card p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Max Drawdown</h3>
                        <div class="w-10 h-10 rounded-full bg-red-500 bg-opacity-10 flex items-center justify-center">
                            <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/>
                            </svg>
                        </div>
                    </div>
                    <p class="text-3xl font-bold text-light-text dark:text-dark-text">{maxDrawdown}</p>
                </div>
            </div>

            <!-- Trading Performance -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Average Win vs Loss -->
                <div class="card p-6">
                    <h3 class="text-lg font-semibold text-light-text dark:text-dark-text mb-4">Average Win vs Loss</h3>
                    <div class="space-y-4">
                        <div class="flex justify-between items-center">
                            <span class="text-light-text-muted dark:text-dark-text-muted">Average Win</span>
                            <span class="text-green-500 font-medium">
                                ${(closedTrades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0) / winningTrades || 0).toFixed(2)}
                            </span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-light-text-muted dark:text-dark-text-muted">Average Loss</span>
                            <span class="text-red-500 font-medium">
                                ${(Math.abs(closedTrades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0) / (totalTrades - winningTrades)) || 0).toFixed(2)}
                            </span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-light-text-muted dark:text-dark-text-muted">Risk/Reward Ratio</span>
                            <span class="text-theme-500 font-medium">
                                {((closedTrades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0) / winningTrades) / 
                                Math.abs(closedTrades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0) / (totalTrades - winningTrades)) || 0).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Trading Consistency -->
                <div class="card p-6">
                    <h3 class="text-lg font-semibold text-light-text dark:text-dark-text mb-4">Trading Consistency</h3>
                    <div class="space-y-4">
                        <div class="flex justify-between items-center">
                            <span class="text-light-text-muted dark:text-dark-text-muted">Volatility Score</span>
                            <span class="text-theme-500 font-medium">
                                {(Math.sqrt(closedTrades.reduce((sum, t) => sum + Math.pow(t.pnl, 2), 0) / totalTrades) || 0).toFixed(2)}
                            </span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-light-text-muted dark:text-dark-text-muted">Largest Win</span>
                            <span class="text-green-500 font-medium">
                                ${Math.max(...closedTrades.map(t => t.pnl), 0).toFixed(2)}
                            </span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-light-text-muted dark:text-dark-text-muted">Largest Loss</span>
                            <span class="text-red-500 font-medium">
                                ${Math.abs(Math.min(...closedTrades.map(t => t.pnl), 0)).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Cumulative Performance -->
            <div class="card p-6">
                <h3 class="text-lg font-semibold text-light-text dark:text-dark-text mb-4">Cumulative Performance</h3>
                <TradeChart {openTrades} {closedTrades} />
            </div>

            <!-- Trading Session Analysis -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="card p-6">
                    <h3 class="text-lg font-semibold text-light-text dark:text-dark-text mb-4">Trading Session Analysis</h3>
                    <div class="space-y-4">
                        <div class="flex justify-between items-center">
                            <span class="text-light-text-muted dark:text-dark-text-muted">Morning Session</span>
                            <span class="text-theme-500 font-medium">{tradingSessions.morning} trades</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-light-text-muted dark:text-dark-text-muted">Afternoon Session</span>
                            <span class="text-theme-500 font-medium">{tradingSessions.afternoon} trades</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-light-text-muted dark:text-dark-text-muted">Evening Session</span>
                            <span class="text-theme-500 font-medium">{tradingSessions.evening} trades</span>
                        </div>
                    </div>
                </div>

                <!-- Strategy Performance -->
                <div class="card p-6">
                    <h3 class="text-lg font-semibold text-light-text dark:text-dark-text mb-4">Strategy Performance</h3>
                    <div class="flex items-center justify-center h-[200px] text-light-text-muted dark:text-dark-text-muted">
                        Coming Soon
                    </div>
                </div>
            </div>
        {:else}
            <div class="card p-16 text-center space-y-6">
                <div class="flex flex-col items-center justify-center space-y-4">
                    <svg class="w-16 h-16 text-light-text-muted dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <h2 class="text-2xl font-bold text-light-text dark:text-dark-text">Create an account to see your trading statistics</h2>
                    <p class="text-light-text-muted dark:text-dark-text-muted max-w-md">
                        Track your performance, analyze your trades, and improve your trading strategy with our advanced analytics tools.
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

<!-- Modals -->
<NewAccountModal 
    bind:show={showAccountModal}
    on:close={() => showAccountModal = false}
/>

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-0 rounded-lg shadow-lg ;
    }
</style>
