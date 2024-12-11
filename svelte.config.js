import vercel from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: vercel({
			runtime: 'nodejs22.x',
			regions: ['sin1'],  // Singapore region for better APAC performance
			memory: 1024,  // 1GB memory
			maxDuration: 10  // 10 seconds max duration
		}),
		// Ensure proper handling of API routes
		csrf: {
			checkOrigin: false
		}
	},
	preprocess: vitePreprocess()
};

export default config;
