const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'https://mt-client-api-v1.london.agiliumtrade.ai',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '',
      },
      ws: true,
      logLevel: 'debug',
    })
  );

  app.use(
    '/metastats-api',
    createProxyMiddleware({
      target: 'https://metastats-api-v1.london.agiliumtrade.ai',
      changeOrigin: true,
      pathRewrite: {
        '^/metastats-api': '',
      },
      ws: true,
      logLevel: 'debug',
    })
  );
};
