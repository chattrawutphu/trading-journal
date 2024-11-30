<!-- src/lib/components/trades/TradeTable.svelte -->
<script>
    import { createEventDispatcher } from 'svelte';
    import { formatDate, formatMoney } from '$lib/utils/formatters';
    
    const dispatch = createEventDispatcher();
  
    export let trades = [];
    export let type = 'closed'; // 'open' or 'closed'
  
    function handleAction(action, tradeId) {
      dispatch('action', { action, tradeId });
    }
  </script>
  
  <div class="overflow-x-auto bg-slate-800 rounded-lg shadow-lg">
    <table class="w-full table-hover">
      <thead>
        <tr class="border-b border-slate-700">
          <th class="p-4 text-left">{type === 'open' ? 'Entry Date' : 'Exit Date'}</th>
          <th class="p-4 text-left">Symbol</th>
          <th class="p-4 text-left">Side</th>
          <th class="p-4 text-left">Entry Price</th>
          {#if type === 'closed'}
            <th class="p-4 text-left">Exit Price</th>
          {/if}
          <th class="p-4 text-left">Quantity</th>
          <th class="p-4 text-left">P/L</th>
          <th class="p-4 text-left">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each trades as trade (trade._id)}
          <tr class="border-b border-slate-700 {trade.disabled ? 'disabled-row' : ''}">
            <td class="p-4">{formatDate(type === 'open' ? trade.entryDate : trade.exitDate)}</td>
            <td class="p-4">{trade.symbol}</td>
            <td class="p-4">{trade.side}</td>
            <td class="p-4">{formatMoney(trade.entryPrice)}</td>
            {#if type === 'closed'}
              <td class="p-4">{formatMoney(trade.exitPrice)}</td>
            {/if}
            <td class="p-4">{trade.quantity}</td>
            <td class="p-4 {trade.pnl > 0 ? 'text-green-500' : trade.pnl < 0 ? 'text-red-500' : ''}">
              {formatMoney(trade.pnl)}
            </td>
            <td class="p-4">
              <button 
                class="favorite-star mr-2 {trade.favorite ? 'active' : ''}"
                on:click={() => handleAction('favorite', trade._id)}
              >
                <i class="fas fa-star"></i>
              </button>
              <button 
                class="text-blue-500 hover:text-blue-400 mr-2"
                on:click={() => handleAction('view', trade._id)}
              >
                <i class="fas fa-eye"></i>
              </button>
              <button 
                class="text-green-500 hover:text-green-400 mr-2"
                on:click={() => handleAction('edit', trade._id)}
              >
                <i class="fas fa-edit"></i>
              </button>
              <button 
                class="text-yellow-500 hover:text-yellow-400 mr-2"
                on:click={() => handleAction('duplicate', trade._id)}
              >
                <i class="fas fa-copy"></i>
              </button>
              <button 
                class="text-gray-500 hover:text-gray-400 mr-2"
                on:click={() => handleAction('toggle-disable', trade._id)}
              >
                <i class="fas {trade.disabled ? 'fa-eye' : 'fa-eye-slash'}"></i>
              </button>
              <button 
                class="text-red-500 hover:text-red-400"
                on:click={() => handleAction('delete', trade._id)}
              >
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  
  <style>
    .disabled-row {
      text-decoration: line-through;
      opacity: 0.5;
    }
  
    .favorite-star {
      color: #9ca3af;
      cursor: pointer;
    }
  
    .favorite-star.active {
      color: #fbbf24;
    }
  
    .table-hover tr:hover {
      background-color: rgba(59, 130, 246, 0.1);
    }
  </style>
  