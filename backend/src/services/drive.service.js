const { google } = require('googleapis');
const { Readable } = require('stream');

// Subida de backups a Google Drive mediante OAuth2 (refresh token).
// Variables de entorno necesarias:
//   GOOGLE_CLIENT_ID            - ID de cliente OAuth (tipo "App de escritorio")
//   GOOGLE_CLIENT_SECRET        - Secreto de cliente OAuth
//   GOOGLE_REFRESH_TOKEN        - Token de refresco (ver scripts/get-drive-token.js)
//   GOOGLE_DRIVE_BACKUP_FOLDER  - Nombre de la carpeta en Drive (por defecto "backups")
//   GOOGLE_DRIVE_BACKUP_KEEP    - Nº de backups a conservar (por defecto 12; 0 = todos)

const FOLDER_NAME = process.env.GOOGLE_DRIVE_BACKUP_FOLDER || 'backups';
const KEEP = process.env.GOOGLE_DRIVE_BACKUP_KEEP !== undefined
  ? Number(process.env.GOOGLE_DRIVE_BACKUP_KEEP)
  : 12;

const escapeQuery = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

function isConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN
  );
}

function getDriveClient() {
  if (!isConfigured()) {
    throw new Error(
      'Faltan credenciales de Google Drive (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN).'
    );
  }
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.drive({ version: 'v3', auth: oauth2 });
}

// Busca la carpeta de backups; si no existe, la crea.
async function findOrCreateFolder(drive) {
  const { data } = await drive.files.list({
    q: `mimeType = 'application/vnd.google-apps.folder' ` +
       `and name = '${escapeQuery(FOLDER_NAME)}' and trashed = false`,
    fields: 'files(id, name)',
    spaces: 'drive'
  });
  if (data.files && data.files.length > 0) return data.files[0].id;

  const created = await drive.files.create({
    requestBody: {
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder'
    },
    fields: 'id'
  });
  return created.data.id;
}

// Borra los backups más antiguos dejando solo los KEEP más recientes.
async function rotate(drive, folderId) {
  if (!Number.isFinite(KEEP) || KEEP < 1) return;
  const { data } = await drive.files.list({
    q: `'${folderId}' in parents and name contains 'Backup_' and trashed = false`,
    fields: 'files(id, name, createdTime)',
    orderBy: 'createdTime desc',
    pageSize: 1000,
    spaces: 'drive'
  });
  const surplus = (data.files || []).slice(KEEP);
  for (const file of surplus) {
    try {
      await drive.files.delete({ fileId: file.id });
      console.log(`[backup] Backup antiguo eliminado de Drive: ${file.name}`);
    } catch (err) {
      console.warn(`[backup] No se pudo eliminar ${file.name}:`, err.message || err);
    }
  }
}

// Sube el contenido SQL a la carpeta de backups y rota los antiguos.
async function uploadBackup(content, filename) {
  const drive = getDriveClient();
  const folderId = await findOrCreateFolder(drive);

  const { data } = await drive.files.create({
    requestBody: { name: filename, parents: [folderId] },
    media: {
      mimeType: 'application/sql',
      body: Readable.from(content)
    },
    fields: 'id, name, webViewLink'
  });

  await rotate(drive, folderId);
  return data;
}

module.exports = { isConfigured, uploadBackup };
