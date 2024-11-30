<!-- src/lib/components/layout/Navbar.svelte -->
<script>
    import { auth } from '$lib/stores/authStore';
    import { accountStore } from '$lib/stores/accountStore';
    import { goto } from '$app/navigation';
    import AccountManager from '../accounts/AccountManager.svelte';
  
    let showAccountMenu = false;
    let showUserMenu = false;
    let accountMenuRef;
    let userMenuRef;
  
    function handleLogout() {
      auth.logout();
      goto('/login');
    }

    function handleClickOutside(event) {
      // Handle account menu
      if (accountMenuRef && !accountMenuRef.contains(event.target)) {
        showAccountMenu = false;
      }
      // Handle user menu
      if (userMenuRef && !userMenuRef.contains(event.target)) {
        showUserMenu = false;
      }
    }
</script>
  
<nav class="bg-slate-800 border-b border-slate-700">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
            <div class="flex">
                <div class="flex-shrink-0 flex items-center">
                    <h1 class="text-2xl font-bold gradient-text">Trading Journal Pro</h1>
                </div>
            </div>
  
            {#if $auth?.isAuthenticated}
                <div class="flex items-center space-x-4">
                    <!-- Account Selector -->
                    <div class="relative" bind:this={accountMenuRef}>
                        <button 
                            class="flex items-center space-x-2 text-slate-300 hover:text-white"
                            on:click|stopPropagation={() => showAccountMenu = !showAccountMenu}
                        >
                            <span>{$accountStore?.currentAccount?.name || 'Select Account'}</span>
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
  
                        {#if showAccountMenu}
                            <div class="absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-slate-700 ring-1 ring-black ring-opacity-5 z-50">
                                <AccountManager on:close={() => showAccountMenu = false} />
                            </div>
                        {/if}
                    </div>
  
                    <!-- User Menu -->
                    <div class="relative" bind:this={userMenuRef}>
                        <button 
                            class="flex items-center space-x-2 text-slate-300 hover:text-white"
                            on:click|stopPropagation={() => showUserMenu = !showUserMenu}
                        >
                            <span>{$auth?.user?.name || 'User'}</span>
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
  
                        {#if showUserMenu}
                            <div class="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-slate-700 ring-1 ring-black ring-opacity-5 z-50">
                                <button
                                    class="block w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-600"
                                    on:click={() => goto('/profile')}
                                >
                                    Profile Settings
                                </button>
                                <button
                                    class="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-600"
                                    on:click={handleLogout}
                                >
                                    Logout
                                </button>
                            </div>
                        {/if}
                    </div>
                </div>
            {/if}
        </div>
    </div>
</nav>
  
<style>
    .gradient-text {
        background: linear-gradient(45deg, #3b82f6, #8b5cf6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
</style>
