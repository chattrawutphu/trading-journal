import { json } from '@sveltejs/kit';
import * as authController from '$lib/server/controllers/authController.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, params, cookies, locals }) {
    try {
        const path = params.path;
        // console.log('Auth POST request:', path);

        if (!path) {
            return json({ error: 'Invalid endpoint' }, { status: 404 });
        }

        const body = await request.json();
        
        // จำลอง req, res objects ให้เข้ากับ Express middleware
        const req = {
            body,
            session: { userId: locals.user?.id },
            cookies
        };
        
        let statusCode = 200;
        let responseData = {};
        
        // จำลอง res object
        const res = {
            status: (code) => {
                statusCode = code;
                return res;
            },
            json: (data) => {
                responseData = data;
                return res;
            },
            cookie: (name, value, options) => {
                cookies.set(name, value, options);
                return res;
            },
            clearCookie: (name, options) => {
                cookies.delete(name, options);
                return res;
            }
        };
        
        switch (path) {
            case 'login':
                try {
                    await authController.login(req, res);
                    return json(responseData, { status: statusCode });
                } catch (error) {
                    console.error('Login error:', error);
                    return json({ error: error.message }, { status: 401 });
                }

            case 'register':
                try {
                    await authController.register(req, res);
                    return json(responseData, { status: statusCode });
                } catch (error) {
                    console.error('Register error:', error);
                    return json({ error: error.message }, { status: 400 });
                }

            case 'logout':
                try {
                    await authController.logout(req, res);
                    return json(responseData, { status: statusCode });
                } catch (error) {
                    console.error('Logout error:', error);
                    return json({ error: error.message }, { status: 500 });
                }

            case 'verify-token':
                try {
                    await authController.verifyToken(req, res);
                    return json(responseData, { status: statusCode });
                } catch (error) {
                    console.error('Token verification error:', error);
                    return json({ error: error.message }, { status: 401 });
                }

            default:
                return json({ error: 'Invalid endpoint' }, { status: 404 });
        }
    } catch (error) {
        console.error('Auth route error:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
}

/** @type {import('./$types').RequestHandler} */
export async function GET({ request, params, locals, cookies }) {
    const path = params.path;
    // console.log('Auth GET request:', path);

    // จำลอง req, res objects ให้เข้ากับ Express middleware
    const req = {
        session: { userId: locals.user?.id },
        user: locals.user,
        cookies,
        params: { path }
    };
    
    let statusCode = 200;
    let responseData = {};
    
    // จำลอง res object
    const res = {
        status: (code) => {
            statusCode = code;
            return res;
        },
        json: (data) => {
            responseData = data;
            return res;
        }
    };

    if (path === 'profile') {
        try {
            await authController.getProfile(req, res);
            return json(responseData, { status: statusCode });
        } catch (error) {
            console.error('Profile fetch error:', error);
            return json({ error: error.message }, { status: 401 });
        }
    } else if (path === 'subscription/status') {
        try {
            await authController.getSubscriptionStatus(req, res);
            return json(responseData, { status: statusCode });
        } catch (error) {
            console.error('Subscription status error:', error);
            return json({ error: error.message }, { status: 500 });
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