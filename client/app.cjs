// CommonJS launcher for cPanel / LiteSpeed Passenger.
//
// adapter-node's entry (build/index.js) is an ES module, and the cPanel/
// LiteSpeed Node loader often can't start an ESM file directly as the
// "Application startup file". This CommonJS shim can always be loaded, and it
// dynamically imports the ESM server — which starts listening on the port
// Passenger provides via process.env.PORT as soon as it's imported.
//
// In the cPanel Node.js App, set the Application startup file to: app.cjs
import('./build/index.js').catch((err) => {
  console.error('Failed to start app:', err);
  process.exit(1);
});
