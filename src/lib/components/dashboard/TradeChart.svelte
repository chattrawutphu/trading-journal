<script>
    import { onMount, onDestroy } from 'svelte';
    import { theme } from '$lib/stores/themeStore';
    import { browser } from '$app/environment';
    import Chart from 'chart.js/auto';
    import 'chartjs-adapter-date-fns';

    export let openTrades = [];
    export let closedTrades = [];
    export let height = 'auto';
    export let textSize = 'medium';
    export let isPreview = false;

    let chartCanvas;
    let chart;
    let selectedPeriod = '30d';
    let selectedMetric = 'cumulative';
    let selectedView = 'chart';
    let containerRef = null;

    const periods = [
        { value: '7d', label: '7D' },
        { value: '30d', label: '30D' },
        { value: '90d', label: '90D' },
        { value: '180d', label: '180D' },
        { value: '1y', label: '1Y' },
        { value: 'all', label: 'ALL' }
    ];

    const metrics = [
        { value: 'cumulative', label: 'Cumulative P&L' },
        { value: 'daily', label: 'Daily P&L' },
        { value: 'drawdown', label: 'Drawdown' }
    ];

    const views = [
        { value: 'chart', label: 'Chart', icon: 'chart-line' },
        { value: 'stats', label: 'Stats', icon: 'chart-bar' }
    ];

    function formatCurrency(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    }

    function getStats(trades) {
        if (!trades || !trades.length) {
            return {
                totalPnL: 0,
                winCount: 0,
                lossCount: 0,
                winRate: 0,
                profitFactor: 0,
                maxDrawdown: 0,
                avgWin: 0,
                avgLoss: 0,
                largestWin: 0,
                largestLoss: 0
            };
        }
        
        const filteredTrades = filterTradesByPeriod(trades);
        
        // Basic stats
        const winningTrades = filteredTrades.filter(t => t.pnl > 0);
        const losingTrades = filteredTrades.filter(t => t.pnl < 0);
        const totalPnL = filteredTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const winCount = winningTrades.length;
        const lossCount = losingTrades.length;
        const winRate = filteredTrades.length ? (winCount / filteredTrades.length) * 100 : 0;
        
        // Profit factor (sum of profits / sum of losses)
        const totalProfit = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));
        const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;
        
        // Calculate max drawdown
        const dailyStats = getDailyStats(filteredTrades);
        const drawdownData = getDrawdownData(dailyStats);
        const maxDrawdown = drawdownData.length ? Math.max(...drawdownData.map(d => Math.abs(d.y))) : 0;
        
        // Additional stats
        const avgWin = winCount > 0 ? totalProfit / winCount : 0;
        const avgLoss = lossCount > 0 ? totalLoss / lossCount : 0;
        const largestWin = winCount > 0 ? Math.max(...winningTrades.map(t => t.pnl || 0)) : 0;
        const largestLoss = lossCount > 0 ? Math.abs(Math.min(...losingTrades.map(t => t.pnl || 0))) : 0;
        
        return {
            totalPnL,
            winCount,
            lossCount,
            winRate,
            profitFactor,
            maxDrawdown,
            avgWin,
            avgLoss,
            largestWin,
            largestLoss
        };
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
        
        // Enhanced colors for better visual appeal
        const themeColor = '#a855f7'; // Purple theme color
        const positiveColor = '#22c55e'; // Green
        const negativeColor = '#ef4444'; // Red
        
        // Get gradient for cumulative and drawdown charts
        const getGradient = (ctx, chartArea, color, fadeOut = false) => {
            if (!chartArea) return color;
            
            const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            if (fadeOut) {
                gradient.addColorStop(0, 'rgba(0,0,0,0)');
                gradient.addColorStop(1, color);
            } else {
                // Convert hex or rgb color to rgba with 0.1 opacity
                let rgba;
                if (color.startsWith('#')) {
                    // Convert hex to rgb
                    const r = parseInt(color.slice(1, 3), 16);
                    const g = parseInt(color.slice(3, 5), 16);
                    const b = parseInt(color.slice(5, 7), 16);
                    rgba = `rgba(${r}, ${g}, ${b}, 0.1)`;
                } else if (color.startsWith('rgb')) {
                    // Handle both rgb and rgba formats
                    const matches = color.match(/\d+/g);
                    if (matches && matches.length >= 3) {
                        const [r, g, b] = matches;
                        rgba = `rgba(${r}, ${g}, ${b}, 0.1)`;
                    } else {
                        rgba = color; // Fallback to original color
                    }
                } else {
                    rgba = color; // Fallback to original color
                }
                
                gradient.addColorStop(0, 'rgba(0,0,0,0)');
                gradient.addColorStop(1, rgba);
            }
            return gradient;
        };

        const config = {
            type: selectedMetric === 'daily' ? 'bar' : 'line',
            data: {
                datasets: [{
                    data: chartData,
                    backgroundColor: function(context) {
                        if (!context.chart.chartArea) return;
                        
                        if (selectedMetric === 'daily') {
                            const value = context.raw?.y;
                            return value >= 0 ? 
                                ($theme === 'dark' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(34, 197, 94, 0.6)') :
                                ($theme === 'dark' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.6)');
                        } else if (selectedMetric === 'drawdown') {
                            return getGradient(
                                ctx, 
                                context.chart.chartArea, 
                                'rgba(239, 68, 68, 0.2)',
                                true
                            );
                        }
                        return getGradient(
                            ctx, 
                            context.chart.chartArea, 
                            $theme === 'dark' ? 'rgba(168, 85, 247, 0.3)' : 'rgba(168, 85, 247, 0.5)'
                        );
                    },
                    borderColor: selectedMetric === 'daily' ? 
                        context => {
                            const value = context.raw?.y;
                            return value >= 0 ? positiveColor : negativeColor;
                        } : 
                        selectedMetric === 'drawdown' ? negativeColor : themeColor,
                    borderWidth: selectedMetric === 'daily' ? 0 : 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHitRadius: 8,
                    pointBackgroundColor: selectedMetric === 'drawdown' ? negativeColor : 
                                          selectedMetric === 'daily' ? (ctx => ctx.raw?.y >= 0 ? positiveColor : negativeColor) : themeColor,
                    pointBorderColor: 'white',
                    pointBorderWidth: 2,
                    pointHoverBackgroundColor: selectedMetric === 'drawdown' ? negativeColor : 
                                             selectedMetric === 'daily' ? (ctx => ctx.raw?.y >= 0 ? positiveColor : negativeColor) : themeColor,
                    pointHoverBorderColor: 'white',
                    pointHoverBorderWidth: 2,
                    // Add hover animation
                    hoverBackgroundColor: context => {
                        if (selectedMetric === 'daily') {
                            const value = context.raw?.y;
                            return value >= 0 ? 
                                ($theme === 'dark' ? 'rgba(34, 197, 94, 0.5)' : 'rgba(34, 197, 94, 0.7)') :
                                ($theme === 'dark' ? 'rgba(239, 68, 68, 0.5)' : 'rgba(239, 68, 68, 0.7)');
                        }
                    }
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                },
                animations: {
                    tension: {
                        duration: 1000,
                        easing: 'linear',
                        from: 0.8,
                        to: 0.4
                    }
                },
                elements: {
                    point: {
                        hitRadius: 8,
                        hoverRadius: 6,
                        radius: 0,
                        borderWidth: 2,
                        hoverBorderWidth: 2
                    },
                    line: {
                        tension: 0.4
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        mode: 'nearest',
                        intersect: false,
                        backgroundColor: $theme === 'dark' ? '#1e293b' : '#ffffff',
                        titleColor: textColor,
                        bodyColor: textColor,
                        borderColor: gridColor,
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: false,
                        titleFont: {
                            size: 12,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 14
                        },
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
                                  selectedPeriod === '30d' ? 'week' : 'month',
                            tooltipFormat: 'MMM d, yyyy'
                        },
                        grid: { display: false },
                        ticks: { 
                            color: textColor,
                            maxRotation: 0,
                            autoSkip: true
                        }
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
                            padding: 10,
                            font: {
                                size: 11
                            },
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
        if (!containerRef || !document || !window) return;
        
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
</script>

<div class="h-full flex flex-col bg-light-card dark:bg-dark-card rounded-lg overflow-hidden shadow-sm" 
     style="height: {height}px">
    <!-- Header with gradient background -->
    <div class="p-4 pb-2 border-b border-light-border dark:border-dark-border bg-gradient-to-r from-theme-500/5 to-transparent dark:from-theme-500/10">
        <!-- Title Section -->
        <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-theme-500/10 flex items-center justify-center">
                    <svg class="w-6 h-6 text-theme-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/>
                    </svg>
                </div>
                <div class="flex-1">
                    <h2 class="text-lg font-semibold text-light-text dark:text-dark-text">
                        Performance Chart
                    </h2>
                    <p class="text-sm text-light-text-muted dark:text-dark-text-muted">
                        {closedTrades.length} trades analyzed
                    </p>
                </div>
            </div>

            <!-- View Toggle -->
            <div class="flex items-center gap-1.5">
                {#each views as view}
                    <button 
                        class="px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors
                               {selectedView === view.value ? 
                                'bg-theme-500 text-white' : 
                                'text-light-text-muted dark:text-dark-text-muted hover:bg-light-hover dark:hover:bg-dark-hover'}"
                        on:click={() => selectedView = view.value}
                    >
                        {view.label}
                    </button>
                {/each}
            </div>
        </div>

        <!-- Controls Section -->
        <div class="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <!-- Period Selector -->
            <div class="flex flex-wrap items-center gap-1">
                {#each periods as period}
                    <button 
                        class="px-2.5 py-1 rounded-md text-xs font-medium transition-colors
                               {selectedPeriod === period.value ? 
                                'bg-theme-500 text-white' : 
                                'text-light-text-muted dark:text-dark-text-muted hover:bg-light-hover dark:hover:bg-dark-hover'}"
                        on:click={() => selectedPeriod = period.value}
                    >
                        {period.label}
                    </button>
                {/each}
            </div>

            <!-- Metric Selector -->
            <div class="flex flex-wrap items-center gap-1">
                {#each metrics as metric}
                    <button 
                        class="px-2.5 py-1 rounded-md text-xs font-medium transition-colors
                               {selectedMetric === metric.value ? 
                                'bg-theme-500 text-white' : 
                                'text-light-text-muted dark:text-dark-text-muted hover:bg-light-hover dark:hover:bg-dark-hover'}"
                        on:click={() => selectedMetric = metric.value}
                    >
                        {metric.label}
                    </button>
                {/each}
            </div>
        </div>
    </div>

    <!-- Content -->
    <div class="flex-1 p-4 min-h-0">
        {#if selectedView === 'chart'}
            {#if closedTrades.length}
                <div class="h-full relative" 
                     style="height: {chartHeight}px; {typeof height === 'auto' ? 'min-height: 300px;' : ''}">
                    <div bind:this={containerRef} class="chart-container">
                        <canvas bind:this={chartCanvas}></canvas>
                    </div>
                </div>
            {:else}
                <!-- Empty state for chart view -->
                <div class="h-full flex items-center justify-center flex-col text-center p-4">
                    <div class="w-16 h-16 rounded-full bg-theme-500/5 flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8 text-theme-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/>
                        </svg>
                    </div>
                    <h3 class="text-base font-medium text-light-text dark:text-dark-text mb-1">
                        No trade data to display
                    </h3>
                    <p class="text-sm text-light-text-muted dark:text-dark-text-muted">
                        Complete some trades to see your performance chart
                    </p>
                </div>
            {/if}
        {:else}
            {#if closedTrades.length}
                <div class="h-full overflow-y-auto" style="height: {chartHeight}px">
                    <!-- Top level metrics -->
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div class="p-4 rounded-lg bg-light-hover/30 dark:bg-dark-hover/30 border border-transparent hover:border-theme-500/20 transition-colors">
                            <p class="text-sm text-light-text-muted dark:text-dark-text-muted mb-1">Total P&L</p>
                            <p class="text-lg font-bold {getStats(closedTrades).totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}">
                                {formatCurrency(getStats(closedTrades).totalPnL)}
                            </p>
                        </div>
                        <div class="p-4 rounded-lg bg-light-hover/30 dark:bg-dark-hover/30 border border-transparent hover:border-theme-500/20 transition-colors">
                            <p class="text-sm text-light-text-muted dark:text-dark-text-muted mb-1">Win Rate</p>
                            <p class="text-lg font-bold text-theme-500">
                                {getStats(closedTrades).winRate.toFixed(1)}%
                            </p>
                        </div>
                        <div class="p-4 rounded-lg bg-light-hover/30 dark:bg-dark-hover/30 border border-transparent hover:border-theme-500/20 transition-colors">
                            <p class="text-sm text-light-text-muted dark:text-dark-text-muted mb-1">Profit Factor</p>
                            <p class="text-lg font-bold text-light-text dark:text-dark-text">
                                {getStats(closedTrades).profitFactor.toFixed(2)}
                            </p>
                        </div>
                        <div class="p-4 rounded-lg bg-light-hover/30 dark:bg-dark-hover/30 border border-transparent hover:border-theme-500/20 transition-colors">
                            <p class="text-sm text-light-text-muted dark:text-dark-text-muted mb-1">Max Drawdown</p>
                            <p class="text-lg font-bold text-red-500">
                                {formatCurrency(getStats(closedTrades).maxDrawdown)}
                            </p>
                        </div>
                    </div>
                    
                    <!-- Detailed metrics -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- Win/Loss Metrics -->
                        <div class="bg-light-hover/20 dark:bg-dark-hover/20 rounded-lg p-4 border border-light-border/10 dark:border-dark-border/10">
                            <h3 class="text-base font-medium text-light-text dark:text-dark-text mb-3 flex items-center gap-2">
                                <svg class="w-4 h-4 text-theme-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                                </svg>
                                Win/Loss Metrics
                            </h3>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <p class="text-sm text-light-text-muted dark:text-dark-text-muted mb-1">Winning Trades</p>
                                    <p class="text-base font-medium text-green-500">
                                        {getStats(closedTrades).winCount} trades
                                    </p>
                                </div>
                                <div>
                                    <p class="text-sm text-light-text-muted dark:text-dark-text-muted mb-1">Losing Trades</p>
                                    <p class="text-base font-medium text-red-500">
                                        {getStats(closedTrades).lossCount} trades
                                    </p>
                                </div>
                                <div>
                                    <p class="text-sm text-light-text-muted dark:text-dark-text-muted mb-1">Average Win</p>
                                    <p class="text-base font-medium text-green-500">
                                        {formatCurrency(getStats(closedTrades).avgWin)}
                                    </p>
                                </div>
                                <div>
                                    <p class="text-sm text-light-text-muted dark:text-dark-text-muted mb-1">Average Loss</p>
                                    <p class="text-base font-medium text-red-500">
                                        {formatCurrency(getStats(closedTrades).avgLoss)}
                                    </p>
                                </div>
                            </div>
                            
                            <!-- Win/Loss Ratio Visual -->
                            <div class="mt-4 pt-4 border-t border-light-border/10 dark:border-dark-border/10">
                                <h4 class="text-sm font-medium text-light-text dark:text-dark-text mb-2">Win/Loss Ratio</h4>
                                <div class="h-6 w-full bg-light-hover dark:bg-dark-hover rounded-full overflow-hidden">
                                    {#if true}
                                        {@const winRate = getStats(closedTrades).winRate}
                                        {@const winWidth = `${winRate}%`}
                                        <div 
                                            class="h-full bg-green-500 flex items-center justify-start transition-all duration-1000 ease-out"
                                            style="width: {winWidth};"
                                        >
                                            {#if winRate > 15}
                                                <span class="text-xs font-medium text-white ml-2">{winRate.toFixed(1)}%</span>
                                            {/if}
                                        </div>
                                    {/if}
                                </div>
                                <div class="flex justify-between text-xs mt-1">
                                    <span class="text-green-500">Win: {getStats(closedTrades).winCount}</span>
                                    <span class="text-red-500">Loss: {getStats(closedTrades).lossCount}</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Best/Worst Trades -->
                        <div class="bg-light-hover/20 dark:bg-dark-hover/20 rounded-lg p-4 border border-light-border/10 dark:border-dark-border/10">
                            <h3 class="text-base font-medium text-light-text dark:text-dark-text mb-3 flex items-center gap-2">
                                <svg class="w-4 h-4 text-theme-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                                </svg>
                                Best/Worst Trades
                            </h3>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <p class="text-sm text-light-text-muted dark:text-dark-text-muted mb-1">Largest Win</p>
                                    <p class="text-base font-medium text-green-500">
                                        {formatCurrency(getStats(closedTrades).largestWin)}
                                    </p>
                                </div>
                                <div>
                                    <p class="text-sm text-light-text-muted dark:text-dark-text-muted mb-1">Largest Loss</p>
                                    <p class="text-base font-medium text-red-500">
                                        {formatCurrency(getStats(closedTrades).largestLoss)}
                                    </p>
                                </div>
                                <div>
                                    <p class="text-sm text-light-text-muted dark:text-dark-text-muted mb-1">Win/Loss Ratio</p>
                                    <p class="text-base font-medium text-light-text dark:text-dark-text">
                                        {(getStats(closedTrades).avgWin / (getStats(closedTrades).avgLoss || 1)).toFixed(2)}
                                    </p>
                                </div>
                                <div>
                                    <p class="text-sm text-light-text-muted dark:text-dark-text-muted mb-1">Total Trades</p>
                                    <p class="text-base font-medium text-theme-500">
                                        {getStats(closedTrades).winCount + getStats(closedTrades).lossCount}
                                    </p>
                                </div>
                            </div>
                            
                            <!-- Average P&L Visual Comparison -->
                            <div class="mt-4 pt-4 border-t border-light-border/10 dark:border-dark-border/10">
                                <h4 class="text-sm font-medium text-light-text dark:text-dark-text mb-2">Average P&L Comparison</h4>
                                <div class="flex items-center gap-2 mb-2">
                                    <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span class="text-xs text-light-text-muted dark:text-dark-text-muted">Avg Win:</span>
                                    <span class="text-xs font-medium text-green-500">{formatCurrency(getStats(closedTrades).avgWin)}</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <div class="w-2 h-2 bg-red-500 rounded-full"></div>
                                    <span class="text-xs text-light-text-muted dark:text-dark-text-muted">Avg Loss:</span>
                                    <span class="text-xs font-medium text-red-500">{formatCurrency(getStats(closedTrades).avgLoss)}</span>
                                </div>
                                
                                <!-- Visual comparison of avg win vs avg loss -->
                                <div class="mt-2 flex gap-1 h-8">
                                    {#if true}
                                        {@const avgWin = getStats(closedTrades).avgWin}
                                        {@const avgLoss = getStats(closedTrades).avgLoss}
                                        {@const maxValue = Math.max(avgWin, avgLoss)}
                                        {@const winWidth = maxValue > 0 ? (avgWin / maxValue) * 100 : 0}
                                        {@const lossWidth = maxValue > 0 ? (avgLoss / maxValue) * 100 : 0}
                                        
                                        <div class="h-full rounded-l-lg bg-green-500/20 border-l-4 border-green-500 flex items-center justify-end overflow-hidden"
                                            style="width: {winWidth}%">
                                            {#if winWidth > 20}
                                                <span class="text-xs font-medium text-green-600 mr-1">
                                                    {formatCurrency(avgWin)}
                                                </span>
                                            {/if}
                                        </div>
                                        <div class="h-full rounded-r-lg bg-red-500/20 border-r-4 border-red-500 flex items-center justify-start overflow-hidden"
                                            style="width: {lossWidth}%">
                                            {#if lossWidth > 20}
                                                <span class="text-xs font-medium text-red-600 ml-1">
                                                    {formatCurrency(avgLoss)}
                                                </span>
                                            {/if}
                                        </div>
                                    {/if}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            {:else}
                <!-- Empty state for stats view -->
                <div class="h-full flex items-center justify-center flex-col text-center p-4">
                    <div class="w-16 h-16 rounded-full bg-theme-500/5 flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8 text-theme-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                        </svg>
                    </div>
                    <h3 class="text-base font-medium text-light-text dark:text-dark-text mb-1">
                        No statistics available
                    </h3>
                    <p class="text-sm text-light-text-muted dark:text-dark-text-muted">
                        Complete some trades to see your performance statistics
                    </p>
                </div>
            {/if}
        {/if}
    </div>
</div>

<style>
    /* Add smooth transitions */
    button {
        transition: all 0.2s ease-in-out;
    }

    /* Improve chart container */
    .chart-container {
        position: relative;
        width: 100%;
        height: 100%;
        min-height: 300px;
    }

    canvas {
        width: 100% !important;
        height: 100% !important;
        position: absolute;
        top: 0;
        left: 0;
    }

    /* Button styling */
    button {
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
    }
    
    /* Add button hover animation */
    button:hover {
        transform: translateY(-1px);
    }
    
    button:active {
        transform: translateY(0);
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
        .grid-cols-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        
        /* Optimize for mobile */
        :global(.chart-container) {
            min-height: 300px;
            height: 300px !important;
        }
    }

    /* Preview mode */
    :global(.widget-preview) .h-full {
        height: 300px !important; /* For preview mode */
    }
    
    /* Improve scrolling behavior */
    .overflow-y-auto {
        scrollbar-width: thin;
        scrollbar-color: var(--theme-500) transparent;
    }

    .overflow-y-auto::-webkit-scrollbar {
        width: 4px;
    }

    .overflow-y-auto::-webkit-scrollbar-track {
        background: transparent;
    }

    .overflow-y-auto::-webkit-scrollbar-thumb {
        background-color: var(--theme-500);
        border-radius: 2px;
    }
    
    /* Add subtle card hover effects */
    .bg-light-hover\/30:hover,
    .bg-dark-hover\/30:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        transform: translateY(-2px);
        transition: all 0.3s ease;
    }
    
    /* Make stats cards more interactive */
    .rounded-lg {
        transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
    }
    
    .rounded-lg:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
</style>
