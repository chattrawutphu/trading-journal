// src/hooks.server.js
import { redirect } from '@sveltejs/kit';

const unprotectedRoutes = ['/', '/login', '/register'];

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
    // ถ้าเป็น request สำหรับไฟล์ .map ให้ return 404 ทันที
    if (event.url.pathname.endsWith('.map')) {
        return new Response('Not Found', { status: 404 });
    }

    // ตรวจสอบ auth token
    const token = event.cookies.get('auth');

    if (token) {
        try {
            // Verify token and set user in locals
            event.locals.user = verifyToken(token);
        } catch (error) {
            console.error('Token verification failed:', error);
            event.cookies.delete('auth', { path: '/' });
        }
    }

    // Handle CORS preflight requests
    if (event.request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Max-Age': '3600'
            }
        });
    }

    const response = await resolve(event);
    return response;
}