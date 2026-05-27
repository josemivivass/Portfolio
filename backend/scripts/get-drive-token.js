/**
 * Script de un solo uso para obtener el GOOGLE_REFRESH_TOKEN de Google Drive.
 *
 * Está pensado para ejecutarse en una máquina con navegador como el equipo
 * de desarrollo:
 *
 *   node scripts/get-drive-token.js
 *
 * Requiere GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET definidos en backend/.env
 * (credenciales OAuth de tipo "App de escritorio" creadas en Google Cloud).
 *
 * El script levanta un servidor local temporal, genera una URL de autorización
 * y, una vez aceptada, imprime la línea GOOGLE_REFRESH_TOKEN=... que debe
 * pegarse en el .env del servidor.
 */
require('dotenv').config();
const http = require('http');
const { google } = require('googleapis');

const PORT = Number(process.env.OAUTH_HELPER_PORT) || 5273;
const REDIRECT_URI = `http://localhost:${PORT}`;
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('\n[ERROR] Falta GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en el .env.');
  console.error('Créalos en Google Cloud Console y añádelos antes de ejecutar este script.\n');
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

const authUrl = oauth2.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: SCOPES
});

const server = http.createServer(async (req, res) => {
  if (!req.url.includes('code=') && !req.url.includes('error=')) {
    res.writeHead(404);
    res.end();
    return;
  }
  try {
    const url = new URL(req.url, REDIRECT_URI);
    const error = url.searchParams.get('error');
    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h2>Autorización cancelada: ${error}</h2>`);
      console.error(`\n[ERROR] Autorización cancelada: ${error}\n`);
      server.close(() => process.exit(1));
      return;
    }

    const code = url.searchParams.get('code');
    const { tokens } = await oauth2.getToken(code);

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h2>Listo. Ya puedes cerrar esta pestaña y volver a la terminal.</h2>');

    if (tokens.refresh_token) {
      console.log('COPIA ESTA LÍNEA EN EL .env DEL SERVIDOR:');
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
    } else {
      console.error('\n[ERROR] Google no devolvió refresh_token.');
      console.error('Revoca el acceso de la app en https://myaccount.google.com/permissions');
      console.error('y vuelve a ejecutar este script.\n');
    }
    server.close(() => process.exit(tokens.refresh_token ? 0 : 1));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h2>Error al obtener el token. Revisa la terminal.</h2>');
    console.error('\n[ERROR]', err.message || err, '\n');
    server.close(() => process.exit(1));
  }
});

server.listen(PORT, () => {
  console.log('\n1) Abre esta URL en tu navegador y autoriza el acceso:\n');
  console.log('   ' + authUrl + '\n');
  console.log(`2) Esperando la redirección en ${REDIRECT_URI} ...`);
  console.log('   (deja este proceso abierto hasta que termine)\n');
});
