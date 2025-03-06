<script>
    import { createEventDispatcher } from 'svelte';
    import { slide } from 'svelte/transition';
    import Button from '../common/Button.svelte';
    import Input from '../common/Input.svelte';
    import Select from '../common/Select.svelte';
    // import { formatDateForInput } from '$lib/utils/formatters';
    import Modal from '../common/Modal.svelte';
    import TradeAdvancedFilters from './TradeAdvancedFilters.svelte';
    
    const dispatch = createEventDispatcher();
    
    export let filters = {
        symbol: '',
        status: [],
        side: [],
        dateRange: {
            start: '',
            end: ''
        },
        type: [],
        favorite: false,
        tags: [],
        profitableOnly: false,
        unprofitableOnly: false,
        showAdvanced: false
    };
    
    let showAdvancedFilters = false;
    let expandedBasicFilters = false;
    
    // Define the formatter function locally instead of importing it
    function formatDateForInput(date) {
        if (!date) return '';
        const d = new Date(date);
        return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    }
    
    const statusOptions = [
        { value: 'OPEN', label: 'Open Trades' },
        { value: 'CLOSED', label: 'Closed Trades' }
    ];
    
    const sideOptions = [
        { value: 'LONG', label: 'Long Positions' },
        { value: 'SHORT', label: 'Short Positions' }
    ];
    
    const typeOptions = [
        { value: 'MANUAL', label: 'Manual Trades' },
        { value: 'SYNC', label: 'Synced Trades' }
    ];
    
    function applyFilters() {
        dispatch('filter', filters);
    }
    
    function resetFilters() {
        filters = {
            symbol: '',
            status: [],
            side: [],
            dateRange: {
                start: '',
                end: ''
            },
            type: [],
            favorite: false,
            tags: [],
            profitableOnly: false,
            unprofitableOnly: false,
            showAdvanced: false,
            strategy: '',
            emotions: [],
            confidenceLevel: {
                min: 1,
                max: 10
            },
            greedLevel: {
                min: 1,
                max: 10
            },
            hasStopLoss: null,
            hasTakeProfit: null,
            amount: {
                min: '',
                max: ''
            },
            pnl: {
                min: '',
                max: ''
            },
            pnlPercentage: {
                min: '',
                max: ''
            },
            excludeZeroPnL: false,
            disabled: null,
            positionHistory: false
        };
        dispatch('filter', filters);
    }
    
    function toggleAdvancedFilters() {
        showAdvancedFilters = !showAdvancedFilters;
    }
    
    function handleAdvancedFilters(event) {
        filters = {
            ...filters,
            ...event.detail
        };
        showAdvancedFilters = false;
        applyFilters();
    }
    
    function toggleExpandedFilters() {
        expandedBasicFilters = !expandedBasicFilters;
    }

    // Update filters and apply immediately when basic filters change
    $: {
        if (filters) {
            applyFilters();
        }
    }
</script>

<div class="filter-bar card p-4 mb-6">
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div class="w-full sm:w-auto flex-1">
            <Input 
                type="search"
                placeholder="Search by symbol..."
                bind:value={filters.symbol}
                className="search-input"
                icon="search"
            />
        </div>
        
        <div class="flex items-center gap-2">
            <button 
                class="text-sm text-theme-500 hover:text-theme-600 font-medium flex items-center gap-1"
                on:click={resetFilters}
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset
            </button>
            
            <Button 
                variant="primary" 
                size="sm"
                on:click={toggleAdvancedFilters}
            >
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Advanced Filters
            </Button>
            
            <button 
                class="text-sm text-theme-500 hover:text-theme-600 font-medium flex items-center gap-1"
                on:click={toggleExpandedFilters}
                aria-expanded={expandedBasicFilters}
            >
                <svg class="w-4 h-4 transform transition-transform duration-200 {expandedBasicFilters ? 'rotate-180' : ''}" 
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
                {expandedBasicFilters ? 'Less Filters' : 'More Filters'}
            </button>
        </div>
    </div>
    
    <!-- Quick Filter Pills -->
    <div class="flex flex-wrap gap-2 mb-4">
        <button 
            class="filter-pill {filters.favorite ? 'active' : ''}"
            on:click={() => filters.favorite = !filters.favorite}
        >
            <svg class="w-4 h-4 {filters.favorite ? 'text-yellow-400' : ''}" 
                fill={filters.favorite ? 'currentColor' : 'none'} 
                stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
            </svg>
            Favorites
        </button>
        
        <button 
            class="filter-pill {filters.profitableOnly ? 'active' : ''}"
            on:click={() => {
                filters.profitableOnly = !filters.profitableOnly;
                if (filters.profitableOnly) filters.unprofitableOnly = false;
            }}
        >
            <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
            </svg>
            Profitable
        </button>
        
        <button 
            class="filter-pill {filters.unprofitableOnly ? 'active' : ''}"
            on:click={() => {
                filters.unprofitableOnly = !filters.unprofitableOnly;
                if (filters.unprofitableOnly) filters.profitableOnly = false;
            }}
        >
            <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/>
            </svg>
            Unprofitable
        </button>
    </div>
    
    <!-- Status and Side Filters -->
    <div class="flex flex-wrap gap-2 mb-4">
        {#each statusOptions as option}
            <button 
                class="filter-pill {filters.status.includes(option.value) ? 'active' : ''}"
                on:click={() => {
                    if (filters.status.includes(option.value)) {
                        filters.status = filters.status.filter(s => s !== option.value);
                    } else {
                        filters.status = [...filters.status, option.value];
                    }
                }}
            >
                {option.label}
            </button>
        {/each}
        
        {#each sideOptions as option}
            <button 
                class="filter-pill {filters.side.includes(option.value) ? 'active' : ''}"
                on:click={() => {
                    if (filters.side.includes(option.value)) {
                        filters.side = filters.side.filter(s => s !== option.value);
                    } else {
                        filters.side = [...filters.side, option.value];
                    }
                }}
            >
                {option.label}
            </button>
        {/each}
    </div>
    
    <!-- Expanded Basic Filters -->
    {#if expandedBasicFilters}
        <div transition:slide={{ duration: 300 }} class="expanded-filters grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-light-border dark:border-dark-border">
            <!-- Date Range -->
            <div class="space-y-2">
                <label class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Date Range</label>
                <div class="flex gap-2 items-center">
                    <Input
                        type="date"
                        placeholder="Start Date"
                        bind:value={filters.dateRange.start}
                    />
                    <span class="text-light-text-muted dark:text-dark-text-muted">to</span>
                    <Input
                        type="date"
                        placeholder="End Date"
                        bind:value={filters.dateRange.end}
                    />
                </div>
            </div>
            
            <!-- Type Filters -->
            <div class="space-y-2">
                <label class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Trade Type</label>
                <div class="flex flex-wrap gap-2">
                    {#each typeOptions as option}
                        <button 
                            class="filter-pill {filters.type.includes(option.value) ? 'active' : ''}"
                            on:click={() => {
                                if (filters.type.includes(option.value)) {
                                    filters.type = filters.type.filter(t => t !== option.value);
                                } else {
                                    filters.type = [...filters.type, option.value];
                                }
                            }}
                        >
                            {option.label}
                        </button>
                    {/each}
                </div>
            </div>
        </div>
    {/if}
    
    <!-- Filter Tags Display -->
    {#if filters.tags.length > 0 || Object.values(filters).some(v => v && (Array.isArray(v) ? v.length > 0 : v !== ''))}
        <div class="mt-4 flex flex-wrap gap-2 items-center">
            <span class="text-sm text-light-text-muted dark:text-dark-text-muted">Active filters:</span>
            
            {#if filters.symbol}
                <div class="active-filter-tag">
                    Symbol: {filters.symbol}
                    <button on:click={() => filters.symbol = ''}>×</button>
                </div>
            {/if}
            
            {#each filters.status as status}
                <div class="active-filter-tag">
                    Status: {status}
                    <button on:click={() => filters.status = filters.status.filter(s => s !== status)}>×</button>
                </div>
            {/each}
            
            {#each filters.side as side}
                <div class="active-filter-tag">
                    Side: {side}
                    <button on:click={() => filters.side = filters.side.filter(s => s !== side)}>×</button>
                </div>
            {/each}
            
            {#if filters.dateRange.start || filters.dateRange.end}
                <div class="active-filter-tag">
                    Date: {filters.dateRange.start || 'Any'} to {filters.dateRange.end || 'Any'}
                    <button on:click={() => filters.dateRange = { start: '', end: '' }}>×</button>
                </div>
            {/if}
            
            {#each filters.type as type}
                <div class="active-filter-tag">
                    Type: {type}
                    <button on:click={() => filters.type = filters.type.filter(t => t !== type)}>×</button>
                </div>
            {/each}
            
            {#if filters.favorite}
                <div class="active-filter-tag">
                    Favorites only
                    <button on:click={() => filters.favorite = false}>×</button>
                </div>
            {/if}
            
            {#if filters.profitableOnly}
                <div class="active-filter-tag">
                    Profitable only
                    <button on:click={() => filters.profitableOnly = false}>×</button>
                </div>
            {/if}
            
            {#if filters.unprofitableOnly}
                <div class="active-filter-tag">
                    Unprofitable only
                    <button on:click={() => filters.unprofitableOnly = false}>×</button>
                </div>
            {/if}
            
            {#each filters.tags as tag}
                <div class="active-filter-tag">
                    Tag: {tag}
                    <button on:click={() => filters.tags = filters.tags.filter(t => t !== tag)}>×</button>
                </div>
            {/each}
        </div>
    {/if}
</div>

<!-- Advanced Filters Modal -->
<Modal
    bind:show={showAdvancedFilters}
    title="Advanced Filters"
    width="lg"
>
    <TradeAdvancedFilters 
        bind:filters={filters}
        on:apply={handleAdvancedFilters}
        on:cancel={() => showAdvancedFilters = false}
    />
</Modal>

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-0 rounded-lg shadow-sm;
    }
    
    .filter-pill {
        @apply px-3 py-1.5 text-sm rounded-full bg-light-hover dark:bg-dark-hover text-light-text-muted dark:text-dark-text-muted
        flex items-center gap-1.5 hover:bg-light-border dark:hover:bg-dark-border transition-colors;
    }
    
    .filter-pill.active {
        @apply bg-theme-500/10 text-theme-500 hover:bg-theme-500/20;
    }
    
    .active-filter-tag {
        @apply px-2 py-1 text-xs rounded-md bg-theme-500/10 text-theme-500 flex items-center gap-1;
    }
    
    .active-filter-tag button {
        @apply ml-1 text-theme-500 font-bold text-sm hover:text-theme-600;
    }
    
    :global(.search-input) {
        @apply pr-8;
    }
</style> 