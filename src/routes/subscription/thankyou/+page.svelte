<script>
    import { onMount } from 'svelte';
    import { subscriptionStore } from '$lib/stores/subscriptionStore';
    import Loading from '$lib/components/common/Loading.svelte';
    import Button from '$lib/components/common/Button.svelte';

    let loading = true;
    let subscriptionData = {};

    onMount(async () => {
        try {
            subscriptionData = await subscriptionStore.initializeSubscription();
        } catch (error) {
            console.error('Failed to load subscription data:', error);
        } finally {
            loading = false;
        }
    });

    function formatDate(date) {
        if (!date) return 'N/A';
        const formattedDate = new Date(date);
        return formattedDate.toLocaleDateString();
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount);
    }
</script>

<div class="container mx-auto px-4 py-8 text-center">
    {#if loading}
        <Loading message="Loading..." overlay={true} />
    {/if}

    <div class="transition-opacity duration-200" class:opacity-0={loading}>
        <h1 class="text-4xl font-bold text-light-text dark:text-dark-text mb-4">Payment Successful!</h1>
        <p class="text-light-text-muted dark:text-dark-text-muted mb-8">Thank you for your purchase. Here are your subscription details:</p>
        
        <div class="bg-light-card dark:bg-dark-card border border-light-border dark:border-0 rounded-2xl p-8 mb-8 max-w-2xl mx-auto">
            <div class="grid md:grid-cols-2 gap-6 mb-8">
                <div class="bg-light-hover dark:bg-dark-hover rounded-lg p-4">
                    <div class="text-light-text-muted dark:text-dark-text-muted text-sm mb-1">Plan</div>
                    <div class="text-light-text dark:text-dark-text font-medium">
                        {subscriptionData.type}
                    </div>
                </div>
                <div class="bg-light-hover dark:bg-dark-hover rounded-lg p-4">
                    <div class="text-light-text-muted dark:text-dark-text-muted text-sm mb-1">Start Date</div>
                    <div class="text-light-text dark:text-dark-text font-medium">
                        {formatDate(subscriptionData.startDate)}
                    </div>
                </div>
                <div class="bg-light-hover dark:bg-dark-hover rounded-lg p-4">
                    <div class="text-light-text-muted dark:text-dark-text-muted text-sm mb-1">End Date</div>
                    <div class="text-light-text dark:text-dark-text font-medium">
                        {formatDate(subscriptionData.endDate)}
                    </div>
                </div>
                <div class="bg-light-hover dark:bg-dark-hover rounded-lg p-4">
                    <div class="text-light-text-muted dark:text-dark-text-muted text-sm mb-1">Amount</div>
                    <div class="text-light-text dark:text-dark-text font-medium">
                        {formatCurrency(subscriptionData.price?.amount || 0)}/month
                    </div>
                </div>
            </div>
            <Button on:click={() => window.location.href = '/subscription'}>Back to Subscription</Button>
        </div>
    </div>
</div>

<style lang="postcss">
    .bg-gradient-purple {
        @apply bg-gradient-to-r from-purple-500 to-pink-500;
    }
</style>
