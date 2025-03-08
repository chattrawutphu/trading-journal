<script>
    export let onClick = () => {};
    export let size = "md"; // xxs, xs, sm, md, lg
    export let theme = "primary"; // primary, secondary, subtle
    export let disabled = false;
    export let loading = false;
    export let label = "Ask AI"; // Added label prop for customization

    // Standardize size classes to match Button.svelte component
    $: sizeClasses = {
        xxs: 'px-1.5 py-0.5 text-[10px]',
        xs: 'px-2 py-1 text-xs',
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg'
    }[size] || sizeClasses.md;

    // Compute classes based on props
    $: buttonClasses = `
        ask-ai-button flex items-center gap-2 rounded-lg transition-all duration-300 relative overflow-hidden
        ${sizeClasses}
        ${theme === 'primary' 
            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl shadow-purple-500/20' 
            : theme === 'secondary' 
                ? 'bg-light-card dark:bg-dark-card text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover border border-light-border dark:border-dark-border' 
                : 'bg-theme-500/10 text-theme-500 hover:bg-theme-500/20'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    `;
</script>

<button 
    class={buttonClasses}
    on:click={onClick}
    {disabled}
    aria-label="Ask AI for trade analysis"
>
    <!-- Animated background particles for effect (ไม่แสดงเมื่อกำลังโหลด) -->
    <div class="absolute inset-0 overflow-hidden">
        {#if !disabled && !loading}
            <div class="particle-1"></div>
            <div class="particle-2"></div>
            <div class="particle-3"></div>
        {/if}
    </div>
    
    <!-- Icon and Text -->
    <div class="relative z-10 flex items-center gap-2">
        {#if loading}
            <!-- Loading spinner -->
            <div class="loading-spinner">
                <svg xmlns="http://www.w3.org/2000/svg" width="{size === 'lg' ? 20 : size === 'sm' || size === 'xs' || size === 'xxs' ? 14 : 16}" height="{size === 'lg' ? 20 : size === 'sm' || size === 'xs' || size === 'xxs' ? 14 : 16}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                </svg>
            </div>
        {:else}
            <!-- Restore original sparkle icon with all paths -->
            <svg xmlns="http://www.w3.org/2000/svg" 
                 width="{size === 'lg' ? 20 : size === 'sm' ? 16 : size === 'xs' || size === 'xxs' ? 14 : 18}" 
                 height="{size === 'lg' ? 20 : size === 'sm' ? 16 : size === 'xs' || size === 'xxs' ? 14 : 18}" 
                 viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sparkles-icon">
                <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"></path>
                <path d="M20 3v4"></path>
                <path d="M22 5h-4"></path>
                <path d="M4 17v2"></path>
                <path d="M5 18H3"></path>
            </svg>
        {/if}
        <span class="font-medium">{loading ? 'Analyzing...' : label}</span>
    </div>
</button>

<style>
    .ask-ai-button {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .ask-ai-button:hover:not(:disabled) {
        transform: translateY(-2px);
    }
    
    .ask-ai-button:active:not(:disabled) {
        transform: translateY(0);
    }
    
    /* แก้ไข loading spinner */
    .loading-spinner {
        display: inline-flex;
        animation: spin 1.5s linear infinite;
        transform-origin: center;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    /* Animated particles */
    .particle-1, .particle-2, .particle-3 {
        position: absolute;
        border-radius: 50%;
        opacity: 0;
        animation-duration: 3s;
        animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        animation-iteration-count: infinite;
    }
    
    .particle-1 {
        width: 12px;
        height: 12px;
        background: rgba(255, 255, 255, 0.4);
        top: 20%;
        left: 10%;
        animation-name: float-1;
        animation-delay: 0s;
    }
    
    .particle-2 {
        width: 8px;
        height: 8px;
        background: rgba(255, 255, 255, 0.2);
        top: 60%;
        left: 40%;
        animation-name: float-2;
        animation-delay: 0.6s;
    }
    
    .particle-3 {
        width: 10px;
        height: 10px;
        background: rgba(255, 255, 255, 0.3);
        top: 30%;
        left: 70%;
        animation-name: float-3;
        animation-delay: 1.2s;
    }
    
    @keyframes float-1 {
        0%, 100% { transform: translate(0, 0); opacity: 0; }
        20%, 80% { opacity: 0.6; }
        50% { transform: translate(100px, -15px); opacity: 0; }
    }
    
    @keyframes float-2 {
        0%, 100% { transform: translate(0, 0); opacity: 0; }
        20%, 80% { opacity: 0.5; }
        50% { transform: translate(-70px, -20px); opacity: 0; }
    }
    
    @keyframes float-3 {
        0%, 100% { transform: translate(0, 0); opacity: 0; }
        20%, 80% { opacity: 0.4; }
        50% { transform: translate(30px, -30px); opacity: 0; }
    }
    
    /* Pulse effect for the sparkles icon */
    .sparkles-icon {
        animation: sparkle 2s infinite;
    }
    
    @keyframes sparkle {
        0%, 100% { filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.3)); }
        50% { filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.7)); }
    }
</style> 