<script>
    import { createEventDispatcher } from 'svelte';
    import Button from '../common/Button.svelte';
    import Input from '../common/Input.svelte';
    import Select from '../common/Select.svelte';
    import TradeOptionSelect from './TradeOptionSelect.svelte';
    import { tradeTagStore, loadTags } from '$lib/stores/tradeTagStore';
    import { onMount } from 'svelte';
    
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
        leverage: {
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
    
    let localFilters = JSON.parse(JSON.stringify(filters));
    let selectedTag = '';
    
    const emotionOptions = [
        { value: "neutral", label: "😐 Neutral" },
        { value: "confident", label: "😊 Confident" },
        { value: "fearful", label: "😨 Fearful" },
        { value: "angry", label: "😡 Angry" },
        { value: "disappointed", label: "😔 Disappointed" },
        { value: "uncertain", label: "🤔 Uncertain" },
        { value: "calm", label: "😌 Calm" },
        { value: "frustrated", label: "😤 Frustrated" },
        { value: "excited", label: "🤩 Excited" },
        { value: "anxious", label: "😰 Anxious" },
    ];
    
    const booleanOptions = [
        { value: null, label: "Any" },
        { value: true, label: "Yes" },
        { value: false, label: "No" }
    ];
    
    onMount(() => {
        loadTags();
        localFilters = JSON.parse(JSON.stringify(filters));
    });
    
    function applyFilters() {
        dispatch('apply', localFilters);
    }
    
    function cancelFilters() {
        dispatch('cancel');
    }
    
    function resetFilters() {
        localFilters = {
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
            leverage: {
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
    }
    
    function handleTagSelect(event) {
        const tag = event.detail.value;
        if (!localFilters.tags.includes(tag)) {
            localFilters.tags = [...localFilters.tags, tag];
        }
        selectedTag = '';
    }
    
    function removeTag(tag) {
        localFilters.tags = localFilters.tags.filter(t => t !== tag);
    }
    
    function getTagColor(tag) {
        const colors = [
            { bg: 'bg-blue-500/10', text: 'text-blue-500' },
            { bg: 'bg-green-500/10', text: 'text-green-500' },
            { bg: 'bg-purple-500/10', text: 'text-purple-500' },
            { bg: 'bg-orange-500/10', text: 'text-orange-500' },
            { bg: 'bg-pink-500/10', text: 'text-pink-500' },
            { bg: 'bg-teal-500/10', text: 'text-teal-500' },
            { bg: 'bg-indigo-500/10', text: 'text-indigo-500' },
        ];
        
        const hash = tag.split('').reduce((acc, char) => {
            return char.charCodeAt(0) + ((acc << 5) - acc);
        }, 0);
        
        return colors[Math.abs(hash) % colors.length];
    }
</script>

<div class="p-2 space-y-6 max-h-[70vh] overflow-y-auto">
    <!-- Basic Filters Section -->
    <div>
        <h3 class="text-md font-semibold mb-4 pb-2 border-b border-light-border dark:border-dark-border">
            Basic Filters
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Symbol -->
            <div>
                <label class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">
                    Symbol
                </label>
                <Input 
                    type="text"
                    placeholder="Filter by symbol..."
                    bind:value={localFilters.symbol}
                />
            </div>
            
            <!-- Strategy -->
            <div>
                <label class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">
                    Strategy
                </label>
                <TradeOptionSelect
                    type="STRATEGY"
                    bind:value={localFilters.strategy}
                    placeholder="Filter by strategy..."
                />
            </div>
            
            <!-- Status + Side -->
            <div class="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Status -->
                <div>
                    <label class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">
                        Status
                    </label>
                    <div class="flex flex-wrap gap-2">
                        <label class="filter-checkbox">
                            <input type="checkbox" 
                                checked={localFilters.status.includes('OPEN')}
                                on:change={e => {
                                    if (e.target.checked) {
                                        if (!localFilters.status.includes('OPEN')) {
                                            localFilters.status = [...localFilters.status, 'OPEN'];
                                        }
                                    } else {
                                        localFilters.status = localFilters.status.filter(s => s !== 'OPEN');
                                    }
                                }}
                            />
                            <span>Open</span>
                        </label>
                        <label class="filter-checkbox">
                            <input type="checkbox" 
                                checked={localFilters.status.includes('CLOSED')}
                                on:change={e => {
                                    if (e.target.checked) {
                                        if (!localFilters.status.includes('CLOSED')) {
                                            localFilters.status = [...localFilters.status, 'CLOSED'];
                                        }
                                    } else {
                                        localFilters.status = localFilters.status.filter(s => s !== 'CLOSED');
                                    }
                                }}
                            />
                            <span>Closed</span>
                        </label>
                    </div>
                </div>
                
                <!-- Side -->
                <div>
                    <label class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">
                        Side
                    </label>
                    <div class="flex flex-wrap gap-2">
                        <label class="filter-checkbox">
                            <input type="checkbox" 
                                checked={localFilters.side.includes('LONG')}
                                on:change={e => {
                                    if (e.target.checked) {
                                        if (!localFilters.side.includes('LONG')) {
                                            localFilters.side = [...localFilters.side, 'LONG'];
                                        }
                                    } else {
                                        localFilters.side = localFilters.side.filter(s => s !== 'LONG');
                                    }
                                }}
                            />
                            <span>Long</span>
                        </label>
                        <label class="filter-checkbox">
                            <input type="checkbox" 
                                checked={localFilters.side.includes('SHORT')}
                                on:change={e => {
                                    if (e.target.checked) {
                                        if (!localFilters.side.includes('SHORT')) {
                                            localFilters.side = [...localFilters.side, 'SHORT'];
                                        }
                                    } else {
                                        localFilters.side = localFilters.side.filter(s => s !== 'SHORT');
                                    }
                                }}
                            />
                            <span>Short</span>
                        </label>
                    </div>
                </div>
            </div>
            
            <!-- Date Range -->
            <div class="col-span-1 md:col-span-2">
                <label class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">
                    Date Range
                </label>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Input
                        type="date"
                        placeholder="Start Date"
                        bind:value={localFilters.dateRange.start}
                    />
                    <Input
                        type="date"
                        placeholder="End Date"
                        bind:value={localFilters.dateRange.end}
                    />
                </div>
            </div>
        </div>
    </div>
    
    <!-- Performance Filters Section -->
    <div>
        <h3 class="text-md font-semibold mb-4 pb-2 border-b border-light-border dark:border-dark-border">
            Performance Filters
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Profit/Loss Filter -->
            <div>
                <label class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">
                    P&L Result
                </label>
                <div class="flex flex-wrap gap-2">
                    <label class="filter-checkbox">
                        <input type="checkbox" 
                            bind:checked={localFilters.profitableOnly}
                            on:change={() => {
                                if (localFilters.profitableOnly) {
                                    localFilters.unprofitableOnly = false;
                                }
                            }}
                        />
                        <span>Profitable Only</span>
                    </label>
                    <label class="filter-checkbox">
                        <input type="checkbox" 
                            bind:checked={localFilters.unprofitableOnly}
                            on:change={() => {
                                if (localFilters.unprofitableOnly) {
                                    localFilters.profitableOnly = false;
                                }
                            }}
                        />
                        <span>Unprofitable Only</span>
                    </label>
                    <label class="filter-checkbox">
                        <input type="checkbox" 
                            bind:checked={localFilters.excludeZeroPnL}
                        />
                        <span>Exclude Zero P&L</span>
                    </label>
                </div>
            </div>
            
            <!-- P&L Amount Range -->
            <div>
                <label class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">
                    P&L Amount Range
                </label>
                <div class="grid grid-cols-2 gap-2">
                    <Input
                        type="number"
                        placeholder="Min P&L"
                        bind:value={localFilters.pnl.min}
                    />
                    <Input
                        type="number"
                        placeholder="Max P&L"
                        bind:value={localFilters.pnl.max}
                    />
                </div>
            </div>
            
            <!-- P&L Percentage Range -->
            <div>
                <label class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">
                    P&L Percentage Range
                </label>
                <div class="grid grid-cols-2 gap-2">
                    <Input
                        type="number"
                        placeholder="Min %"
                        bind:value={localFilters.pnlPercentage.min}
                    />
                    <Input
                        type="number"
                        placeholder="Max %"
                        bind:value={localFilters.pnlPercentage.max}
                    />
                </div>
            </div>
            
            <!-- Trade Amount Range -->
            <div>
                <label class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">
                    Trade Size Range
                </label>
                <div class="grid grid-cols-2 gap-2">
                    <Input
                        type="number"
                        placeholder="Min Amount"
                        bind:value={localFilters.amount.min}
                    />
                    <Input
                        type="number"
                        placeholder="Max Amount"
                        bind:value={localFilters.amount.max}
                    />
                </div>
            </div>
        </div>
    </div>
    
    <!-- Trading Psychology Section -->
    <div>
        <h3 class="text-md font-semibold mb-4 pb-2 border-b border-light-border dark:border-dark-border">
            Trading Psychology
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Emotions -->
            <div>
                <label class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">
                    Emotions
                </label>
                <div class="emotion-grid grid grid-cols-2 gap-2">
                    {#each emotionOptions as emotion}
                        <label class="filter-checkbox emotion-checkbox">
                            <input type="checkbox" 
                                checked={localFilters.emotions.includes(emotion.value)}
                                on:change={e => {
                                    if (e.target.checked) {
                                        if (!localFilters.emotions.includes(emotion.value)) {
                                            localFilters.emotions = [...localFilters.emotions, emotion.value];
                                        }
                                    } else {
                                        localFilters.emotions = localFilters.emotions.filter(em => em !== emotion.value);
                                    }
                                }}
                            />
                            <span>{emotion.label}</span>
                        </label>
                    {/each}
                </div>
            </div>
            
            <!-- Confidence & Greed Levels -->
            <div class="space-y-4">
                <!-- Confidence Level -->
                <div>
                    <label class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-2">
                        Confidence Level ({localFilters.confidenceLevel.min} - {localFilters.confidenceLevel.max})
                    </label>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <input 
                                type="range" 
                                min="1" 
                                max="10" 
                                step="1" 
                                bind:value={localFilters.confidenceLevel.min}
                                class="w-full h-2 bg-light-border dark:bg-dark-hover rounded-lg appearance-none cursor-pointer
                                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-theme-500
                                [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
                                [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-theme-500"
                            />
                            <div class="text-center text-xs mt-1">Min: {localFilters.confidenceLevel.min}</div>
                        </div>
                        <div>
                            <input 
                                type="range" 
                                min="1" 
                                max="10" 
                                step="1" 
                                bind:value={localFilters.confidenceLevel.max}
                                class="w-full h-2 bg-light-border dark:bg-dark-hover rounded-lg appearance-none cursor-pointer
                                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-theme-500
                                [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
                                [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-theme-500"
                            />
                            <div class="text-center text-xs mt-1">Max: {localFilters.confidenceLevel.max}</div>
                        </div>
                    </div>
                </div>
                
                <!-- Greed Level -->
                <div>
                    <label class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-2">
                        Greed Level ({localFilters.greedLevel.min} - {localFilters.greedLevel.max})
                    </label>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <input 
                                type="range" 
                                min="1" 
                                max="10" 
                                step="1" 
                                bind:value={localFilters.greedLevel.min}
                                class="w-full h-2 bg-light-border dark:bg-dark-hover rounded-lg appearance-none cursor-pointer
                                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-theme-500
                                [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
                                [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-theme-500"
                            />
                            <div class="text-center text-xs mt-1">Min: {localFilters.greedLevel.min}</div>
                        </div>
                        <div>
                            <input 
                                type="range" 
                                min="1" 
                                max="10" 
                                step="1" 
                                bind:value={localFilters.greedLevel.max}
                                class="w-full h-2 bg-light-border dark:bg-dark-hover rounded-lg appearance-none cursor-pointer
                                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-theme-500
                                [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
                                [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-theme-500"
                            />
                            <div class="text-center text-xs mt-1">Max: {localFilters.greedLevel.max}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Trade Management Section -->
    <div>
        <h3 class="text-md font-semibold mb-4 pb-2 border-b border-light-border dark:border-dark-border">
            Trade Management
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Risk Management -->
            <div>
                <label class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">
                    Risk Management
                </label>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block text-xs text-light-text-muted dark:text-dark-text-muted mb-1">
                            Stop Loss
                        </label>
                        <Select 
                            options={booleanOptions} 
                            bind:value={localFilters.hasStopLoss}
                        />
                    </div>
                    <div>
                        <label class="block text-xs text-light-text-muted dark:text-dark-text-muted mb-1">
                            Take Profit
                        </label>
                        <Select 
                            options={booleanOptions} 
                            bind:value={localFilters.hasTakeProfit}
                        />
                    </div>
                </div>
            </div>
            
            <!-- Trade Type & Status -->
            <div>
                <label class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">
                    Trade Properties
                </label>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block text-xs text-light-text-muted dark:text-dark-text-muted mb-1">
                            Disabled Trades
                        </label>
                        <Select 
                            options={booleanOptions} 
                            bind:value={localFilters.disabled}
                        />
                    </div>
                    <div>
                        <label class="block text-xs text-light-text-muted dark:text-dark-text-muted mb-1">
                            Position History
                        </label>
                        <Select 
                            options={[
                                { value: false, label: "Any" },
                                { value: true, label: "Has Position History" }
                            ]} 
                            bind:value={localFilters.positionHistory}
                        />
                    </div>
                </div>
            </div>
            
            <!-- Tags -->
            <div class="col-span-1 md:col-span-2">
                <label class="block text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-1">
                    Tags
                </label>
                <div class="space-y-2">
                    <TradeOptionSelect
                        type="TAG"
                        placeholder="Filter by tags..."
                        bind:value={selectedTag}
                        options={$tradeTagStore.tags}
                        on:change={handleTagSelect}
                        loading={$tradeTagStore.loading}
                        error={$tradeTagStore.error}
                    />
                    
                    {#if localFilters.tags.length > 0}
                        <div class="flex flex-wrap gap-2 mt-2">
                            {#each localFilters.tags as tag}
                                {@const tagColor = getTagColor(tag)}
                                <div class="flex items-center gap-1 px-2 py-1 rounded-full {tagColor.bg} {tagColor.text} text-sm">
                                    <span>{tag}</span>
                                    <button
                                        type="button"
                                        class="hover:opacity-75"
                                        on:click={() => removeTag(tag)}
                                    >
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                        </svg>
                                    </button>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </div>
    
    <!-- Footer with action buttons -->
    <div class="flex justify-end gap-2 pt-4 border-t border-light-border dark:border-dark-border">
        <Button variant="secondary" size="sm" on:click={resetFilters}>Reset All</Button>
        <Button variant="secondary" size="sm" on:click={cancelFilters}>Cancel</Button>
        <Button variant="primary" size="sm" on:click={applyFilters}>Apply Filters</Button>
    </div>
</div>

<style lang="postcss">
    .filter-checkbox {
        @apply flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full
        bg-light-hover dark:bg-dark-hover text-light-text-muted dark:text-dark-text-muted
        transition-colors cursor-pointer hover:bg-light-border dark:hover:bg-dark-border;
    }
    
    .filter-checkbox input {
        @apply appearance-none w-4 h-4 rounded-sm border border-light-border dark:border-dark-border
        checked:bg-theme-500 checked:border-theme-500 relative shrink-0;
    }
    
    .filter-checkbox input:checked::after {
        content: "";
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 8px;
        height: 8px;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%23fff' viewBox='0 0 24 24'%3E%3Cpath d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z'/%3E%3C/svg%3E");
        background-size: contain;
        background-repeat: no-repeat;
    }
    
    .emotion-checkbox {
        @apply px-2 py-1;
    }
</style> 