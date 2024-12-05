<!-- src/routes/register/+page.svelte -->
<script>
    import { auth } from '$lib/stores/authStore';
    import { goto } from '$app/navigation';
    import ThemeToggle from '$lib/components/common/ThemeToggle.svelte';

    let name = '';
    let email = '';
    let password = '';
    let confirmPassword = '';
    let error = '';
    let loading = false;

    async function handleSubmit() {
        loading = true;
        error = '';

        if (password !== confirmPassword) {
            error = 'Passwords do not match';
            loading = false;
            return;
        }

        try {
            const userData = {
                name,
                email,
                password
            };
            await auth.register(userData);
            goto('/dashboard');
        } catch (err) {
            error = err.message || 'Registration failed. Please try again.';
        } finally {
            loading = false;
        }
    }
</script>

<div class="min-h-screen flex flex-col bg-light-bg dark:bg-dark-bg transition-colors duration-200">
    <!-- Header with theme toggle -->
    <div class="absolute top-4 right-4">
        <ThemeToggle />
    </div>

    <div class="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div class="w-full max-w-md space-y-8">
            <!-- Logo and Title -->
            <div class="text-center">
                <h1 class="text-4xl font-bold bg-gradient-purple bg-clip-text text-transparent mb-2">
                    Trading Journal Pro
                </h1>
                <p class="text-light-text-muted dark:text-dark-text-muted">
                    Create your account
                </p>
            </div>

            <!-- Social Registration Buttons -->
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
                    <div class="w-full border-t border-light-border dark:border-dark-border"></div>
                </div>
                <div class="relative flex justify-center text-sm">
                    <span class="px-2 bg-light-bg dark:bg-dark-bg text-light-text-muted dark:text-dark-text-muted">Or continue with</span>
                </div>
            </div>

            <!-- Registration Form -->
            <form class="space-y-6" on:submit|preventDefault={handleSubmit}>
                {#if error}
                    <div class="bg-red-500 bg-opacity-10 text-red-500 p-3 rounded-lg text-sm">
                        {error}
                    </div>
                {/if}

                <div>
                    <label for="name" class="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                        Full Name
                    </label>
                    <input
                        id="name"
                        type="text"
                        bind:value={name}
                        required
                        class="input w-full"
                        placeholder="Enter your full name"
                    />
                </div>

                <div>
                    <label for="email" class="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                        Email address
                    </label>
                    <input
                        id="email"
                        type="email"
                        bind:value={email}
                        required
                        class="input w-full"
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
                        class="input w-full"
                        placeholder="Create a password"
                    />
                </div>

                <div>
                    <label for="confirm-password" class="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                        Confirm Password
                    </label>
                    <input
                        id="confirm-password"
                        type="password"
                        bind:value={confirmPassword}
                        required
                        class="input w-full"
                        placeholder="Confirm your password"
                    />
                </div>

                <div class="flex items-center">
                    <input
                        id="terms"
                        type="checkbox"
                        required
                        class="h-4 w-4 rounded border-light-border dark:border-dark-border text-theme-600 focus:ring-theme-500"
                    />
                    <label for="terms" class="ml-2 block text-sm text-light-text dark:text-dark-text">
                        I agree to the
                        <a href="/terms" class="link">Terms of Service</a>
                        and
                        <a href="/privacy" class="link">Privacy Policy</a>
                    </label>
                </div>

                <button
                    type="submit"
                    class="btn-primary w-full flex justify-center"
                    disabled={loading}
                >
                    {#if loading}
                        <svg class="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating account...
                    {:else}
                        Create account
                    {/if}
                </button>
            </form>

            <p class="text-center text-sm text-light-text-muted dark:text-dark-text-muted">
                Already have an account?
                <a href="/login" class="link font-medium">
                    Sign in
                </a>
            </p>
        </div>
    </div>
</div>
