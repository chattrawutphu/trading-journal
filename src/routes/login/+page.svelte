<!-- src/routes/login/+page.svelte -->
<script>
    import { auth } from '$lib/stores/authStore';
    import { goto } from '$app/navigation';
    import ThemeToggle from '$lib/components/common/ThemeToggle.svelte';
    import Toast from '$lib/components/common/Toast.svelte';
    import { onMount } from 'svelte';

    let email = ''; // เปลี่ยนจาก identifier เป็น email
    let password = '';
    let error = '';
    let loading = false;
    let showToast = false;
    let toastMessage = '';
    let toastType = 'success';
    let remainingAttempts = 5;
    let isBlocked = false;
    let blockEndTime = 0;

    onMount(() => {
        checkLoginBlock();
    });

    function checkLoginBlock() {
        // Check if user is currently blocked
        const storedBlockEndTime = localStorage.getItem('loginBlockEndTime');
        const storedAttempts = localStorage.getItem('loginAttempts');
        
        if (storedBlockEndTime) {
            const endTime = parseInt(storedBlockEndTime);
            if (Date.now() < endTime) {
                blockEndTime = endTime;
                isBlocked = true;
                const remainingMinutes = Math.max(1, Math.ceil((endTime - Date.now()) / 60000));
                error = `Too many failed login attempts. Please try again in ${remainingMinutes} minutes.`;
            } else {
                // Block period is over, reset everything
                localStorage.removeItem('loginBlockEndTime');
                localStorage.removeItem('loginAttempts');
                remainingAttempts = 5;
                isBlocked = false;
                blockEndTime = 0;
            }
        }

        if (storedAttempts && !isBlocked) {
            remainingAttempts = 5 - parseInt(storedAttempts);
        }
    }

    const validateEmail = (email) => {
        return String(email)
            .toLowerCase()
            .match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    };

    async function handleSubmit() {
        // Recheck block status before proceeding
        checkLoginBlock();

        loading = true;
        error = '';
        showToast = false;

        // Check if user is blocked
        if (isBlocked) {
            const remainingMinutes = Math.max(1, Math.ceil((blockEndTime - Date.now()) / 60000));
            error = `Too many failed login attempts. Please try again in ${remainingMinutes} minutes.`;
            loading = false;
            return;
        }

        try {
            if (!email || !password) {
                throw new Error('Please fill in all fields');
            }

            if (!validateEmail(email)) {
                throw new Error('Please enter a valid email address');
            }

            const response = await auth.login(email, password);
            
            if (response.success) {
                // Reset attempts on successful login
                localStorage.removeItem('loginAttempts');
                localStorage.removeItem('loginBlockEndTime');
                isBlocked = false;
                blockEndTime = 0;
                remainingAttempts = 5;
                
                toastType = 'success';
                toastMessage = response.message || 'Welcome back! You have successfully signed in.';
                showToast = true;
                
                // Show success message for 2 seconds before redirecting
                await new Promise(resolve => setTimeout(resolve, 2000));
                goto('/dashboard');
            } else {
                throw new Error(response.message);
            }
        } catch (err) {
            // Handle failed attempt
            const currentAttempts = parseInt(localStorage.getItem('loginAttempts') || '0') + 1;
            localStorage.setItem('loginAttempts', currentAttempts.toString());
            remainingAttempts = 5 - currentAttempts;

            if (currentAttempts >= 5) {
                // Block user for 5 minutes
                blockEndTime = Date.now() + (5 * 60 * 1000); // 5 minutes
                localStorage.setItem('loginBlockEndTime', blockEndTime.toString());
                isBlocked = true;
                error = 'Too many failed login attempts. Please try again in 5 minutes.';
            } else {
                error = err.message || 'Login failed. Please try again.';
            }
        } finally {
            loading = false;
        }
    }
</script>

<div class="min-h-screen flex bg-light-bg dark:bg-dark-bg">
    <!-- Left Section - Same as register page -->
    <div class="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <!-- Theme toggle in top-right of left section -->
        <div class="absolute top-4 right-4 z-10">
            <ThemeToggle />
        </div>
        
        <!-- Gradient Background -->
        <div class="absolute inset-0 bg-gradient-to-br from-theme-500/20 to-theme-600/20 dark:from-theme-500/10 dark:to-theme-600/10" />
        
        <!-- Content -->
        <div class="relative w-full flex flex-col justify-center px-12">
            <h1 class="text-5xl font-bold bg-gradient-purple bg-clip-text text-transparent mb-6">
                Trading Journal Pro
            </h1>
            <p class="text-xl text-light-text dark:text-dark-text mb-8">
                Track your trades, analyze your performance, and become a better trader.
            </p>
            
            <!-- Features List -->
            <div class="space-y-4">
                {#each [
                    'Advanced trade tracking and analysis',
                    'Real-time performance metrics',
                    'Multiple account management',
                    'Customizable dashboard',
                    'Trade journal with notes and images'
                ] as feature}
                    <div class="flex items-center gap-3">
                        <div class="flex-shrink-0 w-5 h-5 rounded-full bg-theme-500/20 flex items-center justify-center">
                            <svg class="w-3 h-3 text-theme-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <span class="text-light-text dark:text-dark-text">{feature}</span>
                    </div>
                {/each}
            </div>
        </div>
    </div>

    <!-- Right Section - Login Form -->
    <div class="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div class="w-full max-w-md space-y-8">
            <div class="text-center">
                <!-- Show logo only on mobile -->
                <div class="lg:hidden mb-8">
                    <h1 class="text-4xl font-bold bg-gradient-purple bg-clip-text text-transparent">
                        Trading Journal Pro
                    </h1>
                </div>
                <h2 class="text-2xl font-bold text-light-text dark:text-dark-text">
                    Sign in to your account
                </h2>
                <p class="mt-2 text-light-text-muted dark:text-dark-text-muted">
                    Start your trading journey today
                </p>
            </div>

            <!-- Social Login -->
            <div class="grid grid-cols-2 gap-4">
                <button class="btn-secondary flex items-center justify-center space-x-2">
                    <svg class="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                    </svg>
                    <span>Google</span>
                </button>
                <button class="btn-secondary flex items-center justify-center space-x-2">
                    <svg class="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    <span>GitHub</span>
                </button>
            </div>

            <div class="relative">
                <div class="absolute inset-0 flex items-center">
                    <div class="w-full border-t border-light-border dark:border-0"></div>
                </div>
                <div class="relative flex justify-center text-sm">
                    <span class="px-2 bg-light-bg dark:bg-dark-bg text-light-text-muted dark:text-dark-text-muted">Or continue with</span>
                </div>
            </div>

            <!-- Login Form -->
            <form class="space-y-4" on:submit|preventDefault={handleSubmit}>
                {#if error}
                    <div class="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500/50 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg relative" role="alert">
                        <span class="block sm:inline">{error}</span>
                        {#if !isBlocked && remainingAttempts < 5}
                            <div class="mt-1 text-sm opacity-75">
                                {remainingAttempts} {remainingAttempts === 1 ? 'attempt' : 'attempts'} remaining before temporary lockout.
                            </div>
                        {/if}
                    </div>
                {/if}

                <div class="space-y-3">
                    <div>
                        <label for="email" class="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                            Email address
                        </label>
                        <input
                            id="email"
                            type="email"
                            bind:value={email}
                            required
                            class="input w-full h-9 text-sm"
                            placeholder="Enter your email"
                        />
                    </div>

                    <div>
                        <label for="password" class="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            bind:value={password}
                            required
                            class="input w-full h-9 text-sm"
                            placeholder="Enter your password"
                        />
                    </div>
                </div>

                <div class="mt-4 space-y-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            <input
                                id="remember-me"
                                type="checkbox"
                                class="h-4 w-4 rounded border-light-border dark:border-dark-border text-theme-500 focus:ring-theme-500"
                            />
                            <label for="remember-me" class="ml-2 block text-sm text-light-text dark:text-dark-text">
                                Remember me
                            </label>
                        </div>

                        <a href="/forgot-password" class="text-sm text-theme-500 hover:text-theme-600">
                            Forgot password?
                        </a>
                    </div>

                    <button
                        type="submit"
                        class="btn-primary w-full flex justify-center h-9 text-sm"
                        disabled={loading}
                    >
                        {#if loading}
                            <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Signing in...
                        {:else}
                            Sign in
                        {/if}
                    </button>
                </div>
            </form>

            <p class="text-center text-sm text-light-text-muted dark:text-dark-text-muted">
                Not a member?
                <a href="/register" class="text-theme-500 hover:text-theme-600 font-medium">
                    Create an account
                </a>
            </p>
        </div>
    </div>
</div>

<Toast 
    bind:show={showToast}
    message={toastMessage}
    type={toastType}
    duration={3000}
/>
