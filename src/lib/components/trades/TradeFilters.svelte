<!-- src/lib/components/trades/TradeFilters.svelte -->
<script>
    import { createEventDispatcher } from 'svelte';
    import Select from '../common/Select.svelte';
    import Input from '../common/Input.svelte';
    import Button from '../common/Button.svelte';
    import TradeOptionSelect from './TradeOptionSelect.svelte';
  
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

    function handleReset() {
        filters = {
            startDate: '',
            endDate: '',
            symbol: '',
            filterType: 'all',
            itemsPerPage: '10'
        };
        handleFilterChange();
    }
</script>
  
<div class="card p-6 mb-8">
    <div class="flex items-center justify-between mb-6">
        <h2 class="text-lg font-semibold text-light-text-muted dark:text-dark-text">Filter Trades</h2>
        <Button 
            variant="secondary"
            on:click={handleReset}
            icon='<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>'
        >
            Reset Filters
        </Button>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <!-- Date Range -->
        <Input
            type="date"
            label="Start Date"
            bind:value={filters.startDate}
            on:change={handleFilterChange}
            placeholder="mm/dd/yyyy"
        />

        <Input
            type="date"
            label="End Date"
            bind:value={filters.endDate}
            on:change={handleFilterChange}
            placeholder="mm/dd/yyyy"
        />

        <!-- Symbol -->
        <div>
            <label class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">
                Symbol
            </label>
            <TradeOptionSelect
                type="SYMBOL"
                bind:value={filters.symbol}
                placeholder="Enter symbol..."
                on:change={handleFilterChange}
            />
        </div>

        <!-- Filter Type -->
        <Select
            label="Show"
            options={filterTypes}
            bind:value={filters.filterType}
            on:change={handleFilterChange}
        />

        <!-- Items Per Page -->
        <Select
            label="Items Per Page"
            options={itemsPerPageOptions}
            bind:value={filters.itemsPerPage}
            on:change={handleFilterChange}
        />
    </div>
</div>

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-lg transition-colors duration-200;
    }
</style>
