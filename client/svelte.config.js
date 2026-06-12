import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    // Standalone Node server (`build/index.js`) so the app runs under cPanel
    // Passenger — mongoose and node:crypto need the Node runtime, not edge.
    adapter: adapter()
  }
};

export default config;
