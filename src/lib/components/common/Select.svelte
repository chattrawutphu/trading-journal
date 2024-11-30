<!-- src/lib/components/common/Select.svelte -->
<script>
    export let options = [];
    export let value = '';
    export let label = '';
    export let error = '';
    export let required = false;
    export let placeholder = 'Select an option';
  </script>
  
  <div class="w-full">
    {#if label}
      <label class="block mb-2 text-sm font-medium">
        {label}
        {#if required}
          <span class="text-red-500">*</span>
        {/if}
      </label>
    {/if}
  
    <select
      bind:value
      {required}
      class="w-full bg-slate-700 border border-slate-600 rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500
             {error ? 'border-red-500' : ''}"
      on:change
    >
      <option value="">{placeholder}</option>
      {#each options as option}
        <option value={option.value}>
          {option.label}
        </option>
      {/each}
    </select>
  
    {#if error}
      <p class="mt-1 text-sm text-red-500">{error}</p>
    {/if}
  </div>
  