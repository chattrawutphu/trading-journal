<!-- src/lib/components/dashboard/TradingStats.svelte -->
<script>
    import StatsCard from './StatsCard.svelte';
    import { api } from '$lib/utils/api';
    import { accountStore } from '$lib/stores/accountStore';
  
    let stats = {
      today: { pnl: 0, trades: 0, winRate: 0 },
      yesterday: { pnl: 0, trades: 0, winRate: 0 },
      week: { pnl: 0, trades: 0, winRate: 0 },
      month: { pnl: 0, trades: 0, winRate: 0 }
    };

    let loading = true;
    let error = null;
  
    $: if ($accountStore.currentSubAccount) {
      loadStats();
    }
  
    async function loadStats() {
      loading = true;
      error = null;

      try {
        const periods = ['today', 'yesterday', 'week', 'month'];
        const results = await Promise.all(
          periods.map(period => 
            api.getStats($accountStore.currentSubAccount._id, period)
          )
        );
        
        periods.forEach((period, index) => {
          stats[period] = results[index];
        });
      } catch (err) {
        console.error('Error loading stats:', err);
        error = 'Failed to load trading statistics. Please try again later.';
      } finally {
        loading = false;
      }
    }

    const statCards = [
      { title: 'Today', period: 'today' },
      { title: 'Yesterday', period: 'yesterday' },
      { title: 'This Week', period: 'week' },
      { title: 'This Month', period: 'month' }
    ];
</script>
  
<div class="space-y-6">
    {#if error}
        <div class="bg-red-500 bg-opacity-10 text-red-500 p-4 rounded-lg text-sm">
            {error}
            <button 
                class="ml-2 underline hover:no-underline"
                on:click={loadStats}
            >
                Try again
            </button>
        </div>
    {/if}

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {#each statCards as { title, period }}
            <div class="relative">
                {#if loading}
                    <div class="absolute inset-0 bg-light-hover dark:bg-dark-hover rounded-lg"></div>
                {/if}
                <StatsCard 
                    {title}
                    pnl={stats[period].pnl}
                    trades={stats[period].trades}
                    winRate={stats[period].winRate}
                />
            </div>
        {/each}
    </div>
</div>