const mysql = require('mysql2');
const pool = require('../config/db');

// Lógica de generación del volcado .sql, reutilizable tanto por el endpoint
// de descarga del admin como por el backup programado a Google Drive.

function escapeSqlValue(v) {
  if (v === null || v === undefined) return 'NULL';
  if (Buffer.isBuffer(v) || v instanceof Date) return mysql.escape(v);
  if (typeof v === 'object') return mysql.escape(JSON.stringify(v));
  return mysql.escape(v);
}

function prettifyCreateTable(stmt) {
  stmt = stmt.replace(/`([A-Za-z_][A-Za-z0-9_]*)`/g, '$1');
  stmt = stmt.replace(/\b(tinyint|smallint|mediumint|int|bigint)\(\d+\)/gi, (_m, t) => t.toUpperCase());
  stmt = stmt.replace(
    /\b(tinyint|smallint|mediumint|int|bigint|varchar|char|text|longtext|mediumtext|tinytext|datetime|timestamp|date|time|year|boolean|bool|enum|set|json|blob|longblob|mediumblob|tinyblob|float|double|decimal|numeric)\b/gi,
    (m) => m.toUpperCase()
  );
  stmt = stmt.replace(/\bcurrent_timestamp\(\)/gi, 'CURRENT_TIMESTAMP');
  stmt = stmt.replace(/\bon update current_timestamp\b/gi, 'ON UPDATE CURRENT_TIMESTAMP');
  stmt = stmt.replace(/\s*ENGINE=\w+/i, '');
  stmt = stmt.replace(/\s*AUTO_INCREMENT=\d+/i, '');
  stmt = stmt.replace(/\s*DEFAULT CHARSET=\w+/i, '');
  stmt = stmt.replace(/\s*COLLATE=\w+/i, '');
  stmt = stmt.replace(/\s*ROW_FORMAT=\w+/i, '');
  stmt = stmt.replace(/\bnot null\b/gi, 'NOT NULL');
  stmt = stmt.replace(/\bdefault\b/gi, 'DEFAULT');
  stmt = stmt.replace(/\bauto_increment\b/gi, 'AUTO_INCREMENT');
  stmt = stmt.replace(/\bprimary key\b/gi, 'PRIMARY KEY');
  stmt = stmt.replace(/\bforeign key\b/gi, 'FOREIGN KEY');
  stmt = stmt.replace(/\breferences\b/gi, 'REFERENCES');
  stmt = stmt.replace(/\bunique key\b/gi, 'UNIQUE KEY');
  stmt = stmt.replace(/\bconstraint\b/gi, 'CONSTRAINT');
  stmt = stmt.replace(/\bon delete (cascade|set null|restrict|no action)\b/gi, (_m, a) => `ON DELETE ${a.toUpperCase()}`);
  stmt = stmt.replace(/\bon update (cascade|set null|restrict|no action)\b/gi, (_m, a) => `ON UPDATE ${a.toUpperCase()}`);
  stmt = stmt.replace(/\bcheck\b/gi, 'CHECK');
  stmt = stmt.split('\n').map((line, i) => {
    if (i === 0) return line;
    if (line.startsWith('  ')) return '    ' + line.slice(2);
    return line;
  }).join('\n');
  return stmt.replace(/[ \t]+$/gm, '');
}

// Marca de tiempo para el nombre del fichero: DD-MM-YYYY_HHhMM
function backupTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}` +
         `_${pad(date.getHours())}h${pad(date.getMinutes())}`;
}

function backupFilename(date = new Date()) {
  return `Backup_${backupTimestamp(date)}.sql`;
}

// Genera el volcado completo invocando write(line) por cada línea
async function streamBackup(write) {
  const dbName = process.env.DB_NAME || 'portfolio';
  const now = new Date();

  const [tableRows] = await pool.query(
    'SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = ? ORDER BY TABLE_NAME',
    [dbName, 'BASE TABLE']
  );
  const tables = tableRows.map((r) => r.TABLE_NAME);

  const [fkRows] = await pool.query(
    `SELECT TABLE_NAME AS child, REFERENCED_TABLE_NAME AS parent
       FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ?
        AND REFERENCED_TABLE_NAME IS NOT NULL`,
    [dbName]
  );
  const deps = new Map(tables.map((t) => [t, new Set()]));
  for (const r of fkRows) {
    if (r.parent !== r.child && deps.has(r.child) && tables.includes(r.parent)) {
      deps.get(r.child).add(r.parent);
    }
  }

  // Topo sort: emitir tablas padre antes que sus hijas.
  const ordered = [];
  const visited = new Set();
  const visiting = new Set();
  const visit = (t) => {
    if (visited.has(t) || visiting.has(t)) return;
    visiting.add(t);
    for (const p of deps.get(t) || []) visit(p);
    visiting.delete(t);
    visited.add(t);
    ordered.push(t);
  };
  for (const t of tables) visit(t);

  write(`-- Backup de la base de datos \`${dbName}\``);
  write(`-- Generado: ${now.toISOString()}`);
  write('');
  write('SET FOREIGN_KEY_CHECKS = 0;');
  write('SET NAMES utf8mb4;');
  write('SET CHARACTER SET utf8mb4;');
  write('');
  write(`DROP DATABASE IF EXISTS \`${dbName}\`;`);
  write(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  write(`USE \`${dbName}\`;`);
  write('');

  for (const tableName of ordered) {
    const [createRows] = await pool.query(`SHOW CREATE TABLE \`${dbName}\`.\`${tableName}\``);
    const createStmt = prettifyCreateTable(createRows[0]['Create Table']);

    write(`-- ───────── Tabla: ${tableName} ─────────`);
    write(`${createStmt};`);
    write('');

    const [rows] = await pool.query(`SELECT * FROM \`${dbName}\`.\`${tableName}\``);
    if (rows.length > 0) {
      const cols = Object.keys(rows[0]).join(', ');
      write(`INSERT INTO ${tableName} (${cols}) VALUES`);
      rows.forEach((r, idx) => {
        const vals = Object.values(r).map(escapeSqlValue).join(', ');
        const suffix = idx === rows.length - 1 ? ';' : ',';
        write(`(${vals})${suffix}`);
      });
      write('');
    }
  }

  write('SET FOREIGN_KEY_CHECKS = 1;');
}

// Genera el volcado completo como una única cadena de texto.
async function generateBackupSql() {
  const lines = [];
  await streamBackup((line) => lines.push(line));
  return lines.join('\n') + '\n';
}

module.exports = { streamBackup, generateBackupSql, backupFilename };
