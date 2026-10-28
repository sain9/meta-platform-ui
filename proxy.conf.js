// proxy.conf.js — read by the Angular dev server (Node), not the browser
const TARGET = process.env.API_TARGET || 'http://localhost:9997';

console.log(`[proxy] /api -> ${TARGET}`);

module.exports = {
  '/api': {
    target: TARGET,
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
  },
};