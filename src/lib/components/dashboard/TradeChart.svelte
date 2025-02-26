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

<div class="h-full flex flex-col bg-light-card dark:bg-dark-card rounded-lg shadow-sm" 
     style="height: {height}px">
    <!-- Header -->
    <div class="p-4 border-b border-light-border dark:border-0">
        <!-- Title Section -->
        <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-theme-500/10 flex items-center justify-center">
                    <svg class="w-5 h-5 text-theme-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/>
                    </svg>
                </div>
                <div>
                    <h3 class="text-sm font-medium text-light-text dark:text-dark-text">
                        Performance Chart
                    </h3>
                    <p class="text-xs text-light-text-muted dark:text-dark-text-muted">
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
            <div class="h-full relative" 
                 style="height: {chartHeight}px; {typeof height === 'auto' ? 'min-height: 300px;' : ''}">
                <div bind:this={containerRef} class="chart-container">
                    <canvas bind:this={chartCanvas}></canvas>
                </div>
            </div>
        {:else}
            {#if closedTrades.length}
                <div class="h-full overflow-y-auto" style="height: {chartHeight}px">
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div class="p-4 rounded-lg bg-light-hover/30 dark:bg-dark-hover/30">
                            <p class="text-sm text-light-text-muted dark:text-dark-text-muted mb-1">Total P&L</p>
                            <p class="text-lg font-bold {getStats(closedTrades).totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}">
                                {formatCurrency(getStats(closedTrades).totalPnL)}
                            </p>
                        </div>
                        <div class="p-4 rounded-lg bg-light-hover/30 dark:bg-dark-hover/30">
                            <p class="text-sm text-light-text-muted dark:text-dark-text-muted mb-1">Win Rate</p>
                            <p class="text-lg font-bold text-theme-500">
                                {getStats(closedTrades).winRate.toFixed(1)}%
                            </p>
                        </div>
                        <div class="p-4 rounded-lg bg-light-hover/30 dark:bg-dark-hover/30">
                            <p class="text-sm text-light-text-muted dark:text-dark-text-muted mb-1">Profit Factor</p>
                            <p class="text-lg font-bold text-light-text dark:text-dark-text">
                                {getStats(closedTrades).profitFactor.toFixed(2)}
                            </p>
                        </div>
                        <div class="p-4 rounded-lg bg-light-hover/30 dark:bg-dark-hover/30">
                            <p class="text-sm text-light-text-muted dark:text-dark-text-muted mb-1">Max Drawdown</p>
                            <p class="text-lg font-bold text-red-500">
                                {formatCurrency(getStats(closedTrades).maxDrawdown)}
                            </p>
                        </div>
                    </div>
                </div>
            {:else}
                <div class="flex items-center justify-center h-full text-light-text-muted dark:text-dark-text-muted">
                    No trades to analyze
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
    canvas {
        width: 100% !important;
        height: 100% !important;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
        .grid-cols-2 {
            grid-template-columns: 1fr;
        }
        
        /* ปรับปรุง style สำหรับ container ของ chart */
        :global(.chart-container) {
            min-height: 300px;
            height: 300px !important;
        }
    }

    /* ป้องกัน chart overflow */
    div {
        position: relative;
    }

    canvas {
        position: absolute;
        top: 0;
        left: 0;
    }

    :global(.widget-preview) .h-full {
        height: 300px !important; /* สำหรับ preview mode */
    }
</style>
