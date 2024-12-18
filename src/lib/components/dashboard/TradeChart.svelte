<script>
    import { onMount } from 'svelte';
    import { theme } from '$lib/stores/themeStore';
    import { browser } from '$app/environment';
    import Select from '../common/Select.svelte';
    import Chart from 'chart.js/auto';
    import 'chartjs-adapter-date-fns';

    export let openTrades = [];
    export let closedTrades = [];

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

        const commonOptions = {
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
                              dateRange <= 90 ? 'week' : 'month'
                    },
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor
                    }
                },
                y: {
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor,
                        callback: value => `$${value.toFixed(2)}`
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: context => `$${context.parsed.y.toFixed(2)}`
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
                                    ($theme === 'dark' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.5)') :
                                    ($theme === 'dark' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.5)');
                            },
                            borderColor: context => {
                                const value = context.raw.y;
                                return value >= 0 ? '#22c55e' : '#ef4444';
                            },
                            borderWidth: 1
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
                            backgroundColor: $theme === 'dark' ? 
                                'rgba(168, 85, 247, 0.1)' : 'rgba(168, 85, 247, 0.2)',
                            borderColor: '#a855f7',
                            tension: 0.4
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
                            tension: 0.4
                        }]
                    },
                    options: commonOptions
                };
                break;
        }

        chart = new Chart(ctx, config);
    }

    onMount(() => {
        updateChart();
        return () => {
            if (chart) {
                chart.destroy();
            }
        };
    });

    $: if (browser && chartCanvas && (openTrades || closedTrades || chartType || dateRange || $theme)) {
        updateChart();
    }
</script>

<div class="card h-full">
    <div class="p-4 border-b border-light-border dark:border-dark-border">
        <div class="flex justify-between items-center">
            <h2 class="text-xl font-semibold bg-gradient-purple bg-clip-text text-transparent">Performance Chart</h2>
            <div class="flex gap-2">
                <Select 
                    options={dateRanges}
                    bind:value={dateRange}
                    className="w-32"
                />
                <Select 
                    options={chartTypes}
                    bind:value={chartType}
                    className="w-40"
                />
            </div>
        </div>
    </div>
    <div class="p-4">
        <canvas bind:this={chartCanvas}></canvas>
    </div>
</div>

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-lg ;
    }
</style>
