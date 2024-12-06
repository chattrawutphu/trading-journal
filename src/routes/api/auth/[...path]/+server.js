import { json } from '@sveltejs/kit';
import { login, register, logout, getProfile } from '$lib/server/controllers/authController.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, params, cookies }) {
    try {
        const path = params.path;
        console.log('Auth POST request:', path);

        if (!path) {
            return json({ error: 'Invalid endpoint' }, { status: 404 });
        }

        const body = await request.json();
        
        switch (path) {
            case 'login':
                try {
                    const result = await login(body);
                    if (result.sessionId) {
                        cookies.set('sessionId', result.sessionId, {
                            path: '/',
                            httpOnly: true,
                            secure: process.env.NODE_ENV === 'production',
                            sameSite: 'strict',
                            maxAge: 60 * 60 * 24 // 24 hours
                        });
                    }
                    return json({ success: true, user: result.user });
                } catch (error) {
                    console.error('Login error:', error);
                    return json({ error: error.message }, { status: 401 });
                }

            case 'register':
                try {
                    const result = await register(body);
                    if (result.token) {
                        cookies.set('auth', result.token, {
                            path: '/',
                            httpOnly: true,
                            secure: process.env.NODE_ENV === 'production',
                            sameSite: 'strict',
                            maxAge: 60 * 60 * 24
                        });
                    }
                    return json(result);
                } catch (error) {
                    console.error('Register error:', error);
                    return json({ error: error.message }, { status: 400 });
                }

            case 'logout':
                cookies.delete('auth', { path: '/' });
                return json({ success: true });

            default:
                return json({ error: 'Invalid endpoint' }, { status: 404 });
        }
    } catch (error) {
        console.error('Auth route error:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
}

/** @type {import('./$types').RequestHandler} */
export async function GET({ request, params, locals }) {
    const path = params.path;
    console.log('Auth GET request:', path);

    if (path === 'profile') {
        try {
            const profile = await getProfile(locals.user);
            return json(profile);
        } catch (error) {
            console.error('Profile fetch error:', error);
            return json({ error: error.message }, { status: 401 });
        }
    }

    return json({ error: 'Invalid endpoint' }, { status: 404 });
}

export const OPTIONS = () => {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '3600'
        }
    });
};