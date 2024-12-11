import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [sveltekit()],
    server: {
        fs: {
            allow: ['..']
        },
        watch: {
            usePolling: true
        }
    },
    ssr: {
        noExternal: true
    },
    build: {
        rollupOptions: {
            external: [
                'crypto',
                'stream',
                'jsonwebtoken',
                'express',
                'mongoose'
            ]
        }
    }
});
