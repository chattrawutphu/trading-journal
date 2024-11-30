<!-- src/lib/components/common/Input.svelte -->
<script>
    export let type = 'text';
    export let value = '';
    export let placeholder = '';
    export let label = '';
    export let error = '';
    export let required = false;
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
    
    <input
      {type}
      {placeholder}
      {required}
      bind:value
      class="w-full bg-slate-700 border border-slate-600 rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500
             {error ? 'border-red-500' : ''}"
      on:input
      on:change
    />
    
    {#if error}
      <p class="mt-1 text-sm text-red-500">{error}</p>
    {/if}
  </div>
  