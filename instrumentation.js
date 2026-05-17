export async function register() {
  // Only execute in Node.js server environment (not edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Avoid starting background polling loops and WS server during static page export builds
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return;
    }

    try {
      const { startSensingServer } = await import('./app/sensing/engine.js');
      startSensingServer();
    } catch (err) {
      console.error('⚠️ [Next.js Startup] Failed to start sensing server dynamically:', err);
    }
  }
}
