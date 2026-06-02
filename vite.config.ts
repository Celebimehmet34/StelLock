import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
	plugins: [
		nodePolyfills({
			// Only polyfill Buffer for browser — NOT crypto (Web Crypto API is native in browsers)
			// Exclude from SSR so Node's built-in crypto/buffer aren't overridden
			include: ['buffer'],
			exclude: ['crypto'],
			globals: { Buffer: true },
			protocolImports: false
		}),
		sveltekit()
	],
	ssr: {
		// Tell Vite to treat these as external in SSR — use Node's built-ins
		noExternal: []
	},
	optimizeDeps: {
		// snarkjs is heavy and uses commonjs/web-worker patterns — pre-bundle it
		include: ['snarkjs']
	}
});
