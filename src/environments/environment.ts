export const environment = {
  production: false,
  apiBase: '/api/v1/users',           //used in auth.ts as baseUrl = environment.apiBase;
  apiHost: 'http://localhost:9997',   // only used by the proxy.conf.js
};