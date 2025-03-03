<script>
    import { createEventDispatcher } from 'svelte';
    
    const dispatch = createEventDispatcher();
    
    export let operator = 'AND';
    export let index;
    
    function toggleOperator() {
        dispatch('toggle', { index, value: operator === 'AND' ? 'OR' : 'AND' });
    }
</script>

<div class="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10 logical-operator-container">
    <button 
        class="logical-operator {operator === 'AND' ? 'operator-and' : 'operator-or'} shadow-sm"
        on:click={toggleOperator}
        title="Click to toggle operator"
    >
        {operator}
    </button>
</div>

<style>
    .logical-operator {
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
        transition: all 0.2s ease;
    }
    
    .operator-and {
        background-color: #e0f2fe;
        color: #0369a1;
        border: 1px solid #7dd3fc;
    }
    
    .operator-or {
        background-color: #fae8ff;
        color: #a855f7;
        border: 1px solid #d8b4fe;
    }
    
    .operator-and:hover {
        background-color: #bae6fd;
    }
    
    .operator-or:hover {
        background-color: #f0abfc;
    }
</style> 