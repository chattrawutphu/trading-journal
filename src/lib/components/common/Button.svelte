<!-- src/lib/components/common/Button.svelte -->
<script>
    export let type = 'button';
    export let variant = 'primary';
    export let disabled = false;
  
    const variants = {
      primary: 'btn-glow bg-blue-600 text-white hover:bg-blue-700',
      secondary: 'bg-slate-600 text-white hover:bg-slate-700',
      danger: 'bg-red-600 text-white hover:bg-red-700'
    };
  </script>
  
  <button
    {type}
    {disabled}
    class="px-4 py-2 rounded-lg transition-colors {variants[variant]}"
    on:click
  >
    <slot />
  </button>
  
  <style>
    .btn-glow {
      position: relative;
      z-index: 0;
      overflow: hidden;
    }
  
    .btn-glow:before {
      content: '';
      background: linear-gradient(45deg, #ff0000, #ff7300, #fffb00, #48ff00, #00ffd5, #002bff, #7a00ff, #ff00c8, #ff0000);
      position: absolute;
      top: -2px;
      left: -2px;
      background-size: 400%;
      z-index: -1;
      filter: blur(5px);
      width: calc(100% + 4px);
      height: calc(100% + 4px);
      animation: glowing 20s linear infinite;
      opacity: 0;
      transition: opacity .3s ease-in-out;
    }
  
    .btn-glow:hover:before {
      opacity: 1;
    }
  
    @keyframes glowing {
      0% { background-position: 0 0; }
      50% { background-position: 400% 0; }
      100% { background-position: 0 0; }
    }
  </style>
  