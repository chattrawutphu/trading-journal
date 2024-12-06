<script>
    import { SUBSCRIPTION_FEATURES, SUBSCRIPTION_TYPES } from '$lib/config/subscription';
    import { subscriptionStore } from '$lib/stores/subscriptionStore';
    import Button from '$lib/components/common/Button.svelte';
    import { onMount } from 'svelte';

    const plans = [
        {
            name: 'Basic',
            price: 'Free',
            features: [
                'Basic trading journal features',
                'Up to 100 trades per month',
                'Basic analytics',
                'Single account'
            ],
            badge: SUBSCRIPTION_FEATURES.basic.badge,
            current: true,
            type: SUBSCRIPTION_TYPES.BASIC
        },
        {
            name: 'Pro',
            price: '$19.99',
            period: 'month',
            features: [
                'Everything in Basic, plus:',
                'Unlimited trades',
                'Advanced analytics',
                'Multiple accounts',
                'Export data',
                'Priority support'
            ],
            badge: SUBSCRIPTION_FEATURES.pro.badge,
            popular: true,
            type: SUBSCRIPTION_TYPES.PRO
        },
        {
            name: 'Pro+',
            price: '$49.99',
            period: 'month',
            features: [
                'Everything in Pro, plus:',
                'API access',
                'Custom indicators',
                'Team collaboration',
                'White-label options',
                'Dedicated support'
            ],
            badge: SUBSCRIPTION_FEATURES.pro_plus.badge,
            type: SUBSCRIPTION_TYPES.PRO_PLUS
        }
    ];

    let subscriptionData = {};
    let isPaidUser = false;
    let daysRemaining = 0;
    let loading = false;

    onMount(async () => {
        try {
            subscriptionData = await subscriptionStore.initializeSubscription();
            isPaidUser = subscriptionData.type === SUBSCRIPTION_TYPES.PRO || subscriptionData.type === SUBSCRIPTION_TYPES.PRO_PLUS;
            daysRemaining = getDaysRemaining(subscriptionData.endDate);
            const invoices = await subscriptionStore.loadInvoices();
            subscriptionData.invoices = invoices.invoices || []; // Fix: Access invoices from response
        } catch (error) {
            console.error('Failed to initialize subscription:', error);
        }
    });

    function getDaysRemaining(endDate) {
        const today = new Date();
        const end = new Date(endDate);
        const diffTime = Math.abs(end - today);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Update formatDate function to handle actual dates
    function formatDate(date, { relative = true } = {}) {
        const now = new Date();
        const past = new Date(date);

        if (!relative) {
            // Return actual date in desired format
            return past.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }

        const diff = now - past;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const weeks = Math.floor(diff / (1000 * 60 * 60 * 24 * 7));
        const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));

        if (months > 0) {
            return `${months} month${months > 1 ? 's' : ''} ago`;
        } else if (weeks > 0) {
            return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        } else if (days > 0) {
            return `${days} day${days > 1 ? 's' : ''} ago`;
        } else if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else if (minutes > 0) {
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else {
            return 'Just now';
        }
    }

    // Fix: Format currency consistently
    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount);
    }

    async function handleStripePayment(plan) {
        try {
            loading = true;
            subscriptionStore.setLoading(true);
            const result = await subscriptionStore.processStripePayment(plan.type);
            if (result.success) {
                // Fix: Update subscription data after successful payment
                subscriptionData = await subscriptionStore.initializeSubscription();
                const invoices = await subscriptionStore.loadInvoices();
                subscriptionData.invoices = invoices.invoices || [];
                isPaidUser = subscriptionData.type === SUBSCRIPTION_TYPES.PRO || subscriptionData.type === SUBSCRIPTION_TYPES.PRO_PLUS;
                daysRemaining = getDaysRemaining(subscriptionData.endDate);
                alert('Payment successful! Your subscription has been upgraded.');
            }
        } catch (error) {
            subscriptionStore.setError(error.message);
        } finally {
            loading = false;
            subscriptionStore.setLoading(false);
        }
    }

    async function handleMetaMaskPayment(plan) {
        try {
            loading = true;
            subscriptionStore.setLoading(true);
            const result = await subscriptionStore.processMetaMaskPayment(plan.type);
            if (result.success) {
                // Fix: Update subscription data after successful payment
                subscriptionData = await subscriptionStore.initializeSubscription();
                const invoices = await subscriptionStore.loadInvoices();
                subscriptionData.invoices = invoices.invoices || [];
                isPaidUser = subscriptionData.type === SUBSCRIPTION_TYPES.PRO || subscriptionData.type === SUBSCRIPTION_TYPES.PRO_PLUS;
                daysRemaining = getDaysRemaining(subscriptionData.endDate);
                alert('Payment successful! Your subscription has been upgraded.');
            }
        } catch (error) {
            subscriptionStore.setError(error.message);
        } finally {
            loading = false;
            subscriptionStore.setLoading(false);
        }
    }

    async function handleCancelSubscription() {
        try {
            loading = true;
            await subscriptionStore.cancelSubscription();
            // Fix: Update subscription data after cancellation
            subscriptionData = await subscriptionStore.initializeSubscription();
            isPaidUser = false;
            alert('Subscription cancelled successfully.');
        } catch (error) {
            console.error('Failed to cancel subscription:', error);
        } finally {
            loading = false;
        }
    }

    async function handleDownloadInvoice(invoiceId) {
        try {
            await subscriptionStore.downloadInvoice(invoiceId);
            alert('Invoice downloaded successfully.');
        } catch (error) {
            console.error('Failed to download invoice:', error);
        }
    }
</script>

<div class="container mx-auto px-4 py-8">
    {#if isPaidUser}
        <div class="max-w-4xl mx-auto">
            <!-- Subscription Status -->
            <div class="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl p-8 mb-8">
                <div class="flex justify-between items-start mb-6">
                    <div>
                        <h1 class="text-3xl font-bold text-light-text dark:text-dark-text mb-2">Your Subscription</h1>
                        <p class="text-light-text-muted dark:text-dark-text-muted">
                            {subscriptionData.type === SUBSCRIPTION_TYPES.PRO ? 'Pro Plan' : 'Pro+ Plan'}
                        </p>
                    </div>
                    <div class="text-right">
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                            Active
                        </span>
                    </div>
                </div>

                <div class="grid md:grid-cols-4 gap-6 mb-8">
                    <div class="bg-light-hover dark:bg-dark-hover rounded-lg p-4">
                        <div class="text-light-text-muted dark:text-dark-text-muted text-sm mb-1">Start Date</div>
                        <div class="text-light-text dark:text-dark-text font-medium">
                            {formatDate(subscriptionData.startDate, { relative: false })}
                        </div>
                    </div>
                    <div class="bg-light-hover dark:bg-dark-hover rounded-lg p-4">
                        <div class="text-light-text-muted dark:text-dark-text-muted text-sm mb-1">End Date</div>
                        <div class="text-light-text dark:text-dark-text font-medium">
                            {formatDate(subscriptionData.endDate, { relative: false })}
                        </div>
                    </div>
                    <div class="bg-light-hover dark:bg-dark-hover rounded-lg p-4">
                        <div class="text-light-text-muted dark:text-dark-text-muted text-sm mb-1">Amount</div>
                        <div class="text-light-text dark:text-dark-text font-medium">
                            {formatCurrency(subscriptionData.price?.amount || 0)}/month
                        </div>
                    </div>
                    <div class="bg-light-hover dark:bg-dark-hover rounded-lg p-4">
                        <div class="text-light-text-muted dark:text-dark-text-muted text-sm mb-1">Days Remaining</div>
                        <div class="text-light-text dark:text-dark-text font-medium">{daysRemaining} days</div>
                    </div>
                </div>

                <div class="flex justify-end">
                    <button class="text-red-500 hover:text-red-600 font-medium" on:click={handleCancelSubscription} disabled={loading}>
                        {#if loading}
                            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        {/if}
                        Cancel Subscription
                    </button>
                </div>
            </div>

            <!-- Invoices -->
            <div class="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl p-8">
                <h2 class="text-2xl font-bold text-light-text dark:text-dark-text mb-6">Billing History</h2>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="border-b border-light-border dark:border-dark-border">
                                <th class="text-left py-3 px-4 text-light-text-muted dark:text-dark-text-muted font-medium">Invoice</th>
                                <th class="text-left py-3 px-4 text-light-text-muted dark:text-dark-text-muted font-medium">Date</th>
                                <th class="text-left py-3 px-4 text-light-text-muted dark:text-dark-text-muted font-medium">Amount</th>
                                <th class="text-left py-3 px-4 text-light-text-muted dark:text-dark-text-muted font-medium">Status</th>
                                <th class="text-left py-3 px-4 text-light-text-muted dark:text-dark-text-muted font-medium">Subscription Status</th>
                                <th class="text-right py-3 px-4 text-light-text-muted dark:text-dark-text-muted font-medium">Action</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-light-border dark:divide-dark-border">
                            {#each subscriptionData.invoices || [] as invoice}
                                <tr class="hover:bg-light-hover dark:hover:bg-dark-hover">
                                    <td class="py-3 px-4 text-light-text dark:text-dark-text">{invoice.id}</td>
                                    <td class="py-3 px-4 text-light-text dark:text-dark-text">{formatDate(invoice.date)}</td>
                                    <td class="py-3 px-4 text-light-text dark:text-dark-text">{formatCurrency(invoice.amount)}</td>
                                    <td class="py-3 px-4">
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                            {invoice.status}
                                        </span>
                                    </td>
                                    <td class="py-3 px-4 text-light-text dark:text-dark-text">{invoice.subscriptionStatus}</td>
                                    <td class="py-3 px-4 text-right">
                                        <button class="text-theme-500 hover:text-theme-600 font-medium" on:click={() => handleDownloadInvoice(invoice.id)}>
                                            Download
                                        </button>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    {:else}
        <div class="text-center mb-12">
            <h1 class="text-4xl font-bold text-light-text dark:text-dark-text mb-4">Choose Your Plan</h1>
            <p class="text-light-text-muted dark:text-dark-text-muted max-w-2xl mx-auto">
                Select the perfect plan for your trading needs. Upgrade anytime to unlock more features and capabilities.
            </p>
        </div>

        <div class="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {#each plans as plan}
                <div class="relative rounded-2xl bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border p-6 shadow-xl transition-transform duration-300 hover:scale-105">
                    {#if plan.popular}
                        <div class="absolute -top-4 left-1/2 -translate-x-1/2">
                            <span class="bg-gradient-purple text-white px-4 py-1 rounded-full text-sm font-medium">
                                Most Popular
                            </span>
                        </div>
                    {/if}

                    <!-- Plan Header -->
                    <div class="text-center mb-6">
                        <h2 class="text-2xl font-bold text-light-text dark:text-dark-text mb-2">{plan.name}</h2>
                        <div class="flex items-baseline justify-center gap-1">
                            <span class="text-4xl font-bold text-light-text dark:text-dark-text">{plan.price}</span>
                            {#if plan.period}
                                <span class="text-light-text-muted dark:text-dark-text-muted">/{plan.period}</span>
                            {/if}
                        </div>
                    </div>

                    <!-- Features -->
                    <ul class="space-y-3 mb-8">
                        {#each plan.features as feature}
                            <li class="flex items-center text-light-text dark:text-dark-text">
                                <svg class="w-5 h-5 text-theme-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                </svg>
                                {feature}
                            </li>
                        {/each}
                    </ul>

                    <!-- Action Buttons -->
                    <div class="space-y-3">
                        {#if !plan.current}
                            <button 
                                class="w-full py-3 px-4 bg-theme-500 hover:bg-theme-600 text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                                on:click={() => handleStripePayment(plan)}
                                disabled={loading}
                            >
                                {#if loading}
                                    <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                {/if}
                                Pay with Stripe
                            </button>
                            <button 
                                class="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                                on:click={() => handleMetaMaskPayment(plan)}
                                disabled={loading}
                            >
                                {#if loading}
                                    <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                {/if}
                                Pay with MetaMask
                            </button>
                        {:else}
                            <button disabled class="w-full py-3 px-4 bg-green-500 text-white rounded-lg font-medium cursor-default flex items-center justify-center gap-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                </svg>
                                Current Plan
                            </button>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>

        <!-- FAQ Section -->
        <div class="mt-16 max-w-3xl mx-auto">
            <h2 class="text-2xl font-bold text-light-text dark:text-dark-text text-center mb-8">Frequently Asked Questions</h2>
            <div class="space-y-6">
                <div class="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg p-6">
                    <h3 class="text-lg font-semibold text-light-text dark:text-dark-text mb-2">Can I change plans later?</h3>
                    <p class="text-light-text-muted dark:text-dark-text-muted">Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.</p>
                </div>
                <div class="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg p-6">
                    <h3 class="text-lg font-semibold text-light-text dark:text-dark-text mb-2">What payment methods do you accept?</h3>
                    <p class="text-light-text-muted dark:text-dark-text-muted">We accept credit cards through Stripe and cryptocurrency payments through MetaMask.</p>
                </div>
                <div class="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg p-6">
                    <h3 class="text-lg font-semibold text-light-text dark:text-dark-text mb-2">Is there a refund policy?</h3>
                    <p class="text-light-text-muted dark:text-dark-text-muted">Yes, we offer a 30-day money-back guarantee if you're not satisfied with our service.</p>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    .bg-gradient-purple {
        @apply bg-gradient-to-r from-purple-500 to-pink-500;
    }
</style>
