// Configuración para desarrollo local.
export const environment = {
  production: false,
  apiHost: 'http://localhost:3000',
  apiUrl: 'http://localhost:3000/api',
  // Host que usa el SSR (Node) para llamar a la API sin salir a internet.
  ssrApiHost: 'http://localhost:3000'
};
