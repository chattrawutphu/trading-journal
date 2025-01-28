import vercel from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    kit: {
        adapter: vercel({
            runtime: 'nodejs22.x',
            regions: ['sin1'], // Single region - Singapore for APAC
            memory: 1024,
            maxDuration: 10
        }),
        // Ensure proper handling of API routes
        csrf: {
            checkOrigin: false
        }
    },
    preprocess: vitePreprocess()
};

export default config;