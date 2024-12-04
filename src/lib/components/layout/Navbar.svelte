<!-- src/lib/components/layout/Navbar.svelte -->
<script>
    import { auth } from '$lib/stores/authStore';
    import { accountStore } from '$lib/stores/accountStore';
    import { goto } from '$app/navigation';
    import AccountManager from '../accounts/AccountManager.svelte';
    import ThemeToggle from '../common/ThemeToggle.svelte';
  
    let showAccountMenu = false;
    let showUserMenu = false;
    let accountMenuRef;
    let userMenuRef;
  
    function handleLogout() {
      auth.logout();
      goto('/login');
    }

    function handleClickOutside(event) {
      if (accountMenuRef && !accountMenuRef.contains(event.target)) {
        showAccountMenu = false;
      }
      if (userMenuRef && !userMenuRef.contains(event.target)) {
        showUserMenu = false;
      }
    }

    function formatBalance(balance) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(balance || 0);
    }
</script>

<svelte:window on:click={handleClickOutside}/>
  
<nav class>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
            <!-- Balance Display -->
            {#if $auth?.isAuthenticated && $accountStore?.currentAccount}
                <div class="flex items-center">
                    <div class="text-light-text dark:text-dark-text">
                        <span class="text-light-text-muted dark:text-dark-text-muted mr-2">Balance:</span>
                        <span class="font-semibold text-theme-500">{formatBalance($accountStore.currentAccount.balance)}</span>
                    </div>
                </div>
            {/if}

            {#if $auth?.isAuthenticated}
                <div class="flex items-center space-x-4">
                    <!-- Theme Toggle -->
                    <ThemeToggle />

                    <!-- Account Selector -->
                    <div class="relative" bind:this={accountMenuRef}>
                        <button 
                            class="flex items-center space-x-2 text-light-text dark:text-dark-text hover:text-theme-500 dark:hover:text-theme-400 transition-colors duration-200"
                            on:click|stopPropagation={() => showAccountMenu = !showAccountMenu}
                        >
                            <span>{$accountStore?.currentAccount?.name || 'Select Account'}</span>
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                            </svg>
                        </button>
  
                        {#if showAccountMenu}
                            <div class="absolute right-0 mt-2 w-64 rounded-lg shadow-lg bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border ring-1 ring-black ring-opacity-5 z-50 transition-colors duration-200">
                                <AccountManager on:close={() => showAccountMenu = false} />
                            </div>
                        {/if}
                    </div>
  
                    <!-- User Menu -->
                    <div class="relative" bind:this={userMenuRef}>
                        <button class="flex items-center space-x-2 text-light-text dark:text-dark-text hover:text-theme-500 dark:hover:text-theme-400 transition-colors duration-200"
                            on:click|stopPropagation={() => showUserMenu = !showUserMenu}
                        >
                            <span>{$auth?.user?.name || 'User'}</span>
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                            </svg>
                        </button>
  
                        {#if showUserMenu}
                            <div class="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border ring-1 ring-black ring-opacity-5 z-50 transition-colors duration-200">
                                <button
                                    class="block w-full text-left px-4 py-2 text-sm text-light-text dark:text-dark-text hover:bg-light-hover dark:hover:bg-dark-hover transition-colors duration-200"
                                    on:click={() => goto('/profile')}
                                >
                                    Profile Settings
                                </button>
                                <button
                                    class="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-light-hover dark:hover:bg-dark-hover transition-colors duration-200"
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
