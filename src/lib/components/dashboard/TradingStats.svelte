<!-- src/lib/components/dashboard/TradingStats.svelte -->
<script>
    import StatsCard from './StatsCard.svelte';
    import { api } from '$lib/utils/api';
    import { accountStore } from '$lib/stores/accountStore';
  
    let stats = {
      today: { pnl: 0, trades: 0, winRate: 0 },
      yesterday: { pnl: 0, trades: 0, winRate: 0 },
      week: { pnl: 0, trades: 0, winRate: 0 },
      month: { pnl: 0, trades: 0, winRate: 0 },
      total: { pnl: 0, trades: 0, winRate: 0 }
    };
  
    $: if ($accountStore.currentSubAccount) {
      loadStats();
    }
  
    async function loadStats() {
      try {
        const periods = ['today', 'yesterday', 'week', 'month', 'total'];
        const results = await Promise.all(
          periods.map(period => 
            api.getStats($accountStore.currentSubAccount._id, period)
          )
        );
        
        periods.forEach((period, index) => {
          stats[period] = results[index];
        });
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    }
  </script>
  
  <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
    <StatsCard 
      title="Today" 
      pnl={stats.today.pnl}
      trades={stats.today.trades}
      winRate={stats.today.winRate}
    />
    <StatsCard 
      title="Yesterday"
      pnl={stats.yesterday.pnl}
      trades={stats.yesterday.trades}
      winRate={stats.yesterday.winRate}
    />
    <StatsCard 
      title="This Week"
      pnl={stats.week.pnl}
      trades={stats.week.trades}
      winRate={stats.week.winRate}
    />
    <StatsCard 
      title="This Month"
      pnl={stats.month.pnl}
      trades={stats.month.trades}
      winRate={stats.month.winRate}
    />
    <StatsCard 
      title="Total"
      pnl={stats.total.pnl}
      trades={stats.total.trades}
      winRate={stats.total.winRate}
    />
  </div>
  