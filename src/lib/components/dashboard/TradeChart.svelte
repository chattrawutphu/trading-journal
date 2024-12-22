<script>
    import { onMount } from 'svelte';
    import { theme } from '$lib/stores/themeStore';
    import { browser } from '$app/environment';
    import Select from '../common/Select.svelte';
    import Chart from 'chart.js/auto';
    import 'chartjs-adapter-date-fns';

    export let openTrades = [];
    export let closedTrades = [];
    export let height;
    export let textSize;
    export let isPreview = false;

    let chartCanvas;
    let chart;
    let chartType = 'line';
    let dateRange = 30; // Default to 30 days

    const chartTypes = [
        { value: 'line', label: 'Line Chart' },
        { value: 'bar', label: 'Bar Chart' },
        { value: 'area', label: 'Area Chart' },
        { value: 'candlestick', label: 'Candlestick' }
    ];

    const dateRanges = [
        { value: 7, label: '7 Days' },
        { value: 30, label: '30 Days' },
        { value: 90, label: '90 Days' },
        { value: 180, label: '180 Days' },
        { value: 365, label: '365 Days' }
    ];

    const commonChartOptions = {
        plugins: {
            tooltip: {
                mode: 'nearest',
                intersect: false,
                backgroundColor: 'rgba(17, 24, 39, 0.8)',
                titleColor: '#fff',
                bodyColor: '#fff',
                padding: 12,
                bodySpacing: 8,
                titleSpacing: 8,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                displayColors: false,
                titleFont: {
                    size: 13,
                    weight: 'bold'
                },
                bodyFont: {
                    size: 12
                },
                callbacks: {
                    label: context => `$${context.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                }
            },
            legend: {
                display: false
            }
        },
        animation: {
            duration: 750,
            easing: 'easeInOutQuart'
        }
    };

    // Rest of the existing script remains the same (filterTradesByDate, getDailyStats, getCumulativeData, updateChart functions)
    function filterTradesByDate(trades) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - dateRange);
        
        return trades.filter(trade => {
            const tradeDate = new Date(trade.exitDate);
            return tradeDate >= cutoffDate;
        });
    }

    function getDailyStats(trades) {
        const filteredTrades = filterTradesByDate(trades);
        const dailyStats = filteredTrades.reduce((acc, trade) => {
            if (!trade.exitDate) return acc;
            
            const date = new Date(trade.exitDate);
            const dateKey = date.toLocaleString('en-GB', { hour12: false }).slice(0, 16).replace(',', '');
            
            if (!acc[dateKey]) {
                acc[dateKey] = {
                    pnl: 0,
                    high: 0,
                    low: 0,
                    trades: []
                };
            }
            
            acc[dateKey].trades.push(trade);
            acc[dateKey].pnl += trade.pnl || 0;
            acc[dateKey].high = Math.max(acc[dateKey].high, trade.pnl || 0);
            acc[dateKey].low = Math.min(acc[dateKey].low, trade.pnl || 0);
            
            return acc;
        }, {});

        return Object.entries(dailyStats)
            .map(([date, stats]) => ({
                date,
                ...stats
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    function getCumulativeData(trades) {
        let cumulative = 0;
        return trades.map(day => {
            cumulative += day.pnl;
            return {
                x: new Date(day.date),
                y: cumulative
            };
        });
    }

    function updateChart() {
        if (!browser || !chartCanvas) return;

        if (chart) {
            chart.destroy();
        }

        const dailyStats = getDailyStats(closedTrades);
        const cumulativeData = getCumulativeData(dailyStats);

        const ctx = chartCanvas.getContext('2d');
        const textColor = $theme === 'dark' ? '#94a3b8' : '#475569';
        const gridColor = $theme === 'dark' ? 'rgba(148, 163, 184, 0.1)' : 'rgba(71, 85, 105, 0.1)';
        const areaGradient = ctx.createLinearGradient(0, 0, 0, 400);
        
        if ($theme === 'dark') {
            areaGradient.addColorStop(0, 'rgba(168, 85, 247, 0.2)');
            areaGradient.addColorStop(1, 'rgba(168, 85, 247, 0)');
        } else {
            areaGradient.addColorStop(0, 'rgba(168, 85, 247, 0.3)');
            areaGradient.addColorStop(1, 'rgba(168, 85, 247, 0.05)');
        }

        const commonOptions = {
            ...commonChartOptions,
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: dateRange <= 7 ? 'day' : 
                              dateRange <= 90 ? 'week' : 'month',
                        displayFormats: {
                            day: 'MMM d',
                            week: 'MMM d',
                            month: 'MMM yyyy'
                        }
                    },
                    grid: {
                        display: false
                    },
                    border: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            size: 11
                        }
                    }
                },
                y: {
                    grid: {
                        color: gridColor,
                        drawBorder: false
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            size: 11
                        },
                        callback: value => `$${value.toLocaleString('en-US', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                        })}`
                    }
                }
            }
        };

        let config;

        switch (chartType) {
            case 'bar':
                config = {
                    type: 'bar',
                    data: {
                        datasets: [{
                            data: dailyStats.map(day => ({
                                x: new Date(day.date),
                                y: day.pnl
                            })),
                            backgroundColor: context => {
                                const value = context.raw.y;
                                return value >= 0 ? 
                                    ($theme === 'dark' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.6)') :
                                    ($theme === 'dark' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.6)');
                            },
                            borderColor: context => {
                                const value = context.raw.y;
                                return value >= 0 ? '#22c55e' : '#ef4444';
                            },
                            borderWidth: 1,
                            borderRadius: 4
                        }]
                    },
                    options: commonOptions
                };
                break;

            case 'area':
                config = {
                    type: 'line',
                    data: {
                        datasets: [{
                            data: cumulativeData,
                            fill: true,
                            backgroundColor: areaGradient,
                            borderColor: '#a855f7',
                            borderWidth: 2,
                            tension: 0.4,
                            pointRadius: 0,
                            pointHitRadius: 20,
                            pointHoverRadius: 5,
                            pointHoverBorderWidth: 2,
                            pointHoverBackgroundColor: '#fff',
                            pointHoverBorderColor: '#a855f7'
                        }]
                    },
                    options: commonOptions
                };
                break;

            case 'candlestick':
                config = {
                    type: 'bar',
                    data: {
                        datasets: [{
                            data: dailyStats.map(day => ({
                                x: new Date(day.date),
                                y: [0, day.high, day.low, day.pnl]
                            })),
                            backgroundColor: context => {
                                const value = context.raw.y[3];
                                return value >= 0 ? 
                                    ($theme === 'dark' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.5)') :
                                    ($theme === 'dark' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.5)');
                            },
                            borderColor: context => {
                                const value = context.raw.y[3];
                                return value >= 0 ? '#22c55e' : '#ef4444';
                            },
                            borderWidth: 1
                        }]
                    },
                    options: {
                        ...commonOptions,
                        plugins: {
                            ...commonOptions.plugins,
                            tooltip: {
                                callbacks: {
                                    label: context => {
                                        const values = context.raw.y;
                                        return [
                                            `High: $${values[1].toFixed(2)}`,
                                            `Low: $${values[2].toFixed(2)}`,
                                            `Close: $${values[3].toFixed(2)}`
                                        ];
                                    }
                                }
                            }
                        }
                    }
                };
                break;

            default: // line
                config = {
                    type: 'line',
                    data: {
                        datasets: [{
                            data: cumulativeData,
                            borderColor: '#a855f7',
                            borderWidth: 2,
                            tension: 0.4,
                            pointRadius: 0,
                            pointHitRadius: 20,
                            pointHoverRadius: 5,
                            pointHoverBorderWidth: 2,
                            pointHoverBackgroundColor: '#fff',
                            pointHoverBorderColor: '#a855f7'
                        }]
                    },
                    options: commonOptions
                };
                break;
        }

        chart = new Chart(ctx, config);
    }

    onMount(() => {
        if (isPreview) return;
        updateChart();
        return () => {
            if (chart) {
                chart.destroy();
            }
        };
    });

    $: if (browser && chartCanvas && (openTrades || closedTrades || chartType || dateRange || $theme)) {
        if (!isPreview) {
            updateChart();
        }
    }
</script>

<div class="card h-full flex flex-col">
    <div class="p-4 border-b border-light-border dark:border-dark-border">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h2 class="text-xl font-semibold bg-gradient-purple bg-clip-text text-transparent">Performance Chart</h2>
            <div class="flex gap-2 w-full sm:w-auto">
                <Select 
                    options={dateRanges}
                    bind:value={dateRange}
                    className="w-full sm:w-32"
                />
                <Select 
                    options={chartTypes}
                    bind:value={chartType}
                    className="w-full sm:w-40"
                />
            </div>
        </div>
    </div>
    <div class="flex-1 p-4 min-h-[200px]">
        <canvas bind:this={chartCanvas}></canvas>
    </div>
</div>

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-lg;
    }

    .bg-gradient-purple {
        @apply bg-gradient-to-r from-purple-500 to-purple-600;
    }
</style>
