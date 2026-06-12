import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    // Node runtime (not edge) — mongoose and node:crypto require it.
    adapter: adapter({
      runtime: 'nodejs20.x'
    })
  }
};

export default config;
