<script>
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();

    export let subscriptionData;
    export let daysRemaining;
    export let loading;

    function handleCancel() {
        console.log('Cancel button clicked'); // เพิ่ม log เพื่อ debug
        dispatch('cancelClick');
    }
</script>

<div class="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl p-8 mb-8">
    <div class="flex justify-between items-start mb-6">
        <div>
            <h1 class="text-3xl font-bold text-light-text dark:text-dark-text mb-2">Your Subscription</h1>
            <p class="text-light-text-muted dark:text-dark-text-muted">
                {subscriptionData.type === 'PRO' ? 'Pro Plan' : 'Pro+ Plan'}
            </p>
        </div>
        <div class="text-right">
            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium {subscriptionData.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'}">
                {subscriptionData.status === 'active' ? 'Active' : 'Cancelled'}
            </span>
        </div>
    </div>

    <div class="grid md:grid-cols-4 gap-6 mb-8">
        <div class="bg-light-hover dark:bg-dark-hover rounded-lg p-4">
            <div class="text-light-text-muted dark:text-dark-text-muted text-sm mb-1">Start Date</div>
            <div class="text-light-text dark:text-dark-text font-medium">
                {new Date(subscriptionData.startDate).toLocaleDateString()}
            </div>
        </div>
        <div class="bg-light-hover dark:bg-dark-hover rounded-lg p-4">
            <div class="text-light-text-muted dark:text-dark-text-muted text-sm mb-1">End Date</div>
            <div class="text-light-text dark:text-dark-text font-medium">
                {new Date(subscriptionData.endDate).toLocaleDateString()}
            </div>
        </div>
        <div class="bg-light-hover dark:bg-dark-hover rounded-lg p-4">
            <div class="text-light-text-muted dark:text-dark-text-muted text-sm mb-1">Amount</div>
            <div class="text-light-text dark:text-dark-text font-medium">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(subscriptionData.price?.amount || 0)}/month
            </div>
        </div>
        <div class="bg-light-hover dark:bg-dark-hover rounded-lg p-4">
            <div class="text-light-text-muted dark:text-dark-text-muted text-sm mb-1">Days Remaining</div>
            <div class="text-light-text dark:text-dark-text font-medium">{daysRemaining} days</div>
        </div>
    </div>

    <div class="flex justify-end">
        <button 
            class="text-red-500 hover:text-red-600 font-medium" 
            on:click={handleCancel}
            disabled={loading}
        >
            {#if loading}
                <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            {/if}
            Cancel Subscription
        </button>
    </div>
</div>
