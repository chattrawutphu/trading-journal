<!-- src/lib/components/trades/TradeFilters.svelte -->
<script>
    import { createEventDispatcher } from 'svelte';
    import Select from '../common/Select.svelte';
  
    const dispatch = createEventDispatcher();
  
    export let filters = {
      startDate: '',
      endDate: '',
      symbol: '',
      filterType: 'all',
      itemsPerPage: '10'
    };
  
    const filterTypes = [
      { value: 'all', label: 'All Trades' },
      { value: 'favorites', label: 'Favorites Only' },
      { value: 'enabled', label: 'Enabled Only' },
      { value: 'disabled', label: 'Disabled Only' }
    ];
  
    const itemsPerPageOptions = [
      { value: '10', label: '10' },
      { value: '25', label: '25' },
      { value: '50', label: '50' },
      { value: '100', label: '100' }
    ];
  
    function handleFilterChange() {
      dispatch('filter', filters);
    }
  </script>
  
  <div class="bg-slate-800 p-6 rounded-lg shadow-lg mb-8">
    <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
      <div>
        <label class="block mb-2 text-sm font-medium">Start Date</label>
        <input
          type="date"
          bind:value={filters.startDate}
          on:change={handleFilterChange}
          class="w-full bg-slate-700 border border-slate-600 rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500"
        >
      </div>
  
      <div>
        <label class="block mb-2 text-sm font-medium">End Date</label>
        <input
          type="date"
          bind:value={filters.endDate}
          on:change={handleFilterChange}
          class="w-full bg-slate-700 border border-slate-600 rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500"
        >
      </div>
  
      <div>
        <label class="block mb-2 text-sm font-medium">Symbol</label>
        <input
          type="text"
          bind:value={filters.symbol}
          on:input={handleFilterChange}
          placeholder="Enter symbol..."
          class="w-full bg-slate-700 border border-slate-600 rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500"
        >
      </div>
  
      <div>
        <label class="block mb-2 text-sm font-medium">Show</label>
        <Select
          options={filterTypes}
          bind:value={filters.filterType}
          on:change={handleFilterChange}
        />
      </div>
  
      <div>
        <label class="block mb-2 text-sm font-medium">Items Per Page</label>
        <Select
          options={itemsPerPageOptions}
          bind:value={filters.itemsPerPage}
          on:change={handleFilterChange}
        />
      </div>
    </div>
  </div>
  