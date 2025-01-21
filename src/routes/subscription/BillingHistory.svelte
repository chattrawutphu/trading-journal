<script>
    import { formatDistanceToNow } from 'date-fns';

    export let invoices;
    export let handleDownloadInvoice;
</script>

<div class="bg-light-card dark:bg-dark-card border border-light-border dark:border-0 rounded-2xl p-8">
    <h2 class="text-2xl font-bold text-light-text dark:text-dark-text mb-6">Billing History</h2>
    <div class="overflow-x-auto">
        <table class="w-full">
            <thead>
                <tr class="border-b border-light-border dark:border-0">
                    <!-- <th class="text-left py-3 px-4 text-light-text-muted dark:text-dark-text-muted font-medium">Invoice</th> -->
                    <th class="text-left py-3 px-4 text-light-text-muted dark:text-dark-text-muted font-medium">Date</th>
                    <th class="text-left py-3 px-4 text-light-text-muted dark:text-dark-text-muted font-medium">Amount</th>
                    <th class="text-left py-3 px-4 text-light-text-muted dark:text-dark-text-muted font-medium">Status</th>
                    <th class="text-left py-3 px-4 text-light-text-muted dark:text-dark-text-muted font-medium">Subscription Status</th>
                    <th class="text-right py-3 px-4 text-light-text-muted dark:text-dark-text-muted font-medium">Action</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-light-border dark:divide-dark-border">
                {#each invoices as invoice}
                    <tr class="hover:bg-light-hover dark:hover:bg-dark-hover">
                        <!-- <td class="py-3 px-4 text-light-text dark:text-dark-text">
                            {invoice.id || invoice.transactionHash?.slice(-8) || 'N/A'}
                        </td> -->
                        <td class="py-3 px-4 text-light-text dark:text-dark-text">
                            {formatDistanceToNow(new Date(invoice.date), { addSuffix: true })}
                        </td>
                        <td class="py-3 px-4 text-light-text dark:text-dark-text">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(invoice.amount || 0)}
                        </td>
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
