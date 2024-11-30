<!-- src/routes/analytics/+page.svelte -->
<script>
    import { onMount } from 'svelte';
    import { accountStore } from '$lib/stores/accountStore';
    import Loading from '$lib/components/common/Loading.svelte';
    import { api } from '$lib/utils/api';
    import TradeChart from '$lib/components/dashboard/TradeChart.svelte';

    let loading = false;
    let error = '';
    let trades = [];
    let selectedPeriod = '30'; // days

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
            trades = response;
            calculateMetrics();
        } catch (err) {
            error = err.message;
        } finally {
            loading = false;
        }
    }

    let metrics = {
        profitFactor: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
        expectancy: 0,
        consistency: 0
    };

    function calculateMetrics() {
        const closedTrades = trades.filter(t => t.status === 'CLOSED');
        if (closedTrades.length === 0) return;

        // Win Rate
        const winningTrades = closedTrades.filter(t => t.pnl > 0);
        metrics.winRate = (winningTrades.length / closedTrades.length) * 100;

        // Average Win/Loss
        metrics.avgWin = winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length;
        const losingTrades = closedTrades.filter(t => t.pnl <= 0);
        metrics.avgLoss = losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length;

        // Profit Factor
        const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
        const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
        metrics.profitFactor = grossProfit / grossLoss;

        // Expectancy
        metrics.expectancy = (metrics.winRate/100 * metrics.avgWin) + ((1-metrics.winRate/100) * metrics.avgLoss);

        // Maximum Drawdown
        let peak = 0;
        let maxDrawdown = 0;
        let runningPnL = 0;
        closedTrades.forEach(trade => {
            runningPnL += trade.pnl;
            if (runningPnL > peak) peak = runningPnL;
            const drawdown = peak - runningPnL;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        });
        metrics.maxDrawdown = maxDrawdown;

        // Trading Consistency (standard deviation of daily returns)
        const dailyReturns = {};
        closedTrades.forEach(trade => {
            const date = new Date(trade.exitDate).toLocaleDateString();
            dailyReturns[date] = (dailyReturns[date] || 0) + trade.pnl;
        });
        const returns = Object.values(dailyReturns);
        const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        metrics.consistency = Math.sqrt(variance);
    }

    const periodOptions = [
        { value: '7', label: 'Last 7 Days' },
        { value: '30', label: 'Last 30 Days' },
        { value: '90', label: 'Last 90 Days' },
        { value: '180', label: 'Last 180 Days' },
        { value: '365', label: 'Last Year' }
    ];
</script>

<div class="space-y-8 p-8">
    {#if error}
        <div class="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-2 rounded">
            {error}
        </div>
    {/if}

    <!-- Header -->
    <div class="flex justify-between items-center">
        <h1 class="text-4xl font-bold gradient-text">Advanced Analytics</h1>
        <select
            bind:value={selectedPeriod}
            class="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
        >
            {#each periodOptions as option}
                <option value={option.value}>{option.label}</option>
            {/each}
        </select>
    </div>

    {#if loading}
        <Loading message="Loading analytics..." overlay={true} />
    {:else if $accountStore.currentAccount}
        <!-- Key Metrics -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <!-- Profit Factor -->
            <div class="bg-slate-800 p-6 rounded-lg shadow-lg">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="text-lg font-semibold text-slate-300">Profit Factor</h3>
                    <button class="text-slate-400 hover:text-white" title="Gross profit divided by gross loss. Higher is better.">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </div>
                <p class="text-3xl font-bold text-blue-500">
                    {metrics.profitFactor.toFixed(2)}
                </p>
            </div>

            <!-- Win Rate -->
            <div class="bg-slate-800 p-6 rounded-lg shadow-lg">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="text-lg font-semibold text-slate-300">Win Rate</h3>
                    <button class="text-slate-400 hover:text-white" title="Percentage of winning trades">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </div>
                <p class="text-3xl font-bold text-green-500">
                    {metrics.winRate.toFixed(1)}%
                </p>
            </div>

            <!-- Expectancy -->
            <div class="bg-slate-800 p-6 rounded-lg shadow-lg">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="text-lg font-semibold text-slate-300">Expectancy</h3>
                    <button class="text-slate-400 hover:text-white" title="Average expected profit/loss per trade">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </div>
                <p class="text-3xl font-bold {metrics.expectancy >= 0 ? 'text-green-500' : 'text-red-500'}">
                    ${metrics.expectancy.toFixed(2)}
                </p>
            </div>

            <!-- Max Drawdown -->
            <div class="bg-slate-800 p-6 rounded-lg shadow-lg">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="text-lg font-semibold text-slate-300">Max Drawdown</h3>
                    <button class="text-slate-400 hover:text-white" title="Largest peak-to-trough decline">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </div>
                <p class="text-3xl font-bold text-red-500">
                    ${metrics.maxDrawdown.toFixed(2)}
                </p>
            </div>
        </div>

        <!-- Trade Analysis -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Average Win vs Loss -->
            <div class="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h3 class="text-xl font-bold text-slate-300 mb-4">Average Win vs Loss</h3>
                <div class="space-y-4">
                    <div class="flex justify-between items-center">
                        <span class="text-slate-400">Average Win</span>
                        <span class="text-green-500 font-bold">${metrics.avgWin.toFixed(2)}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-slate-400">Average Loss</span>
                        <span class="text-red-500 font-bold">${Math.abs(metrics.avgLoss).toFixed(2)}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-slate-400">Risk/Reward Ratio</span>
                        <span class="text-blue-500 font-bold">
                            {(Math.abs(metrics.avgWin / metrics.avgLoss)).toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Trading Consistency -->
            <div class="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h3 class="text-xl font-bold text-slate-300 mb-4">Trading Consistency</h3>
                <div class="space-y-4">
                    <div class="flex justify-between items-center">
                        <span class="text-slate-400">Volatility Score</span>
                        <span class="text-purple-500 font-bold">{metrics.consistency.toFixed(2)}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-slate-400">Largest Win</span>
                        <span class="text-green-500 font-bold">
                            ${Math.max(...trades.filter(t => t.pnl > 0).map(t => t.pnl), 0).toFixed(2)}
                        </span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-slate-400">Largest Loss</span>
                        <span class="text-red-500 font-bold">
                            ${Math.abs(Math.min(...trades.filter(t => t.pnl < 0).map(t => t.pnl), 0)).toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Performance Chart -->
        <div class="bg-slate-800 p-6 rounded-lg shadow-lg">
            <h3 class="text-xl font-bold text-slate-300 mb-4">Cumulative Performance</h3>
            <TradeChart trades={trades} />
        </div>

        <!-- Trading Patterns -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Time Analysis -->
            <div class="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h3 class="text-xl font-bold text-slate-300 mb-4">Trading Session Analysis</h3>
                <div class="space-y-4">
                    {#each ['Morning', 'Afternoon', 'Evening'] as session}
                        <div class="flex justify-between items-center">
                            <span class="text-slate-400">{session} Session</span>
                            <span class="text-blue-500 font-bold">
                                {trades.filter(t => {
                                    const hour = new Date(t.entryDate).getHours();
                                    return (
                                        (session === 'Morning' && hour >= 4 && hour < 12) ||
                                        (session === 'Afternoon' && hour >= 12 && hour < 20) ||
                                        (session === 'Evening' && (hour >= 20 || hour < 4))
                                    );
                                }).length} trades
                            </span>
                        </div>
                    {/each}
                </div>
            </div>

            <!-- Strategy Performance -->
            <div class="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h3 class="text-xl font-bold text-slate-300 mb-4">Strategy Performance</h3>
                <div class="space-y-4">
                    {#each [...new Set(trades.map(t => t.strategy))].filter(Boolean) as strategy}
                        {@const strategyTrades = trades.filter(t => t.strategy === strategy)}
                        <div class="flex justify-between items-center">
                            <span class="text-slate-400">{strategy}</span>
                            <span class="text-blue-500 font-bold">
                                Win Rate: {((strategyTrades.filter(t => t.pnl > 0).length / strategyTrades.length) * 100).toFixed(1)}%
                            </span>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    {:else}
        <div class="text-center text-slate-400 py-8">
            Create an account to see your trading analytics
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
