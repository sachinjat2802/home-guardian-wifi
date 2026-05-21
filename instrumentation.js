export async function register() { // sensing pipeline reload
  // Only execute in Node.js server environment (not edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Avoid starting background polling loops and WS server during static page export builds
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return;
    }

    try {
      // Use new Function to bypass Next.js Turbopack statically analyzing and failing to parse the module
      const modulePath = 'file://' + process.cwd() + '/app/sensing/engine.js';
      const dynamicImport = new Function('modulePath', 'return import(modulePath)');
      const engine = await dynamicImport(modulePath);
      engine.startSensingServer();
      console.log('✅ [Next.js] Sensing server initialization called');
    } catch (err) {
      console.error('⚠️ [Next.js Startup] Failed to start sensing server dynamically:', err);
    }
  }
}
