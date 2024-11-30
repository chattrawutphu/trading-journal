<!-- src/lib/components/dashboard/TradeChart.svelte -->
<script>
    import { onMount } from 'svelte';
    import Chart from 'chart.js/auto';
    import 'chartjs-adapter-date-fns';
    import { formatCurrency } from '$lib/utils/formatters';
  
    export let openTrades = [];
    export let closedTrades = [];
  
    let canvas;
    let chart;
    let selectedPeriod = '30'; // default to 30 days
  
    $: allTrades = [...openTrades, ...closedTrades];
    $: chartData = processChartData(allTrades, selectedPeriod);
  
    function processChartData(trades, days) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
  
      // Filter trades within the selected period
      const filteredTrades = trades.filter(trade => 
        new Date(trade.entryDate) >= startDate && 
        new Date(trade.entryDate) <= endDate
      );
  
      // Sort trades by date
      const sortedTrades = filteredTrades.sort((a, b) => 
        new Date(a.entryDate) - new Date(b.entryDate)
      );
  
      // Calculate cumulative PnL
      let runningPnL = 0;
      const dataPoints = sortedTrades.map(trade => {
        runningPnL += trade.pnl || 0;
        return {
          x: new Date(trade.entryDate),
          y: runningPnL
        };
      });
  
      // Ensure we have at least two points for the chart
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
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6
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
              ticks: {
                color: '#94a3b8'
              }
            },
            y: {
              grid: {
                color: 'rgba(148, 163, 184, 0.1)'
              },
              ticks: {
                color: '#94a3b8',
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
  </script>
  
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-semibold">Performance Chart</h2>
      <select
        bind:value={selectedPeriod}
        on:change={handlePeriodChange}
        class="bg-slate-700 border border-slate-600 rounded-lg p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="7">Last 7 days</option>
        <option value="30">Last 30 days</option>
        <option value="90">Last 90 days</option>
        <option value="180">Last 180 days</option>
        <option value="365">Last 365 days</option>
      </select>
    </div>
  
    <div class="relative h-[400px]">
      <canvas bind:this={canvas}></canvas>
    </div>
  </div>
  
  <style>
    canvas {
      width: 100% !important;
      height: 100% !important;
    }
  </style>
