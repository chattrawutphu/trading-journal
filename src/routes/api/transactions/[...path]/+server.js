import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET({ fetch, params, request }) {
    try {
        const response = await fetch(`http://localhost:5000/api/transactions/${params.path}`, {
            method: 'GET',
            headers: {
                ...request.headers,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch transactions');
        }

        return json(data.data);
    } catch (err) {
        console.error('Error in transactions GET route:', err);
        return json({ error: err.message }, { status: 500 });
    }
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ fetch, request }) {
    try {
        const body = await request.json();
        const response = await fetch('http://localhost:5000/api/transactions', {
            method: 'POST',
            headers: {
                ...request.headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to create transaction');
        }

        return json(data.data);
    } catch (err) {
        console.error('Error in transactions POST route:', err);
        return json({ error: err.message }, { status: 500 });
    }
}

/** @type {import('./$types').RequestHandler} */
export async function PUT({ fetch, params, request }) {
    try {
        const body = await request.json();
        const response = await fetch(`http://localhost:5000/api/transactions/${params.path}`, {
            method: 'PUT',
            headers: {
                ...request.headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to update transaction');
        }

        return json(data.data);
    } catch (err) {
        console.error('Error in transactions PUT route:', err);
        return json({ error: err.message }, { status: 500 });
    }
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE({ fetch, params, request }) {
    try {
        const response = await fetch(`http://localhost:5000/api/transactions/${params.path}`, {
            method: 'DELETE',
            headers: {
                ...request.headers,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to delete transaction');
        }

        return json(data.data);
    } catch (err) {
        console.error('Error in transactions DELETE route:', err);
        return json({ error: err.message }, { status: 500 });
    }
}
