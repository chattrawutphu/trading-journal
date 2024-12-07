import { json } from '@sveltejs/kit';
import { protect } from '$lib/server/middleware/auth.js';
import {
    getSubscriptionStatus,
    processPayment,
    cancelSubscription,
    reactivateSubscription,
    getInvoices,
    downloadInvoice,
    confirmPayment
} from '$lib/server/controllers/subscriptionController.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ request, params, locals }) {
    const path = params.path;

    // Ensure user is authenticated
    const authResult = await protect(request);
    if (authResult.error) {
        return json(authResult, { status: 401 });
    }

    try {
        switch (path) {
            case 'status':
                return json(await getSubscriptionStatus({ user: locals.user }));
            case 'invoices':
                return json(await getInvoices({ user: locals.user }));
            case path.match(/^invoices\/.*\/download$/)?.input:
                const invoiceId = path.split('/')[1];
                return json(await downloadInvoice({ user: locals.user, params: { id: invoiceId } }));
            default:
                return json({ error: 'Invalid endpoint' }, { status: 404 });
        }
    } catch (error) {
        console.error('Subscription GET error:', error);
        return json({ error: error.message }, { status: 400 });
    }
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, params, locals }) {
    const path = params.path;

    // Ensure user is authenticated
    const authResult = await protect(request);
    if (authResult.error) {
        return json(authResult, { status: 401 });
    }

    try {
        const body = await request.json();

        switch (path) {
            case 'process-payment':
                return json(await processPayment({ user: locals.user, body }));
            case 'cancel':
                return json(await cancelSubscription({ user: locals.user }));
            case 'reactivate':
                return json(await reactivateSubscription({ user: locals.user }));
            case 'confirm-payment':
                return json(await confirmPayment({ body }));
            default:
                return json({ error: 'Invalid endpoint' }, { status: 404 });
        }
    } catch (error) {
        console.error('Subscription POST error:', error);
        return json({ error: error.message }, { status: 400 });
    }
}
