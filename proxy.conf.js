// proxy.conf.js — read by the Angular dev server (Node), not the browser

const GATEWAY = process.env.API_TARGET || 'http://localhost:9999';

console.log(`[proxy] /api -> ${GATEWAY}`);

module.exports = {
  '/api': {
    target: GATEWAY,
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
  },
};