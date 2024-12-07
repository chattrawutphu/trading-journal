import { json } from '@sveltejs/kit';
import { createDepayTransaction } from '$lib/server/controllers/subscriptionController.js';

export async function POST({ request, locals }) {
    try {
        // Get the user from the session
        const user = locals.user;
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Parse the request body
        const body = await request.json();

        // Add the user to the request object for the controller
        const req = { user, body };
        const res = {
            status: (code) => ({
                json: (data) => new Response(JSON.stringify(data), {
                    status: code,
                    headers: { 'Content-Type': 'application/json' }
                })
            })
        };

        // Call the controller function
        return await createDepayTransaction(req, res);
    } catch (error) {
        console.error('Error in create-depay-transaction endpoint:', error);
        return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
