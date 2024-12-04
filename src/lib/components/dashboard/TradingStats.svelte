<script>
    import { accountStore } from '$lib/stores/accountStore';
    import { api } from '$lib/utils/api';
    import { onMount } from 'svelte';

    let stats = {
        today: { pnl: 0, trades: 0, balanceChange: 0, startingBalance: 0 },
        yesterday: { pnl: 0, trades: 0, balanceChange: 0, startingBalance: 0 },
        week: { pnl: 0, trades: 0, balanceChange: 0, startingBalance: 0 },
        month: { pnl: 0, trades: 0, balanceChange: 0, startingBalance: 0 },
        total: { pnl: 0, trades: 0, balanceChange: 0, startingBalance: 0 }
    };

    let loading = false;
    let error = '';

    $: if ($accountStore.currentAccount) {
        loadStats();
    }

    async function loadStats() {
        try {
            loading = true;
            error = '';

            const periods = ['today', 'yesterday', 'week', 'month', 'total'];
            const results = await Promise.all(
                periods.map(period => api.getStats($accountStore.currentAccount._id, period))
            );

            periods.forEach((period, i) => {
                stats[period] = results[i];
            });
        } catch (err) {
            error = err.message;
        } finally {
            loading = false;
        }
    }

    const icons = {
        today: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>',
        yesterday: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>',
        week: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2zM12 12h.01"/>',
        month: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>',
        total: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>'
    };

    function getIcon(period) {
        return icons[period] || '';
    }

    function formatPercentage(value) {
        const sign = value > 0 ? '+' : '';
        return `${sign}${value.toFixed(2)}%`;
    }

    function formatCurrency(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }
</script>

<div class="grid grid-cols-5 gap-4">
    {#each Object.entries(stats) as [period, data]}
        <div class="card p-4">
            <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted capitalize">
                    {period}
                </h3>
                <div class="w-8 h-8 rounded-full {data.pnl >= 0 ? 'bg-green-500' : 'bg-red-500'} bg-opacity-10 flex items-center justify-center">
                    <svg class="w-4 h-4 {data.pnl >= 0 ? 'text-green-500' : 'text-red-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {@html getIcon(period)}
                    </svg>
                </div>
            </div>
            <div class="space-y-2">
                <div class="flex items-baseline justify-between">
                    <p class="text-xl {data.pnl >= 0 ? 'text-green-500' : 'text-red-500'}">
                        {formatCurrency(data.pnl)}
                    </p>
                    {#if data.balanceChange !== 0}
                        <p class="text-xl font-bold {data.balanceChange > 0 ? 'text-green-500' : 'text-red-500'}">
                            {formatPercentage(data.balanceChange)}
                        </p>
                    {/if}
                </div>
                <div class="flex items-baseline justify-between">
                    <p class="text-sm text-light-text-muted dark:text-dark-text-muted">
                        {data.trades} trade{data.trades !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>
        </div>
    {/each}
</div>

<style>
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-lg transition-colors duration-200;
    }
</style>
