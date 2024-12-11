<script>
    import { SUBSCRIPTION_FEATURES, SUBSCRIPTION_TYPES } from '$lib/config/subscription';
    import { subscriptionStore } from '$lib/stores/subscriptionStore';
    import Button from '$lib/components/common/Button.svelte';
    import { onMount, onDestroy } from 'svelte';
    import { writable } from 'svelte/store';
    import Modal from '$lib/components/common/Modal.svelte';
    import { SUBSCRIPTION_PLANS, BILLING_PERIODS } from '$lib/config/subscription'; // แก้ไขตรงนี้ จาก BILLING_PERIODs เป็น BILLING_PERIODS
    import Loading from '$lib/components/common/Loading.svelte';
    import { formatDistanceToNow } from 'date-fns';
    import SubscriptionStatus from './SubscriptionStatus.svelte';
    import BillingHistory from './BillingHistory.svelte';

    let selectedBillingPeriod = BILLING_PERIODS.MONTHLY;
    
    const plans = SUBSCRIPTION_PLANS;

    // Helper function to handle billing period change
    function handleBillingPeriodChange(period) {
        selectedBillingPeriod = period;
    }

    let subscriptionData = {};
    let isPaidUser = false;
    let daysRemaining = 0;
    let loading = false;
    let showModal = false;
    let transactionHash = '';
    let paymentError = '';
    let paymentStatus = '';
    let selectedPlan = null;
    let showCancelModal = false;
    let activeTab = '';
    let showUpgradeModal = false;
    let upgradePlan = null;

    function handleUpgrade(plan) {
        upgradePlan = plan;
        showUpgradeModal = true;
    }

    onMount(async () => {
        loading = true;
        try {
            subscriptionData = await subscriptionStore.initializeSubscription();
            isPaidUser = subscriptionData.type === SUBSCRIPTION_TYPES.PRO || subscriptionData.type === SUBSCRIPTION_TYPES.PRO_PLUS;
            daysRemaining = getDaysRemaining(subscriptionData.endDate);
            const invoices = await subscriptionStore.loadInvoices();
            subscriptionData.invoices = invoices.invoices || [];
        } catch (error) {
            console.error('Failed to initialize subscription:', error);
            paymentError = error.message;
        } finally {
            activeTab = isPaidUser ? 'subscription' : 'plans';
            loading = false;
        }
    });

    onMount(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const txHash = urlParams.get('txHash');

        if (txHash) {
            subscriptionStore.confirmPayment(txHash);
        }
    });

    function getDaysRemaining(endDate) {
        const today = new Date();
        const end = new Date(endDate);
        const diffTime = Math.abs(end - today);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    function formatDate(date, { relative = true } = {}) {
        if (!date) return 'N/A';
        
        const formattedDate = new Date(date);
        if (isNaN(formattedDate)) return 'Invalid date';

        if (relative) {
            const today = new Date();
            const diffTime = formattedDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays > 0 ? `${diffDays} days remaining` : 'Expired';
        } else {
            return formattedDate.toLocaleDateString();
        }
    }

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
            paymentError = '';
            paymentStatus = 'Processing Stripe payment...';
            subscriptionStore.setLoading(true);
            
            const result = await subscriptionStore.processStripePayment(plan.type);
            if (result.success) {
                subscriptionData = await subscriptionStore.initializeSubscription();
                const invoices = await subscriptionStore.loadInvoices();
                subscriptionData.invoices = invoices.invoices || [];
                isPaidUser = subscriptionData.type === SUBSCRIPTION_TYPES.PRO || subscriptionData.type === SUBSCRIPTION_TYPES.PRO_PLUS;
                daysRemaining = getDaysRemaining(subscriptionData.endDate);
                alert('Payment successful! Your subscription has been upgraded.');
            }
        } catch (error) {
            console.error('Stripe payment failed:', error);
            paymentError = error.message;
            subscriptionStore.setError(error.message);
        } finally {
            loading = false;
            paymentStatus = '';
            subscriptionStore.setLoading(false);
        }
    }

    async function handleMetaMaskPayment(plan) {
        selectedPlan = plan;
        showModal = true;
        paymentError = '';
        paymentStatus = 'Initializing MetaMask...';
        
        try {
            loading = true;
            subscriptionStore.setLoading(true);

            if (!$subscriptionStore.walletConnected) {
                await subscriptionStore.connectWallet();
            }

            const result = await subscriptionStore.processPayment(plan.type);
            
            if (result.txHash) {
                transactionHash = result.txHash;
                paymentStatus = 'Transaction submitted. Waiting for confirmation...';
            }

            if (result.success) {
                subscriptionData = await subscriptionStore.initializeSubscription();
                const invoices = await subscriptionStore.loadInvoices();
                subscriptionData.invoices = invoices.invoices || [];
                isPaidUser = subscriptionData.type === SUBSCRIPTION_TYPES.PRO || subscriptionData.type === SUBSCRIPTION_TYPES.PRO_PLUS;
                daysRemaining = getDaysRemaining(subscriptionData.endDate);
                alert('Payment successful! Your subscription has been upgraded.');
                showModal = false;
            }
        } catch (error) {
            console.error('MetaMask payment failed:', error);
            paymentError = error.message;
            subscriptionStore.setError(error.message);
        } finally {
            loading = false;
            if (paymentError) {
                paymentStatus = 'Payment failed';
                // Keep modal open for a few seconds to show error
                setTimeout(() => {
                    showModal = false;
                    paymentStatus = '';
                    transactionHash = '';
                }, 3000);
            } else {
                paymentStatus = '';
            }
            subscriptionStore.setLoading(false);
        }
    }

    async function handleETHPayment(plan) {
        selectedPlan = plan;
        showModal = true;
        paymentError = '';
        paymentStatus = 'กำลังประมวลผลการชำระเงินด้วย ETH...';
        
        try {
            loading = true;
            subscriptionStore.setLoading(true);

            if (!$subscriptionStore.walletConnected) {
                await subscriptionStore.connectWallet();
            }

            const result = await subscriptionStore.processPayment(plan.type);
            
            if (result.txHash) {
                transactionHash = result.txHash;
                paymentStatus = 'ธุรกรรมถูกส่งแล้ว รอการยืนยัน...';
            }

            if (result.success) {
                subscriptionData = await subscriptionStore.initializeSubscription();
                const invoices = await subscriptionStore.loadInvoices();
                subscriptionData.invoices = invoices.invoices || [];
                isPaidUser = subscriptionData.type === SUBSCRIPTION_TYPES.PRO || subscriptionData.type === SUBSCRIPTION_TYPES.PRO_PLUS;
                daysRemaining = getDaysRemaining(subscriptionData.endDate);
                alert('การชำระเงินสำเร็จ! การสมัครสมาชิกของคุณได้รับการอัปเกรด.');
                showModal = false;
            }
        } catch (error) {
            console.error('การชำระเงินด้วย ETH ล้มเหลว:', error);
            paymentError = error.message;
            subscriptionStore.setError(error.message);
        } finally {
            loading = false;
            if (paymentError) {
                paymentStatus = 'การชำระเงินล้มเหลว';
                // ปิดโมดัลหลังจากแสดงข้อผิดพลาด
                setTimeout(() => {
                    showModal = false;
                    paymentStatus = '';
                    transactionHash = '';
                }, 3000);
            } else {
                paymentStatus = '';
            }
            subscriptionStore.setLoading(false);
        }
    }

    async function handleDepayPayment(plan) {
        try {
            loading = true;
            paymentError = '';
            paymentStatus = 'Initializing Depay payment...';
            subscriptionStore.setLoading(true);
            
            const paymentData = {
                planType: plan.type,
                billingPeriod: selectedBillingPeriod,
                amount: plan.price.replace(/[^0-9.]/g, ''), // ดึงเฉพาะตัวเลขจากราคา
                currency: 'USD'
            };

            console.log('Sending payment data:', paymentData); // Debug log
            await subscriptionStore.initiateDepayPayment(paymentData);
        } catch (error) {
            console.error('Depay payment initiation failed:', error);
            paymentError = error.message;
        } finally {
            loading = false;
            subscriptionStore.setLoading(false);
        }
    }

    async function handleCancelSubscription() {
        try {
            loading = true;
            await subscriptionStore.cancelSubscription();
            // Refresh subscription data to get updated status
            subscriptionData = await subscriptionStore.initializeSubscription();
            // Update subscription status immediately in the UI
            subscriptionData.status = 'cancelled';
            isPaidUser = false;
            alert('Subscription cancelled successfully.');
        } catch (error) {
            console.error('Failed to cancel subscription:', error);
            alert('Failed to cancel subscription: ' + error.message);
        } finally {
            loading = false;
            showCancelModal = false;
        }
    }

    async function handleDownloadInvoice(invoiceId) {
        try {
            await subscriptionStore.downloadInvoice(invoiceId);
            alert('Invoice downloaded successfully.');
        } catch (error) {
            console.error('Failed to download invoice:', error);
            alert('Failed to download invoice: ' + error.message);
        }
    }

    function getBlockExplorerUrl(hash) {
        return `https://basescan.org/tx/${hash}`;
    }

    // ฟังก์ชันใหม่สำหรับกรองและจัดเรียง invoices
    function processInvoices(invoices) {
        if (!Array.isArray(invoices)) return [];
        
        // กรอง invoice ที่ซ้ำกันออกโดยใช้ transactionHash
        const uniqueInvoices = invoices.reduce((acc, curr) => {
            if (!acc.find(inv => inv.transactionHash === curr.transactionHash)) {
                acc.push(curr);
            }
            return acc;
        }, []);

        // เรียงตามวันที่จากใหม่ไปเก่า
        return uniqueInvoices.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // Add function to handle cancel click
    function handleCancelClick() {
        console.log('Cancel clicked'); // เพิ่ม log เพื่อ debug
        showCancelModal = true;
    }
</script>

<div class="container mx-auto px-4 py-8">
    {#if loading}
        <Loading message="Loading..." overlay={true} />
    {:else}
        {#if subscriptionData && Object.keys(subscriptionData).length > 0 && isPaidUser}
            <!-- Tab Navigation -->
            <div class="border-b border-light-border dark:border-dark-border mb-8">
                <nav class="-mb-px flex space-x-8">
                    <button
                        class="py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 {activeTab === 'plans' ? 'border-theme-500 text-theme-500' : 'border-transparent text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text hover:border-light-border dark:hover:border-dark-border'}"
                        on:click={() => activeTab = 'plans'}
                    >
                        Choose Your Plan
                    </button>
                    <button
                        class="py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 {activeTab === 'subscription' ? 'border-theme-500 text-theme-500' : 'border-transparent text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text hover:border-light-border dark:hover:border-dark-border'}"
                        on:click={() => activeTab = 'subscription'}
                        disabled={!isPaidUser}
                    >
                        Your Subscription
                    </button>
                </nav>
            </div>
        {/if}

        {#if activeTab === 'subscription'}
            {#if isPaidUser}
                <div class="max-w-4xl mx-auto">
                    <SubscriptionStatus
                        {subscriptionData}
                        {daysRemaining}
                        {loading}
                        on:cancelClick={handleCancelClick}
                    />
                    <BillingHistory
                        invoices={processInvoices(subscriptionData.invoices || [])}
                        {handleDownloadInvoice}
                    />
                </div>
            {:else}
                <div class="text-center mb-12">
                    <h1 class="text-4xl font-bold text-light-text dark:text-dark-text mb-4">Choose Your Plan</h1>
                    <p class="text-light-text-muted dark:text-dark-text-muted max-w-2xl mx-auto mb-8">
                        Select the perfect plan for your trading needs. Upgrade anytime to unlock more features and capabilities.
                    </p>

                    <!-- Billing Period Toggle -->
                    <div class="inline-flex items-center bg-light-card dark:bg-dark-card rounded-lg p-1 mb-8">
                        <button
                            class="px-6 py-2 rounded-md {selectedBillingPeriod === BILLING_PERIODS.MONTHLY ? 'bg-theme-500 text-white' : 'text-light-text-muted dark:text-dark-text-muted'}"
                            on:click={() => handleBillingPeriodChange(BILLING_PERIODS.MONTHLY)}
                        >
                            Monthly
                        </button>
                        <button
                            class="px-6 py-2 rounded-md {selectedBillingPeriod === BILLING_PERIODS.YEARLY ? 'bg-theme-500 text-white' : 'text-light-text-muted dark:text-dark-text-muted'}"
                            on:click={() => handleBillingPeriodChange(BILLING_PERIODS.YEARLY)}
                        >
                            Yearly
                            <span class="ml-1 text-xs font-medium bg-green-500 text-white px-2 py-0.5 rounded-full">Save 17%</span>
                        </button>
                    </div>
                </div>
            {/if}
        {:else if activeTab === 'plans'}
            <div class="text-center mb-12">
                <h1 class="text-4xl font-bold text-light-text dark:text-dark-text mb-4">Choose Your Plan</h1>
                <p class="text-light-text-muted dark:text-dark-text-muted max-w-2xl mx-auto mb-8">
                    Select the perfect plan for your trading needs. Upgrade anytime to unlock more features and capabilities.
                </p>

                <!-- Billing Period Toggle -->
                <div class="inline-flex items-center bg-light-card dark:bg-dark-card rounded-lg p-1 mb-8">
                    <button
                        class="px-6 py-2 rounded-md {selectedBillingPeriod === BILLING_PERIODS.MONTHLY ? 'bg-theme-500 text-white' : 'text-light-text-muted dark:text-dark-text-muted'}"
                        on:click={() => handleBillingPeriodChange(BILLING_PERIODS.MONTHLY)}
                    >
                        Monthly
                    </button>
                    <button
                        class="px-6 py-2 rounded-md {selectedBillingPeriod === BILLING_PERIODS.YEARLY ? 'bg-theme-500 text-white' : 'text-light-text-muted dark:text-dark-text-muted'}"
                        on:click={() => handleBillingPeriodChange(BILLING_PERIODS.YEARLY)}
                    >
                        Yearly
                        <span class="ml-1 text-xs font-medium bg-green-500 text-white px-2 py-0.5 rounded-full">Save 17%</span>
                    </button>
                </div>
            </div>

            <div class="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {#each plans[selectedBillingPeriod] as plan}
                    <div class="relative rounded-2xl bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border p-6 shadow-xl transition-transform duration-300 hover:scale-105">
                        {#if plan.isPopular}
                            <div class="absolute -top-4 left-1/2 -translate-x-1/2">
                                <span class="bg-gradient-purple text-white px-4 py-1 rounded-full text-sm font-medium">
                                    Most Popular
                                </span>
                            </div>
                        {/if}

                        <!-- Plan Header -->
                        <div class="text-center mb-6">
                            <h2 class="text-2xl font-bold text-light-text dark:text-dark-text mb-2">{plan.name}</h2>
                            <div class="flex flex-col items-center justify-center gap-1">
                                {#if plan.originalPrice}
                                    <span class="text-light-text-muted dark:text-dark-text-muted line-through text-sm">
                                        {plan.originalPrice}
                                    </span>
                                {/if}
                                <div class="flex items-baseline justify-center"></div>
                                    <span class="text-4xl font-bold text-light-text dark:text-dark-text">{plan.price}</span>
                                    {#if plan.period}
                                        <span class="text-light-text-muted dark:text-dark-text-muted">/{plan.period}</span>
                                    {/if}
                                {#if plan.savings}
                                    <span class="text-green-500 font-medium text-sm mt-1">{plan.savings}</span>
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

                        <!-- Action Button -->
                        {#if plan.current}
                            <button disabled class="w-full py-3 px-4 bg-green-500 text-white rounded-lg font-medium cursor-default flex items-center justify-center gap-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                </svg>
                                Current Plan
                            </button>
                            <p class="text-green-500 font-medium text-sm mt-1">You are currently on this plan</p>
                        {:else if isPaidUser && subscriptionData.type === SUBSCRIPTION_TYPES.PRO && plan.type === SUBSCRIPTION_TYPES.PRO_PLUS}
                            <Button on:click={() => handleUpgrade(plan)}>
                                Upgrade
                            </Button>
                        {:else if isPaidUser && subscriptionData.type === SUBSCRIPTION_TYPES.PRO_PLUS}
                            <button disabled class="w-full py-3 px-4 bg-green-500 text-white rounded-lg font-medium cursor-default flex items-center justify-center gap-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                </svg>
                                Current Plan
                            </button>
                            <p class="text-green-500 font-medium text-sm mt-1">You are currently on this plan</p>
                        {:else if !isPaidUser && plan.type !== SUBSCRIPTION_TYPES.BASIC}
                            <Button on:click={() => handleDepayPayment(plan)}>
                                Get Started
                            </Button>
                        {/if}
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
                        <p class="text-light-text-muted dark:text-dark-text-muted">We accept credit cards through Stripe and cryptocurrency (ETH) payments through MetaMask on the Base network.</p>
                    </div>
                    <div class="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg p-6">
                        <h3 class="text-lg font-semibold text-light-text dark:text-dark-text mb-2">Is there a refund policy?</h3>
                        <p class="text-light-text-muted dark:text-dark-text-muted">Yes, we offer a 30-day money-back guarantee if you're not satisfied with our service.</p>
                    </div>
                </div>
            </div>
        {/if}
    {/if}
</div>

<!-- Cancel Subscription Modal -->
{#if showCancelModal}
    <Modal show={showCancelModal}>
        <div class="p-6">
            <div class="text-center mb-6">
                <h3 class="text-xl font-semibold text-light-text dark:text-dark-text mb-2">Cancel Subscription</h3>
                <p class="text-light-text-muted dark:text-dark-text-muted">Are you sure you want to cancel your subscription?</p>
                <p class="text-light-text-muted dark:text-dark-text-muted mt-2">
                    Your subscription will remain active until the end of your current billing period.
                </p>
            </div>
            <div class="flex justify-end gap-4">
                <button
                    class="px-4 py-2 text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text"
                    on:click={() => showCancelModal = false}
                >
                    No, Keep Subscription
                </button>
                <Button variant="danger" on:click={handleCancelSubscription}>
                    Yes, Cancel Subscription
                </Button>
            </div>
        </div>
    </Modal>
{/if}

<!-- Upgrade Modal -->
{#if showUpgradeModal}
    <Modal show={showUpgradeModal}>
        <div class="p-6">
            <div class="text-center mb-6">
                <h3 class="text-xl font-semibold text-light-text dark:text-dark-text mb-2">Upgrade to {upgradePlan?.name}</h3>
                <p class="text-light-text-muted dark:text-dark-text-muted">Upgrading will cancel your current plan and you will be charged the full amount for the new plan. Alternatively, you can send an official email to our support team at [support@email.com] to request a refund for the difference paid due to the plan upgrade.</p>
            </div>
            <div class="flex justify-end gap-4">
                <button
                    class="px-4 py-2 text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text"
                    on:click={() => showUpgradeModal = false}
                >
                    Cancel
                </button>
                <Button variant="primary" on:click={() => handleDepayPayment(upgradePlan)}>
                    Confirm Upgrade
                </Button>
            </div>
        </div>
    </Modal>
{/if}

<!-- Payment Modal -->
{#if showModal}
    <Modal show={showModal}>
        <div class="p-6">
            <div class="text-center mb-6">
                <h3 class="text-xl font-semibold text-light-text dark:text-dark-text mb-2">
                    {selectedPlan?.name} Subscription
                </h3>
                <p class="text-light-text-muted dark:text-dark-text-muted">
                    {paymentStatus || 'Processing payment...'}
                </p>
            </div>

            {#if $subscriptionStore.walletConnected}
                <div class="mb-4 p-4 bg-light-hover dark:bg-dark-hover rounded-lg">
                    <p class="text-sm text-light-text-muted dark:text-dark-text-muted mb-2">
                        Connected Wallet: {$subscriptionStore.walletAddress?.slice(0, 6)}...{$subscriptionStore.walletAddress?.slice(-4)}
                    </p>
                    {#if $subscriptionStore.walletBalance !== null}
                        <p class="text-sm text-light-text-muted dark:text-dark-text-muted">
                            Balance: {$subscriptionStore.walletBalance.toFixed(6)} ETH
                        </p>
                    {/if}
                </div>
            {/if}

            {#if paymentError}
                <div class="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded-lg">
                    <p class="font-medium">Error</p>
                    <p class="text-sm">{paymentError}</p>
                </div>
            {/if}

            {#if transactionHash}
                <div class="mb-4 p-4 bg-light-hover dark:bg-dark-hover rounded-lg">
                    <p class="text-sm text-light-text-muted dark:text-dark-text-muted mb-2">Transaction Hash:</p>
                    <a 
                        href={getBlockExplorerUrl(transactionHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-theme-500 hover:text-theme-600 break-all"
                    >
                        {transactionHash}
                    </a>
                </div>
            {/if}

            <div class="flex justify-end">
                <button
                    class="px-4 py-2 text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text"
                    on:click={() => {
                        showModal = false;
                        selectedPlan = null;
                    }}
                >
                    Close
                </button>
            </div>
        </div>
    </Modal>
{/if}

<style lang="postcss">
    .bg-gradient-purple {
        @apply bg-gradient-to-r from-purple-500 to-pink-500;
    }
</style>
