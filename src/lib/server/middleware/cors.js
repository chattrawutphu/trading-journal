import cors from 'cors';

const corsOptions = {
    origin: process.env.NODE_ENV === 'production' ?
        process.env.CORS_ALLOWED_ORIGINS.split(',') : [`http://localhost:${process.env.CLIENT_PORT}`],
    credentials: process.env.CORS_CREDENTIALS === 'true',
    methods: process.env.CORS_ALLOWED_METHODS.split(','),
    allowedHeaders: process.env.CORS_ALLOWED_HEADERS.split(','),
};

export const corsMiddleware = cors(corsOptions);