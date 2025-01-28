import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    return {
        plugins: [sveltekit()],
        server: {
            port: parseInt(env.CLIENT_PORT) || 5173,
            proxy: {
                '/api': {
                    target: env.API_BASE_URL || 'http://localhost:5000',
                    changeOrigin: true,
                    secure: false,
                }
            }
        },
        optimizeDeps: {
            include: [
                'chart.js/auto',
                'chartjs-adapter-date-fns',
                'svelte-dnd-action'
            ]
        },
        build: {
            commonjsOptions: {
                include: [/node_modules/]
            }
        }
    };
});