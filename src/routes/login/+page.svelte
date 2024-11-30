<!-- src/routes/login/+page.svelte -->
<script>
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { auth } from '$lib/stores/authStore';
    import Button from '$lib/components/common/Button.svelte';
    import Input from '$lib/components/common/Input.svelte';

    let email = '';
    let password = '';
    let rememberMe = false;
    let error = '';

    onMount(() => {
        // If already authenticated, redirect to dashboard
        if ($auth?.isAuthenticated) {
            goto('/dashboard');
        }
    });

    async function handleSubmit() {
        try {
            error = '';
            await auth.login(email, password);
            goto('/dashboard');
        } catch (err) {
            error = err.message;
        }
    }
</script>

<div class="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <!-- Logo/Brand -->
        <h1 class="text-4xl font-bold text-center gradient-text mb-8">
            Trading Journal Pro
        </h1>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div class="bg-slate-800 py-8 px-4 shadow-xl rounded-lg sm:px-10">
            <form class="space-y-6" on:submit|preventDefault={handleSubmit}>
                <!-- Error Message -->
                {#if error}
                    <div class="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-2 rounded">
                        {error}
                    </div>
                {/if}

                <!-- Email -->
                <Input
                    label="Email"
                    type="email"
                    bind:value={email}
                    required
                    placeholder="Enter your email"
                    autocomplete="email"
                />

                <!-- Password -->
                <Input
                    label="Password"
                    type="password"
                    bind:value={password}
                    required
                    placeholder="Enter your password"
                    autocomplete="current-password"
                />

                <!-- Remember Me -->
                <div class="flex items-center justify-between">
                    <label class="flex items-center">
                        <input
                            type="checkbox"
                            bind:checked={rememberMe}
                            class="form-checkbox text-blue-500"
                        />
                        <span class="ml-2 text-sm text-slate-300">Remember me</span>
                    </label>

                    <div class="text-sm">
                        <a href="/forgot-password" class="text-blue-400 hover:text-blue-300">
                            Forgot your password?
                        </a>
                    </div>
                </div>

                <!-- Submit Button -->
                <Button
                    type="submit"
                    variant="primary"
                    class="w-full"
                    disabled={$auth.loading}
                >
                    {#if $auth.loading}
                        <div class="spinner mr-2"></div>
                        Signing in...
                    {:else}
                        Sign in
                    {/if}
                </Button>

                <!-- Register Link -->
                <div class="text-center text-sm">
                    <span class="text-slate-400">Don't have an account?</span>
                    <a href="/register" class="text-blue-400 hover:text-blue-300 ml-1">
                        Create one now
                    </a>
                </div>
            </form>
        </div>
    </div>
</div>

<style>
    .gradient-text {
        background: linear-gradient(45deg, #3b82f6, #8b5cf6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }

    .spinner {
        @apply inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite];
    }

    :global(.form-checkbox) {
        @apply rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500;
    }
</style>
