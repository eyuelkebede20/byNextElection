import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  optimizeDeps: {
    exclude: ['phosphor-svelte']
  },
  ssr: {
    // Bundle runtime deps (mongoose, pretty-ms, …) INTO the server build so the
    // adapter-node output in build/ is self-contained — no node_modules needed
    // at runtime. This keeps the FTP deploy to just the small build/ folder
    // (shipping node_modules over FTP is far too slow on cPanel).
    noExternal: true
  }
});
