<script>
    import { onMount } from 'svelte';
    import Button from '$lib/components/common/Button.svelte';
    import Loading from '$lib/components/common/Loading.svelte';
    import { api } from '$lib/utils/api';

    let loading = false;
    let error = '';
    let referralData = {};
    let initialLoad = true;
    let referredUsers = [];

    onMount(async () => {
        try {
            loading = true;
            // Fetch referral data from the API
            referralData = await api.getReferralData();
            // Fetch referred users data
            referredUsers = await api.getReferredUsers();
        } catch (err) {
            error = err.message;
        } finally {
            loading = false;
            initialLoad = false;
        }
    });

    function handleCopyReferralLink() {
        // Logic to copy the referral link to the clipboard
    }

    function handleShare(platform) {
        // Logic to share the referral link on social media
    }
</script>

<div class="max-w-4xl mx-auto space-y-12 p-8">
    {#if initialLoad || loading}
        <Loading message="Loading..." overlay={true} />
    {/if}

    <div class="transition-opacity duration-200" class:opacity-0={initialLoad || loading}>
        <!-- Hero Section -->
        <section class="text-center">
            <h1 class="text-5xl font-bold bg-gradient-purple bg-clip-text text-transparent">Invite & Earn</h1>
            <p class="text-xl text-light-text-muted dark:text-dark-text mt-4">Share the platform with friends and earn rewards together.</p>
        </section>

        {#if error}
            <div class="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
                <div class="flex">
                    <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-10H9v4h2V8zm0 6H9v2h2v-2z" clip-rule="evenodd"/>
                    </svg>
                    <span>{error}</span>
                </div>
            </div>
        {/if}

        <!-- Referral Link Section -->
        <section class="card p-8 text-center">
            <h2 class="text-2xl font-semibold text-light-text-muted dark:text-dark-text mb-6">Your Referral Link</h2>
            <div class="flex justify-center items-center">
                <input
                    type="text"
                    readonly
                    value="{referralData.referralLink || 'https://yourapp.com/signup?ref=YOUR_CODE'}"
                    class="flex-1 max-w-md px-4 py-3 border border-light-border dark:border-dark-border rounded-l-lg text-center"
                />
                <Button on:click={handleCopyReferralLink} class="rounded-l-none">
                    Copy Link
                </Button>
            </div>
            <p class="text-light-text-muted dark:text-dark-text-muted mt-4">Share your link and earn rewards when your friends join.</p>
            <div class="flex justify-center space-x-4 mt-6">
                <Button on:click={() => handleShare('facebook')} variant="secondary">
                    Share on Facebook
                </Button>
                <Button on:click={() => handleShare('twitter')} variant="secondary">
                    Share on Twitter
                </Button>
                <Button on:click={() => handleShare('linkedin')} variant="secondary">
                    Share on LinkedIn
                </Button>
            </div>
        </section>

        <!-- How It Works Section -->
        <section class="space-y-8">
            <h2 class="text-2xl font-semibold text-light-text-muted dark:text-dark-text text-center">How It Works</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div class="text-center">
                    <div class="w-16 h-16 mx-auto mb-4 text-theme-500">
                        <!-- Icon -->
                        <svg class="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14 14a4 4 0 10-4-4 4 4 0 004 4z"/>
                            <path d="M14 14l7 7"/>
                        </svg>
                    </div>
                    <h3 class="text-xl font-medium text-light-text-muted dark:text-dark-text">Share Your Link</h3>
                    <p class="mt-2 text-light-text-muted dark:text-dark-text-muted">Invite friends by sharing your unique referral link.</p>
                </div>
                <div class="text-center">
                    <div class="w-16 h-16 mx-auto mb-4 text-theme-500">
                        <!-- Icon -->
                        <svg class="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 14l9-5-9-5-9 5 9 5z"/>
                            <path d="M12 14l6.16-3.422a12.083 12.083 0 010 6.844L12 14z"/>
                            <path d="M12 14l-6.16 3.422a12.083 12.083 0 010-6.844L12 14z"/>
                        </svg>
                    </div>
                    <h3 class="text-xl font-medium text-light-text-muted dark:text-dark-text">They Sign Up</h3>
                    <p class="mt-2 text-light-text-muted dark:text-dark-text-muted">Your friends sign up and start using the platform.</p>
                </div>
                <div class="text-center">
                    <div class="w-16 h-16 mx-auto mb-4 text-theme-500">
                        <!-- Icon -->
                        <svg class="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20 12H4"/>
                            <path d="M14 6l-6 6 6 6"/>
                        </svg>
                    </div>
                    <h3 class="text-xl font-medium text-light-text-muted dark:text-dark-text">Earn Rewards</h3>
                    <p class="mt-2 text-light-text-muted dark:text-dark-text-muted">You both earn rewards when they make a purchase.</p>
                </div>
            </div>
        </section>

        <!-- Referral Statistics -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            <div class="card p-6">
                <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text mb-2">Total Referrals</h3>
                <p class="text-3xl font-bold text-light-text dark:text-dark-text">{referralData.totalReferrals || 0}</p>
            </div>
            <div class="card p-6">
                <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text mb-2">Active Referrals</h3>
                <p class="text-3xl font-bold text-light-text dark:text-dark-text">{referralData.activeReferrals || 0}</p>
            </div>
            <div class="card p-6">
                <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text mb-2">Rewards Earned</h3>
                <p class="text-3xl font-bold text-green-500">${referralData.rewardsEarned?.toFixed(2) || '0.00'}</p>
            </div>
            <div class="card p-6">
                <h3 class="text-sm font-medium text-light-text-muted dark:text-dark-text mb-2">Pending Rewards</h3>
                <p class="text-3xl font-bold text-yellow-500">${referralData.pendingRewards?.toFixed(2) || '0.00'}</p>
            </div>
        </div>

        <!-- Referred Users Table -->
        {#if referredUsers.length > 0}
            <div class="card p-6 mt-8">
                <h2 class="text-xl font-semibold text-light-text-muted dark:text-dark-text mb-4">Your Referrals</h2>
                <table class="min-w-full divide-y divide-light-border dark:divide-dark-border">
                    <thead>
                        <tr>
                            <th class="px-4 py-2 text-left text-sm font-medium text-light-text-muted dark:text-dark-text-muted">User</th>
                            <th class="px-4 py-2 text-left text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Joined Date</th>
                            <th class="px-4 py-2 text-left text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Payment</th>
                            <th class="px-4 py-2 text-left text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Your Share</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-light-border dark:divide-dark-border">
                        {#each referredUsers as user}
                            <tr>
                                <td class="px-4 py-2 text-light-text dark:text-dark-text">{user.name}</td>
                                <td class="px-4 py-2 text-light-text dark:text-dark-text">{new Date(user.joinedDate).toLocaleDateString()}</td>
                                <td class="px-4 py-2 text-light-text dark:text-dark-text">${user.paymentAmount.toFixed(2)}</td>
                                <td class="px-4 py-2 text-green-500 font-medium">${user.yourShare.toFixed(2)}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {:else}
            <div class="card p-6 mt-8 text-center">
                <p class="text-light-text-muted dark:text-dark-text-muted">You have not referred any users yet.</p>
            </div>
        {/if}
    </div>
</div>

<style lang="postcss">
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-lg;
    }

    table {
        @apply w-full text-left;
    }

    th, td {
        @apply px-4 py-2;
    }

    th {
        @apply text-sm font-medium text-light-text-muted dark:text-dark-text-muted;
    }

    td {
        @apply text-light-text dark:text-dark-text;
    }
</style>
