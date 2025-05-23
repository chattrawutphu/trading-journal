// src/hooks.server.js
import { redirect } from '@sveltejs/kit';

const unprotectedRoutes = ['/', '/login', '/register'];

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
    // ถ้าเป็น request สำหรับไฟล์ .map ให้ return 404 ทันที
    if (event.url.pathname.endsWith('.map')) {
        return new Response('Not Found', { status: 404 });
    }

    // ตรวจสอบ auth token หรือ session
    const sessionId = event.cookies.get('sessionId');
    
    // ตั้งค่า session ID ใน headers เพื่อส่งไปกับทุก request
    if (sessionId) {
        event.request.headers.set('X-Session-ID', sessionId);
        event.locals.user = { authenticated: true, sessionId };
    }

    // ถ้าเป็น API request ให้เพิ่ม CORS headers
    let response;
    
    const isApiRequest = event.url.pathname.startsWith('/api/');
    
    if (event.request.method === 'OPTIONS' && isApiRequest) {
        // Handle CORS preflight requests
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-ID',
                'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Max-Age': '3600'
            }
        });
    }
    
    response = await resolve(event);
    
    // เพิ่ม CORS headers สำหรับ API responses
    if (isApiRequest) {
        const origin = event.request.headers.get('origin');
        if (origin) {
            response.headers.set('Access-Control-Allow-Origin', origin);
            response.headers.set('Access-Control-Allow-Credentials', 'true');
            response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
            response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-ID');
        }
    }
    
    return response;
}