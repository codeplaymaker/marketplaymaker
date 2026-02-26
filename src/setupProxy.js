const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // ─── Polymarket Bot API (must be BEFORE /api to match first) ─────
  app.use(
    '/polybot',
    createProxyMiddleware({
      target: 'http://localhost:4000/api',
      changeOrigin: true,
      pathRewrite: { '^/polybot': '' },
      logger: console,
      proxyTimeout: 30000,    // 30s timeout to prevent hanging
      timeout: 30000,
      onError: (err, req, res) => {
        console.error('[Proxy Error]', err.message);
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Bot server unavailable' }));
        }
      },
    })
  );

  // ─── MetaTrader Client API ──────────────────────────────────────
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'https://mt-client-api-v1.london.agiliumtrade.ai',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '',
      },
      ws: true,
      logger: console,
    })
  );

  // ─── MetaStats API ─────────────────────────────────────────────
  app.use(
    '/metastats-api',
    createProxyMiddleware({
      target: 'https://metastats-api-v1.london.agiliumtrade.ai',
      changeOrigin: true,
      pathRewrite: {
        '^/metastats-api': '',
      },
      ws: true,
      logger: console,
    })
  );
};