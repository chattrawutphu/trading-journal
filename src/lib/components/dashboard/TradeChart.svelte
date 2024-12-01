<!-- src/lib/components/dashboard/TradeChart.svelte -->
<script>
    import { onMount } from 'svelte';
    import Chart from 'chart.js/auto';
    import 'chartjs-adapter-date-fns';
    import { formatCurrency } from '$lib/utils/formatters';
    import { theme } from '$lib/stores/themeStore';
  
    export let openTrades = [];
    export let closedTrades = [];
  
    let canvas;
    let chart;
    let selectedPeriod = '30'; // default to 30 days
  
    $: allTrades = [...openTrades, ...closedTrades];
    $: chartData = processChartData(allTrades, selectedPeriod);
    $: isDark = $theme === 'dark';

    // Theme-aware colors
    $: chartColors = {
        text: isDark ? '#94a3b8' : '#475569',
        gridLines: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.8)',
        line: '#a855f7',
        fill: isDark ? 'rgba(168, 85, 247, 0.1)' : 'rgba(168, 85, 247, 0.05)'
    };
  
    function processChartData(trades, days) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
  
      const filteredTrades = trades.filter(trade => 
        new Date(trade.entryDate) >= startDate && 
        new Date(trade.entryDate) <= endDate
      );
  
      const sortedTrades = filteredTrades.sort((a, b) => 
        new Date(a.entryDate) - new Date(b.entryDate)
      );
  
      let runningPnL = 0;
      const dataPoints = sortedTrades.map(trade => {
        runningPnL += trade.pnl || 0;
        return {
          x: new Date(trade.entryDate),
          y: runningPnL
        };
      });
  
      if (dataPoints.length === 0) {
        dataPoints.push({ x: startDate, y: 0 });
        dataPoints.push({ x: endDate, y: 0 });
      } else if (dataPoints.length === 1) {
        dataPoints.unshift({ x: startDate, y: 0 });
      }
  
      return dataPoints;
    }
  
    function createChart() {
      const ctx = canvas.getContext('2d');
      
      chart = new Chart(ctx, {
        type: 'line',
        data: {
          datasets: [{
            label: 'Cumulative P&L',
            data: chartData,
            borderColor: chartColors.line,
            backgroundColor: chartColors.fill,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: chartColors.line,
            pointHoverBorderColor: isDark ? '#1e293b' : '#ffffff',
            pointHoverBorderWidth: 2
          }]
        },
        options: {
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
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              titleColor: isDark ? '#e2e8f0' : '#1e293b',
              bodyColor: isDark ? '#e2e8f0' : '#1e293b',
              borderColor: isDark ? '#334155' : '#e2e8f0',
              borderWidth: 1,
              padding: 12,
              cornerRadius: 8,
              callbacks: {
                label: (context) => {
                  return `P&L: ${formatCurrency(context.parsed.y)}`;
                }
              }
            }
          },
          scales: {
            x: {
              type: 'time',
              time: {
                unit: 'day'
              },
              grid: {
                display: false
              },
              border: {
                display: false
              },
              ticks: {
                color: chartColors.text,
                font: {
                  size: 11
                }
              }
            },
            y: {
              grid: {
                color: chartColors.gridLines,
                drawBorder: false
              },
              border: {
                display: false
              },
              ticks: {
                color: chartColors.text,
                font: {
                  size: 11
                },
                callback: (value) => formatCurrency(value)
              }
            }
          }
        }
      });
    }
  
    function updateChart() {
      if (chart) {
        chart.data.datasets[0].data = chartData;
        chart.data.datasets[0].borderColor = chartColors.line;
        chart.data.datasets[0].backgroundColor = chartColors.fill;
        chart.data.datasets[0].pointHoverBackgroundColor = chartColors.line;
        chart.data.datasets[0].pointHoverBorderColor = isDark ? '#1e293b' : '#ffffff';
        chart.options.plugins.tooltip.backgroundColor = isDark ? '#1e293b' : '#ffffff';
        chart.options.plugins.tooltip.titleColor = isDark ? '#e2e8f0' : '#1e293b';
        chart.options.plugins.tooltip.bodyColor = isDark ? '#e2e8f0' : '#1e293b';
        chart.options.plugins.tooltip.borderColor = isDark ? '#334155' : '#e2e8f0';
        chart.options.scales.x.ticks.color = chartColors.text;
        chart.options.scales.y.ticks.color = chartColors.text;
        chart.options.scales.y.grid.color = chartColors.gridLines;
        chart.update();
      }
    }
  
    function handlePeriodChange(e) {
      selectedPeriod = e.target.value;
      updateChart();
    }
  
    onMount(() => {
      createChart();
      return () => {
        if (chart) {
          chart.destroy();
        }
      };
    });
  
    $: if (chart && (openTrades || closedTrades)) {
      updateChart();
    }

    $: if (chart && $theme) {
      updateChart();
    }
</script>
  
<div class="card p-6 space-y-6">
    <div class="flex justify-between items-center">
        <h2 class="text-xl font-semibold text-light-text dark:text-dark-text">Performance Chart</h2>
        <select
            bind:value={selectedPeriod}
            on:change={handlePeriodChange}
            class="input text-sm min-w-[120px]"
        >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="180">Last 180 days</option>
            <option value="365">Last 365 days</option>
        </select>
    </div>
  
    <div class="relative h-[400px] bg-light-card dark:bg-dark-card rounded-lg p-4">
        <canvas bind:this={canvas}></canvas>
    </div>
</div>
  
<style>
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-lg transition-colors duration-200;
    }
</style>
