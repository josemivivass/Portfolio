// Configuración para producción (SSR + API en el mismo host, tras Cloudflare Tunnel).
export const environment = {
  production: true,
  apiHost: 'https://api.josemivivass.com',
  apiUrl: 'https://api.josemivivass.com/api',
  // El SSR corre junto al backend: le habla por loopback en vez de dar la vuelta
  // por Cloudflare, que además del coste en latencia no es alcanzable desde el origen.
  ssrApiHost: 'http://127.0.0.1:3000'
};
