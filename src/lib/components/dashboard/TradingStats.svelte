<script>
    import { fade } from 'svelte/transition';
    import { accountStore } from '$lib/stores/accountStore';
    import { tradingStatsStore, PERIOD_OPTIONS } from '$lib/stores/tradingStatsStore';
    import { api } from '$lib/utils/api';
    import { onMount } from 'svelte';
    import TradingStatsConfig from './TradingStatsConfig.svelte';

    let stats = {};
    let loading = false;
    let error = '';
    let showConfig = false;
    let isHovering = false;

    $: if ($accountStore.currentAccount) {
        loadStats();
    }

    async function loadStats() {
        try {
            loading = true;
            error = '';

            const results = await Promise.all(
                $tradingStatsStore.selectedPeriods.map(period => 
                    api.getStats($accountStore.currentAccount._id, period)
                )
            );

            $tradingStatsStore.selectedPeriods.forEach((period, i) => {
                stats[period] = results[i];
            });
        } catch (err) {
            error = err.message;
        } finally {
            loading = false;
        }
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

<div 
    class="grid grid-cols-5 gap-4 relative group"
    on:mouseenter={() => isHovering = true}
    on:mouseleave={() => isHovering = false}
>
    {#each $tradingStatsStore.selectedPeriods as period, index}
        {@const data = stats[period] || { pnl: 0, trades: 0, balanceChange: 0, startingBalance: 0 }}
        <div class="card p-4">
            <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text-muted capitalize">
                    {PERIOD_OPTIONS[period].label}
                </h3>
                <div class="w-8 h-8 rounded-full {data.pnl >= 0 ? 'bg-green-500' : 'bg-red-500'} bg-opacity-10 flex items-center justify-center">
                    <svg class="w-4 h-4 {data.pnl >= 0 ? 'text-green-500' : 'text-red-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={PERIOD_OPTIONS[period].icon}/>
                    </svg>
                </div>
            </div>
            <div class="space-y-2">
                <div class="flex items-baseline justify-between">
                    <p class="text-lg {data.pnl >= 0 ? 'text-green-500' : 'text-red-500'}">
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

    {#if isHovering}
        <button
            class="absolute -top-2 -right-2 p-2 rounded-lg bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border shadow-lg text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover transition-colors duration-200"
            on:click={() => showConfig = true}
            transition:fade={{ duration: 100 }}
        >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
        </button>
    {/if}
</div>

<TradingStatsConfig bind:show={showConfig} />

<style>
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-lg transition-colors duration-200;
    }
</style>
