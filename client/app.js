// Launcher for cPanel / CloudLinux Node.js Selector (LiteSpeed lsnode.js),
// which loads the configured "startup file" with require().
//
// adapter-node's real entry (build/index.js) is an ES module with a top-level
// await (build/handler.js: `await server.init(...)`), so require() CANNOT load
// it — that throws ERR_REQUIRE_ASYNC_MODULE and the app 503s.
//
// This file contains only a *dynamic* import(), which has no top-level await,
// so require()-ing it is legal in Node 22. The dynamic import then boots the
// ESM server (handling its top-level await), and adapter-node starts listening
// on the port Passenger provides via process.env.PORT.
//
// It MUST be named app.js (not app.cjs) — the Node Selector UI only accepts a
// .js startup file. In the cPanel Node.js App, set Application startup file to:
//   app.js
import('./build/index.js').catch((err) => {
  console.error('Failed to start app:', err);
  process.exit(1);
});
