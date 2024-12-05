// routes/api/user/[...path]/+server.js
import { error } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET({ fetch, params, request }) {
    try {
        const response = await fetch(`http://localhost:5000/api/user/${params.path}`, {
            method: 'GET',
            headers: request.headers
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw error(response.status, errorData.error || 'Failed to process request');
        }

        return response;
    } catch (err) {
        console.error('Error in user GET route:', err);
        throw error(500, err.message);
    }
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ fetch, params, request }) {
    try {
        const response = await fetch(`http://localhost:5000/api/user/${params.path}`, {
            method: 'POST',
            headers: request.headers,
            body: request.body
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw error(response.status, errorData.error || 'Failed to process request');
        }

        return response;
    } catch (err) {
        console.error('Error in user POST route:', err);
        throw error(500, err.message);
    }
}

/** @type {import('./$types').RequestHandler} */
export async function PUT({ fetch, params, request }) {
    try {
        const response = await fetch(`http://localhost:5000/api/user/${params.path}`, {
            method: 'PUT',
            headers: request.headers,
            body: request.body
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw error(response.status, errorData.error || 'Failed to process request');
        }

        return response;
    } catch (err) {
        console.error('Error in user PUT route:', err);
        throw error(500, err.message);
    }
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE({ fetch, params, request }) {
    try {
        const response = await fetch(`http://localhost:5000/api/user/${params.path}`, {
            method: 'DELETE',
            headers: request.headers
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw error(response.status, errorData.error || 'Failed to process request');
        }

        return response;
    } catch (err) {
        console.error('Error in user DELETE route:', err);
        throw error(500, err.message);
    }
}
