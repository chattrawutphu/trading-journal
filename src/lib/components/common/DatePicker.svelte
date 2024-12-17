<script>
    export let selectedMonth;
    export let selectedYear;
    export let showDatePicker;
    export let months;
    export let years;

    import { onMount, onDestroy } from 'svelte';

    let datePickerElement;

    function toggleDatePicker() {
        showDatePicker = !showDatePicker;
    }

    function selectDate(month, year) {
        selectedMonth = month;
        selectedYear = year;
        showDatePicker = false;
    }

    function handleClickOutside(event) {
        if (datePickerElement && !datePickerElement.contains(event.target)) {
            showDatePicker = false;
        }
    }

    onMount(() => {
        document.addEventListener('mousedown', handleClickOutside); // ใช้ 'mousedown' แทน 'click'
    });

    onDestroy(() => {
        document.removeEventListener('mousedown', handleClickOutside);
    });
</script>

{#if showDatePicker}
    <div bind:this={datePickerElement} class="absolute top-7 left-0 z-10 mt-2 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-lg p-3 w-56 backdrop-blur-sm" on:click|stopPropagation>
        <div class="flex justify-between items-center mb-2">
            <button 
                on:click={() => selectedMonth = (selectedMonth - 1 + 12) % 12}
                class="p-1 rounded-md hover:bg-light-hover dark:hover:bg-dark-hover text-xs dark:text-dark-text"
            >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
            </button>
            
            <div class="text-center">
                <span class="text-xs font-medium text-light-text dark:text-dark-text">
                    {months[selectedMonth]}
                </span>
                <span class="ml-1 text-xs font-medium text-light-text dark:text-dark-text">
                    {selectedYear}
                </span>
            </div>
            
            <button 
                on:click={() => selectedMonth = (selectedMonth + 1) % 12}
                class="p-1 rounded-md hover:bg-light-hover dark:hover:bg-dark-hover text-xs dark:text-dark-text"
            >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
            </button>
        </div>

        <div class="grid grid-cols-3 gap-1 mt-3">
            {#each months as month, index}
                <button 
                    on:click={() => selectDate(index, selectedYear)}
                    class="px-2 py-1 text-xs font-medium text-center rounded-md
                        {selectedMonth === index 
                            ? 'bg-theme-500 text-white' 
                            : 'bg-light-hover dark:bg-dark-hover text-light-text dark:text-dark-text hover:bg-theme-500 hover:text-white'}"
                >
                    {month.slice(0,3)}
                </button>
            {/each}
        </div>

        <div class="mt-3 flex justify-between items-center border-t border-light-border dark:border-dark-border pt-3">
            <select 
                bind:value={selectedYear} 
                class="flex-1 px-2 py-0.5 rounded-md bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border text-xs dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-theme-500"
            >
                {#each years as year}
                    <option value={year}>{year}</option>
                {/each}
            </select>
        </div>
    </div>
{/if}

<style>
    .grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
    }
    select {
        appearance: none;
        background-repeat: no-repeat;
        background-position: right 0.5rem center;
        background-size: 1rem;
    }
</style>
