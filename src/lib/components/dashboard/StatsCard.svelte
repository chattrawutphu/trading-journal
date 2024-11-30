<!-- src/lib/components/dashboard/StatsCard.svelte -->
<script>
    export let title;
    export let pnl = 0;
    export let trades = 0;
    export let winRate = 0;
  
    $: pnlClass = pnl > 0 ? 'text-green-500' : pnl < 0 ? 'text-red-500' : '';
  </script>
  
  <div class="card stats-card bg-slate-800 p-4 rounded-lg shadow-lg">
    <h3 class="text-sm text-slate-400 mb-2">{title}</h3>
    <div class="flex justify-between items-baseline mb-2">
      <span class="text-2xl font-bold {pnlClass}">${pnl.toFixed(2)}</span>
      <span class="text-sm text-slate-400">{trades} trades</span>
    </div>
    <div class="mb-2">
      <div class="flex justify-between text-xs mb-1">
        <span>Win Rate</span>
        <span>{winRate.toFixed(1)}%</span>
      </div>
      <div class="win-rate-bar rounded-full" style="--win-rate: {winRate}%"></div>
    </div>
  </div>
  
  <style>
    .stats-card {
      background: rgba(30, 41, 59, 0.7);
      border: 1px solid rgba(148, 163, 184, 0.1);
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
    }
  
    .stats-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
  
    .win-rate-bar {
      height: 4px;
      background: linear-gradient(to right, #22c55e var(--win-rate), #ef4444 var(--win-rate));
      border-radius: 24px;
    }
  </style>
  