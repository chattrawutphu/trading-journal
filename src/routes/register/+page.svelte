<!-- src/routes/register/+page.svelte -->
<script>
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { auth } from '$lib/stores/authStore';
    import Button from '$lib/components/common/Button.svelte';
    import Input from '$lib/components/common/Input.svelte';

    let name = '';
    let email = '';
    let password = '';
    let confirmPassword = '';
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

            // Validate password match
            if (password !== confirmPassword) {
                error = 'Passwords do not match';
                return;
            }

            // Validate password strength
            if (password.length < 8) {
                error = 'Password must be at least 8 characters long';
                return;
            }

            // Register user
            await auth.register({ name, email, password });
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

                <!-- Name -->
                <Input
                    label="Name"
                    type="text"
                    bind:value={name}
                    required
                    placeholder="Enter your name"
                    autocomplete="name"
                />

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
                    placeholder="Create a password"
                    autocomplete="new-password"
                />

                <!-- Confirm Password -->
                <Input
                    label="Confirm Password"
                    type="password"
                    bind:value={confirmPassword}
                    required
                    placeholder="Confirm your password"
                    autocomplete="new-password"
                />

                <!-- Password Requirements -->
                <div class="text-sm text-slate-400 space-y-1">
                    <p>Password must:</p>
                    <ul class="list-disc list-inside pl-4 space-y-1">
                        <li>Be at least 8 characters long</li>
                        <li>Include at least one uppercase letter</li>
                        <li>Include at least one number</li>
                        <li>Include at least one special character</li>
                    </ul>
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
                        Creating account...
                    {:else}
                        Create Account
                    {/if}
                </Button>

                <!-- Login Link -->
                <div class="text-center text-sm">
                    <span class="text-slate-400">Already have an account?</span>
                    <a href="/login" class="text-blue-400 hover:text-blue-300 ml-1">
                        Sign in
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
</style>
