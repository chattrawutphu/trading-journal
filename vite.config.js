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
    optimizeDeps: {
        include: ['@sveltejs/kit'],
        exclude: ['svelte-hmr']
    },
    ssr: {
        noExternal: ['@sveltejs/kit']
    }
});
