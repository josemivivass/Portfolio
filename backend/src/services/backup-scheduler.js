const cron = require('node-cron');
const { generateBackupSql, backupFilename } = require('./backup.service');
const drive = require('./drive.service');

// Programa el backup automático de la base de datos a Google Drive.
// Variables de entorno:
//   BACKUP_CRON  - Expresión cron (por defecto "0 3 * * 1" = lunes a las 03:00)
//   BACKUP_TZ    - Zona horaria del cron (por defecto "Europe/Madrid")

const CRON_EXPR = process.env.BACKUP_CRON || '0 3 * * 1';
const CRON_TZ = process.env.BACKUP_TZ || 'Europe/Madrid';

// Genera el volcado y lo sube a Drive.
async function runBackup() {
  const filename = backupFilename();
  console.log(`[backup] Generando volcado: ${filename}`);
  const sql = await generateBackupSql();
  const file = await drive.uploadBackup(sql, filename);
  console.log(`[backup] Subido a Google Drive: ${file.name} (id: ${file.id})`);
  return file;
}

// Arranca el cron del backup. Si faltan credenciales o la expresión es inválida, avisa por consola.
function start() {
  if (!drive.isConfigured()) {
    console.warn(
      '[backup] Backup automático a Drive DESHABILITADO: faltan las credenciales ' +
      'de Google (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN).'
    );
    return;
  }
  if (!cron.validate(CRON_EXPR)) {
    console.error(`[backup] BACKUP_CRON inválido: "${CRON_EXPR}". Backup automático no programado.`);
    return;
  }

  cron.schedule(CRON_EXPR, () => {
    runBackup().catch((err) => {
      console.error('[backup] Error en el backup programado:', err.message || err);
    });
  }, { timezone: CRON_TZ });

  console.log(`[backup] Backup automático a Google Drive programado (cron "${CRON_EXPR}", ${CRON_TZ}).`);
}

module.exports = { start, runBackup };
