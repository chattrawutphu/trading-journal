// src/hooks.server.js
import { redirect } from '@sveltejs/kit';

const unprotectedRoutes = ['/', '/login', '/register'];

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
    // Get auth token from cookie
    const authCookie = event.cookies.get('auth');
    event.locals.isAuthenticated = !!authCookie;

    // Add auth token to request headers for API calls
    if (authCookie) {
        event.request.headers.set('Authorization', `Bearer ${authCookie}`);
    }

    return await resolve(event);
}
