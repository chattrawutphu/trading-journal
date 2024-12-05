<script>
    import { SUBSCRIPTION_FEATURES, SUBSCRIPTION_TYPES } from '$lib/config/subscription';
    import { subscriptionStore } from '$lib/stores/subscriptionStore';
    import Button from '$lib/components/common/Button.svelte';

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
            current: true
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
            popular: true
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
            badge: SUBSCRIPTION_FEATURES.pro_plus.badge
        }
    ];

    // Mock subscription data (replace with actual data from API)
    const subscriptionData = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        amount: 19.99,
        billingCycle: 'monthly',
        status: 'active',
        invoices: [
            { id: 'INV-001', date: '2024-01-01', amount: 19.99, status: 'paid' },
            { id: 'INV-002', date: '2024-02-01', amount: 19.99, status: 'paid' },
            { id: 'INV-003', date: '2024-03-01', amount: 19.99, status: 'paid' }
        ]
    };

    function getDaysRemaining(endDate) {
        const today = new Date();
        const end = new Date(endDate);
        const diffTime = Math.abs(end - today);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    function formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    $: isPaidUser = $subscriptionStore.type === SUBSCRIPTION_TYPES.PRO || $subscriptionStore.type === SUBSCRIPTION_TYPES.PRO_PLUS;
    $: daysRemaining = getDaysRemaining(subscriptionData.endDate);
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
                            {$subscriptionStore.type === SUBSCRIPTION_TYPES.PRO ? 'Pro Plan' : 'Pro+ Plan'}
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
                        <div class="text-light-text dark:text-dark-text font-medium">{formatDate(subscriptionData.startDate)}</div>
                    </div>
                    <div class="bg-light-hover dark:bg-dark-hover rounded-lg p-4">
                        <div class="text-light-text-muted dark:text-dark-text-muted text-sm mb-1">End Date</div>
                        <div class="text-light-text dark:text-dark-text font-medium">{formatDate(subscriptionData.endDate)}</div>
                    </div>
                    <div class="bg-light-hover dark:bg-dark-hover rounded-lg p-4">
                        <div class="text-light-text-muted dark:text-dark-text-muted text-sm mb-1">Amount</div>
                        <div class="text-light-text dark:text-dark-text font-medium">${subscriptionData.amount}/month</div>
                    </div>
                    <div class="bg-light-hover dark:bg-dark-hover rounded-lg p-4">
                        <div class="text-light-text-muted dark:text-dark-text-muted text-sm mb-1">Days Remaining</div>
                        <div class="text-light-text dark:text-dark-text font-medium">{daysRemaining} days</div>
                    </div>
                </div>

                <div class="flex justify-end">
                    <button class="text-red-500 hover:text-red-600 font-medium">
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
                                <th class="text-right py-3 px-4 text-light-text-muted dark:text-dark-text-muted font-medium">Action</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-light-border dark:divide-dark-border">
                            {#each subscriptionData.invoices as invoice}
                                <tr class="hover:bg-light-hover dark:hover:bg-dark-hover">
                                    <td class="py-3 px-4 text-light-text dark:text-dark-text">{invoice.id}</td>
                                    <td class="py-3 px-4 text-light-text dark:text-dark-text">{formatDate(invoice.date)}</td>
                                    <td class="py-3 px-4 text-light-text dark:text-dark-text">${invoice.amount}</td>
                                    <td class="py-3 px-4">
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                            {invoice.status}
                                        </span>
                                    </td>
                                    <td class="py-3 px-4 text-right">
                                        <button class="text-theme-500 hover:text-theme-600 font-medium">
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
                            <button class="w-full py-3 px-4 bg-theme-500 hover:bg-theme-600 text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                Pay with Stripe
                            </button>
                            <button class="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2">
                                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                                    <path d="M12 6l-4 4h3v4h2v-4h3z"/>
                                </svg>
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
