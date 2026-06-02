#!/usr/bin/env node
// Rellena las columnas geo (país, ciudad, lat/lng) de visitor_logs a partir de ip_address.
// Flags: --all (recalcula todas), --dry-run (no escribe).
// Uso: node scripts/backfill-geo.js [--dry-run] [--all]

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const { geoLookup } = require('../src/utils/geo');

const args = new Set(process.argv.slice(2));
const FORCE_ALL = args.has('--all');
const DRY_RUN = args.has('--dry-run');

async function backfillVisitorLogs(conn) {
  const whereClause = FORCE_ALL ? '' : 'WHERE country_code IS NULL';
  const [rows] = await conn.query(`SELECT id, ip_address FROM visitor_logs ${whereClause}`);

  if (rows.length === 0) {
    console.log('[visitor_logs] 0 filas para procesar.');
    return { total: 0, resolved: 0, unresolved: 0 };
  }

  let resolved = 0;
  let unresolved = 0;
  const cache = new Map();

  for (const row of rows) {
    let geo;
    if (cache.has(row.ip_address)) {
      geo = cache.get(row.ip_address);
    } else {
      geo = geoLookup(row.ip_address);
      cache.set(row.ip_address, geo);
    }

    if (!geo) {
      unresolved++;
      continue;
    }

    if (!DRY_RUN) {
      await conn.query(
        `UPDATE visitor_logs
         SET country_code = ?, country_name = ?, region = ?, city = ?, latitude = ?, longitude = ?
         WHERE id = ?`,
        [geo.country_code, geo.country_name, geo.region, geo.city, geo.latitude, geo.longitude, row.id]
      );
    }
    resolved++;
  }

  console.log(
    `[visitor_logs] ${rows.length} filas — resueltas: ${resolved}, sin geo: ${unresolved}` +
    (DRY_RUN ? ' (dry-run, no escrito)' : '')
  );
  return { total: rows.length, resolved, unresolved };
}

(async () => {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4'
    });

    console.log(`Conectado a ${process.env.DB_HOST} / ${process.env.DB_NAME}`);
    console.log(`Modo: ${FORCE_ALL ? 'TODAS las filas' : 'solo country_code IS NULL'}${DRY_RUN ? ' · DRY-RUN' : ''}`);

    const r = await backfillVisitorLogs(conn);
    console.log(`\nResumen: visitor_logs ${r.resolved}/${r.total} filas con geo (${r.unresolved} sin resolver).`);
  } catch (err) {
    console.error('Error en backfill:', err.message);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
})();
