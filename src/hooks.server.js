// src/hooks.server.js
import { redirect } from '@sveltejs/kit';

const unprotectedRoutes = ['/', '/login', '/register'];

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
    // Get auth token from cookie
    const authCookie = event.cookies.get('auth');
    const path = event.url.pathname;

    // Allow access to public routes
    if (unprotectedRoutes.includes(path)) {
        return await resolve(event);
    }

    // Check if user is authenticated
    if (!authCookie) {
        // If this is an API request, return 401
        if (path.startsWith('/api')) {
            return new Response(JSON.stringify({ error: 'Not authenticated' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        // For page requests, redirect to login
        throw redirect(303, '/login');
    }

    try {
        // Add auth token to request headers for API calls
        event.locals.token = authCookie;
        event.request.headers.set('Authorization', `Bearer ${authCookie}`);
        
        return await resolve(event);
    } catch (error) {
        console.error('Hook error:', error);
        
        // Clear invalid auth cookie
        event.cookies.delete('auth', { path: '/' });
        
        // If this is an API request, return error
        if (path.startsWith('/api')) {
            return new Response(JSON.stringify({ error: 'Authentication failed' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        // For page requests, redirect to login
        throw redirect(303, '/login');
    }
}
