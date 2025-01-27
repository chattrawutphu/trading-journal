<script>
    import { onMount } from 'svelte';
    import { theme } from '$lib/stores/themeStore';
    import { browser } from '$app/environment';
    import Chart from 'chart.js/auto';
    import 'chartjs-adapter-date-fns';
    import { formatCurrency } from '$lib/utils/formatters';
    import { createEventDispatcher } from 'svelte';

    export let openTrades = [];
    export let closedTrades = [];
    export let height = 'auto';
    export let textSize = 'medium';
    export let isPreview = false;
    export let symbols = [];
    export let selectedSymbols = [];
    export let config = {
        showComparison: false,
        stackedView: false,
        normalizeData: false
    };

    let chartCanvas;
    let chart;
    let selectedPeriod = '30d';
    let selectedMetric = 'cumulative';
    let selectedView = 'chart';
    let showConfig = false;

    // Simplified period options
    const periods = [
        { value: '7d', label: '7D' },
        { value: '30d', label: '1M' },
        { value: '90d', label: '3M' },
        { value: '1y', label: '1Y' },
        { value: 'all', label: 'ALL' }
    ];

    // Simplified metrics with clear labels
    const metrics = [
        { value: 'cumulative', label: 'Total P&L', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
        { value: 'daily', label: 'Daily P&L', icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' }
    ];

    const dispatch = createEventDispatcher();

    function createChart() {
        if (!chartCanvas) return;

        const ctx = chartCanvas.getContext('2d');
        const isDark = $theme === 'dark';

        const data = getChartData();
        
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                    titleColor: isDark ? '#fff' : '#000',
                    bodyColor: isDark ? '#cbd5e1' : '#64748b',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: (context) => {
                            return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: selectedPeriod === '7d' ? 'day' : 
                              selectedPeriod === '30d' ? 'week' : 'month'
                    },
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: isDark ? '#94a3b8' : '#64748b',
                        maxRotation: 0
                    }
                },
                y: {
                    grid: {
                        color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                    },
                    ticks: {
                        color: isDark ? '#94a3b8' : '#64748b',
                        callback: (value) => formatCurrency(value)
                    }
                }
            }
        };

        chart = new Chart(ctx, {
            type: 'line',
            data: data,
            options: options
        });
    }

    function filterTradesByPeriod(trades) {
        if (selectedPeriod === 'all') return trades;
        
        const now = new Date();
        const cutoffDate = new Date();
        
        switch (selectedPeriod) {
            case '7d': cutoffDate.setDate(now.getDate() - 7); break;
            case '30d': cutoffDate.setDate(now.getDate() - 30); break;
            case '90d': cutoffDate.setDate(now.getDate() - 90); break;
            case '180d': cutoffDate.setDate(now.getDate() - 180); break;
            case '1y': cutoffDate.setDate(now.getDate() - 365); break;
        }
        
        return trades.filter(trade => new Date(trade.exitDate) >= cutoffDate);
    }

    function getDailyStats(trades) {
        const filteredTrades = filterTradesByPeriod(trades);
        const dailyStats = {};
        
        filteredTrades.forEach(trade => {
            const date = new Date(trade.exitDate).toISOString().split('T')[0];
            if (!dailyStats[date]) {
                dailyStats[date] = { pnl: 0, trades: [] };
            }
            dailyStats[date].pnl += trade.pnl || 0;
            dailyStats[date].trades.push(trade);
        });

        return Object.entries(dailyStats)
            .map(([date, stats]) => ({
                date,
                ...stats
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    function getCumulativeData(dailyStats) {
        let cumulative = 0;
        let minCumulative = 0;
        let maxCumulative = 0;
        
        const data = dailyStats.map(day => {
            cumulative += day.pnl;
            minCumulative = Math.min(minCumulative, cumulative);
            maxCumulative = Math.max(maxCumulative, cumulative);
            return {
                x: new Date(day.date),
                y: cumulative,
                pnl: day.pnl
            };
        });

        const range = maxCumulative - minCumulative;
        const padding = range * 0.1;

        return {
            data,
            yMin: minCumulative - padding,
            yMax: maxCumulative + padding
        };
    }

    function getDrawdownData(dailyStats) {
        let peak = 0;
        let cumulative = 0;
        return dailyStats.map(day => {
            cumulative += day.pnl;
            peak = Math.max(peak, cumulative);
            const drawdown = peak - cumulative;
            return {
                x: new Date(day.date),
                y: -drawdown // Negative to show drawdown going down
            };
        });
    }

    function updateChart() {
        if (!browser || !chartCanvas) return;

        if (chart) {
            chart.destroy();
        }

        const dailyStats = getDailyStats(closedTrades);
        let chartData;
        let yAxisConfig = {};

        switch (selectedMetric) {
            case 'cumulative': {
                const { data, yMin, yMax } = getCumulativeData(dailyStats);
                chartData = data;
                yAxisConfig = {
                    min: yMin,
                    max: yMax,
                    ticks: {
                        callback: value => formatCurrency(value)
                    }
                };
                break;
            }
            case 'daily': {
                const data = dailyStats.map(day => ({
                    x: new Date(day.date),
                    y: day.pnl
                }));
                const maxAbs = Math.max(...data.map(d => Math.abs(d.y)));
                chartData = data;
                yAxisConfig = {
                    min: -maxAbs * 1.1,
                    max: maxAbs * 1.1,
                    ticks: {
                        callback: value => formatCurrency(value)
                    }
                };
                break;
            }
            case 'drawdown': {
                chartData = getDrawdownData(dailyStats);
                const maxDrawdown = Math.max(...chartData.map(d => Math.abs(d.y)));
                yAxisConfig = {
                    min: -maxDrawdown * 1.1,
                    max: 0,
                    ticks: {
                        callback: value => formatCurrency(Math.abs(value))
                    }
                };
                break;
            }
        }

        const ctx = chartCanvas.getContext('2d');
        const textColor = $theme === 'dark' ? '#94a3b8' : '#475569';
        const gridColor = $theme === 'dark' ? 'rgba(148, 163, 184, 0.1)' : 'rgba(71, 85, 105, 0.1)';

        const config = {
            type: selectedMetric === 'daily' ? 'bar' : 'line',
            data: {
                datasets: [{
                    data: chartData,
                    backgroundColor: context => {
                        if (selectedMetric === 'daily') {
                            const value = context.raw.y;
                            return value >= 0 ? 
                                ($theme === 'dark' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.6)') :
                                ($theme === 'dark' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.6)');
                        }
                        return $theme === 'dark' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(168, 85, 247, 0.2)';
                    },
                    borderColor: selectedMetric === 'daily' ? 
                        context => {
                            const value = context.raw.y;
                            return value >= 0 ? '#22c55e' : '#ef4444';
                        } : 
                        '#a855f7',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: $theme === 'dark' ? '#1e293b' : '#ffffff',
                        titleColor: textColor,
                        bodyColor: textColor,
                        borderColor: gridColor,
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            label: context => formatCurrency(context.raw.y)
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: selectedPeriod === '7d' ? 'day' : 
                                  selectedPeriod === '30d' ? 'week' : 'month'
                        },
                        grid: { display: false },
                        ticks: { color: textColor }
                    },
                    y: {
                        ...yAxisConfig,
                        grid: {
                            color: gridColor,
                            drawBorder: false,
                            borderDash: [5, 5]
                        },
                        border: {
                            display: false
                        },
                        ticks: {
                            color: textColor,
                            ...yAxisConfig.ticks
                        }
                    }
                }
            }
        };

        chart = new Chart(ctx, config);
    }

    // Update chart when relevant variables change
    $: if (browser && chartCanvas && selectedView === 'chart' && 
           (closedTrades?.length || selectedPeriod || selectedMetric || $theme)) {
        updateChart();
    }

    $: chartHeight = typeof height === 'number' 
        ? height - 165 
        : window.innerWidth < 768 ? 300 : 'auto';

    function handleResize() {
        if (chart) {
            chart.resize();
        }
    }

    onMount(() => {
        if (!isPreview) {
            updateChart();
            window.addEventListener('resize', handleResize);
        }
        return () => {
            if (chart) {
                chart.destroy();
            }
            window.removeEventListener('resize', handleResize);
        };
    });

    $: if (browser && chartCanvas && selectedView === 'chart') {
        window.addEventListener('resize', () => {
            chartHeight = typeof height === 'number' 
                ? height - 165 
                : window.innerWidth < 768 ? 300 : 'auto';
            handleResize();
        });
    }

    // New Stats Component
    function getStats() {
        const filteredTrades = filterTradesByPeriod(closedTrades);
        const totalPnL = filteredTrades.reduce((sum, trade) => sum + trade.pnl, 0);
        const winningTrades = filteredTrades.filter(trade => trade.pnl > 0);
        const winRate = (winningTrades.length / filteredTrades.length) * 100 || 0;
        
        return {
            totalPnL,
            tradesCount: filteredTrades.length,
            winRate,
            avgWin: winningTrades.reduce((sum, trade) => sum + trade.pnl, 0) / winningTrades.length || 0,
            avgLoss: filteredTrades.filter(trade => trade.pnl <= 0)
                    .reduce((sum, trade) => sum + trade.pnl, 0) / 
                    (filteredTrades.length - winningTrades.length) || 0
        };
    }

    function toggleSymbol(symbol) {
        if (selectedSymbols.includes(symbol)) {
            selectedSymbols = selectedSymbols.filter(s => s !== symbol);
        } else {
            selectedSymbols = [...selectedSymbols, symbol];
        }
    }

    function applyConfig() {
        dispatch('updateConfig', config);
        showConfig = false;
    }
</script>

<div class="h-full flex flex-col bg-light-card dark:bg-dark-card rounded-lg overflow-hidden shadow-sm {textSize}">
    <!-- Header -->
    <div class="p-4 border-b border-light-border dark:border-dark-border bg-gradient-to-r from-theme-500/5 to-transparent dark:from-theme-500/10">
        <div class="flex items-center gap-3">
            <!-- Icon -->
            <div class="w-10 h-10 rounded-lg bg-theme-500/10 flex items-center justify-center">
                <svg class="w-6 h-6 text-theme-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" 
                          stroke-linejoin="round" 
                          stroke-width="1.5" 
                          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
            </div>

            <!-- Title -->
            <div class="flex-1">
                <h2 class="text-lg font-semibold text-light-text dark:text-dark-text">
                    Performance Chart
                </h2>
                <p class="text-sm text-light-text-muted dark:text-dark-text-muted">
                    {selectedMetric === 'cumulative' ? 'Total P&L' : 'Daily P&L'}
                </p>
            </div>

            <!-- Config Button -->
            <button 
                class="p-2 rounded-lg hover:bg-light-hover/50 dark:hover:bg-dark-hover/50"
                on:click={() => showConfig = true}
            >
                <svg class="w-5 h-5 text-light-text-muted dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
                </svg>
            </button>
        </div>

        <!-- Controls -->
        <div class="flex items-center justify-between mt-4">
            <!-- Left: Period Controls -->
            <div class="flex rounded-lg bg-light-background/50 dark:bg-dark-background/50 p-0.5">
                {#each periods as period}
                    <button 
                        class="px-2 py-0.5 text-xs font-medium rounded-md transition-all
                               {selectedPeriod === period.value ? 
                                'bg-theme-500 text-white' : 
                                'text-light-text-muted dark:text-dark-text-muted hover:bg-theme-500/10'}"
                        on:click={() => selectedPeriod = period.value}
                    >
                        {period.label}
                    </button>
                {/each}
            </div>

            <!-- Right: Stats & View Toggle -->
            <div class="flex items-center gap-4">
                <!-- Stats Summary -->
                {#if !isPreview}
                    {@const stats = getStats()}
                    <div class="flex items-center gap-4 px-3 py-1 rounded-lg bg-light-background/50 dark:bg-dark-background/50">
                        <div>
                            <div class="text-sm font-bold {stats.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}">
                                {formatCurrency(stats.totalPnL)}
                            </div>
                            <div class="text-xs text-light-text-muted dark:text-dark-text-muted">
                                Win Rate: {stats.winRate.toFixed(1)}%
                            </div>
                        </div>
                    </div>
                {/if}

                <!-- View Toggle -->
                <div class="flex rounded-lg bg-light-background/50 dark:bg-dark-background/50 p-0.5">
                    {#each metrics as metric}
                        <button 
                            class="px-2 py-0.5 text-xs font-medium rounded-md transition-all
                                   {selectedMetric === metric.value ? 
                                    'bg-theme-500 text-white' : 
                                    'text-light-text-muted dark:text-dark-text-muted hover:bg-theme-500/10'}"
                            on:click={() => selectedMetric = metric.value}
                        >
                            {metric.label}
                        </button>
                    {/each}
                </div>
            </div>
        </div>
    </div>

    <!-- Chart Area -->
    <div class="flex-1 p-4">
        <div class="w-full h-full">
            <canvas bind:this={chartCanvas}></canvas>
        </div>
    </div>
</div>

<!-- Config Modal -->
{#if showConfig}
    <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="bg-light-card dark:bg-dark-card rounded-xl shadow-xl w-full max-w-md">
            <div class="p-4 border-b border-light-border dark:border-dark-border">
                <h3 class="text-lg font-semibold text-light-text dark:text-dark-text">
                    Chart Settings
                </h3>
            </div>
            
            <div class="p-4 space-y-4">
                <!-- Compare Mode -->
                <div class="flex items-center justify-between">
                    <span class="text-sm text-light-text dark:text-dark-text">Compare Symbols</span>
                    <button 
                        class="px-3 py-1 rounded-lg text-xs font-medium
                               {config.showComparison ? 
                                'bg-theme-500 text-white' : 
                                'bg-light-background/50 dark:bg-dark-background/50 text-light-text-muted dark:text-dark-text-muted'}"
                        on:click={() => config.showComparison = !config.showComparison}
                    >
                        {config.showComparison ? 'On' : 'Off'}
                    </button>
                </div>

                <!-- Symbol Selector (when comparison is on) -->
                {#if config.showComparison}
                    <div class="space-y-2">
                        <span class="text-sm text-light-text-muted dark:text-dark-text-muted">Select Symbols to Compare</span>
                        <div class="grid grid-cols-2 gap-2">
                            {#each symbols as symbol}
                                <button 
                                    class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                                           {selectedSymbols.includes(symbol) ? 
                                            'bg-theme-500 text-white' : 
                                            'bg-light-background/50 dark:bg-dark-background/50 text-light-text-muted dark:text-dark-text-muted'}"
                                    on:click={() => toggleSymbol(symbol)}
                                >
                                    {symbol}
                                </button>
                            {/each}
                        </div>
                    </div>

                    <!-- View Options -->
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-light-text dark:text-dark-text">Stacked View</span>
                            <button 
                                class="px-3 py-1 rounded-lg text-xs font-medium
                                       {config.stackedView ? 
                                        'bg-theme-500 text-white' : 
                                        'bg-light-background/50 dark:bg-dark-background/50 text-light-text-muted dark:text-dark-text-muted'}"
                                on:click={() => config.stackedView = !config.stackedView}
                            >
                                {config.stackedView ? 'On' : 'Off'}
                            </button>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-light-text dark:text-dark-text">Normalize Data</span>
                            <button 
                                class="px-3 py-1 rounded-lg text-xs font-medium
                                       {config.normalizeData ? 
                                        'bg-theme-500 text-white' : 
                                        'bg-light-background/50 dark:bg-dark-background/50 text-light-text-muted dark:text-dark-text-muted'}"
                                on:click={() => config.normalizeData = !config.normalizeData}
                            >
                                {config.normalizeData ? 'On' : 'Off'}
                            </button>
                        </div>
                    </div>
                {/if}
            </div>

            <div class="p-4 border-t border-light-border dark:border-dark-border flex justify-end gap-2">
                <button 
                    class="px-4 py-2 rounded-lg text-sm font-medium bg-light-background/50 dark:bg-dark-background/50 text-light-text-muted dark:text-dark-text-muted"
                    on:click={() => showConfig = false}
                >
                    Cancel
                </button>
                <button 
                    class="px-4 py-2 rounded-lg text-sm font-medium bg-theme-500 text-white"
                    on:click={applyConfig}
                >
                    Apply
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    .h-full {
        height: 100%;
        min-height: 400px;
    }

    canvas {
        width: 100% !important;
        height: 100% !important;
    }
</style>
