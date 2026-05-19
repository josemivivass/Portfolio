const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2');
const pool = require('../config/db');

const PROJECTS_DIR = path.join(__dirname, '..', 'data', 'projects');
const PROJECT_IMG_URL_PREFIX = '/api/projects/images/';
const PENDING_FOLDER = '_pending';

function ensureProjectsDir() {
  if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

function resolveLocalImagePath(url) {
  if (typeof url !== 'string' || !url.startsWith(PROJECT_IMG_URL_PREFIX)) return null;
  const tail = url.slice(PROJECT_IMG_URL_PREFIX.length);
  const parts = tail.split('/').filter(Boolean);
  if (parts.length === 1) {
    const safe = path.basename(parts[0]);
    if (!safe) return null;
    return path.join(PROJECTS_DIR, safe);
  }
  if (parts.length === 2) {
    const folder = path.basename(parts[0]);
    const filename = path.basename(parts[1]);
    if (!folder || !filename) return null;
    return path.join(PROJECTS_DIR, folder, filename);
  }
  return null;
}

function deleteLocalImageFile(url) {
  const filePath = resolveLocalImagePath(url);
  if (!filePath) return;
  fs.promises.unlink(filePath).catch(() => { /* ignorar ENOENT, etc. */ });
}

async function promotePendingImages(images, projectId) {
  if (!Array.isArray(images) || images.length === 0) return;
  const pendingPrefix = `${PROJECT_IMG_URL_PREFIX}${PENDING_FOLDER}/`;
  const targetDir = path.join(PROJECTS_DIR, String(projectId));
  let dirReady = false;
  for (const img of images) {
    if (!img || typeof img.url !== 'string') continue;
    if (!img.url.startsWith(pendingPrefix)) continue;
    const filename = path.basename(img.url.slice(pendingPrefix.length));
    if (!filename) continue;
    if (!dirReady) {
      await fs.promises.mkdir(targetDir, { recursive: true });
      dirReady = true;
    }
    const oldPath = path.join(PROJECTS_DIR, PENDING_FOLDER, filename);
    const newPath = path.join(targetDir, filename);
    try {
      await fs.promises.rename(oldPath, newPath);
      img.url = `${PROJECT_IMG_URL_PREFIX}${projectId}/${filename}`;
    } catch (e) {
      console.warn('[admin] no se pudo mover imagen pending', oldPath, e?.message);
    }
  }
}

exports.listUsers = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al listar usuarios' });
  }
};

exports.updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const validRoles = ['admin', 'editor', 'user'];

  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: 'Rol inválido' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE users SET role = ? WHERE id = ?',
      [role, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.status(200).json({ message: 'Rol actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar rol' });
  }
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { email, role } = req.body;
  const validRoles = ['admin', 'editor', 'user'];

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ message: 'Email requerido' });
  }

  if (req.user.role !== 'admin') {
    try {
      const [rows] = await pool.query('SELECT role FROM users WHERE id = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }
      if (rows[0].role === 'admin') {
        return res.status(403).json({ message: 'No puedes editar a un administrador' });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error al verificar usuario' });
    }
  }

  const fields = ['email = ?'];
  const values = [email];

  if (role !== undefined) {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Solo un administrador puede cambiar el rol' });
    }
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Rol inválido' });
    }
    fields.push('role = ?');
    values.push(role);
  }

  values.push(id);

  try {
    const [result] = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.status(200).json({ message: 'Usuario actualizado' });
  } catch (err) {
    console.error(err);
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Ese email ya está en uso' });
    }
    res.status(500).json({ message: 'Error al actualizar usuario' });
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  if (req.user && String(req.user.userId) === String(id)) {
    return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta' });
  }
  try {
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.status(200).json({ message: 'Usuario eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar usuario' });
  }
};

const ALLOWED_TYPES   = ['web', 'android', 'ai', 'other'];
const ALLOWED_STATUS  = ['production', 'development', 'archived'];
const normType   = (v) => ALLOWED_TYPES.includes(v) ? v : 'web';
const normStatus = (v) => ALLOWED_STATUS.includes(v) ? v : null;

async function replaceProjectImages(connection, projectId, images) {
  const [prev] = await connection.query(
    'SELECT image_url FROM project_images WHERE project_id = ?',
    [projectId]
  );
  await connection.query('DELETE FROM project_images WHERE project_id = ?', [projectId]);
  const newUrls = new Set();
  if (Array.isArray(images) && images.length > 0) {
    const rows = images
      .filter(img => img && typeof img.url === 'string' && img.url.trim().length > 0)
      .map((img, i) => {
        const url = img.url.trim();
        newUrls.add(url);
        return [
          projectId,
          url,
          Number.isFinite(img.position) ? img.position : i
        ];
      });
    if (rows.length > 0) {
      await connection.query(
        `INSERT INTO project_images (project_id, image_url, position) VALUES ?`,
        [rows]
      );
    }
  }
  return prev.map(r => r.image_url).filter(u => !newUrls.has(u));
}

exports.createProject = async (req, res) => {
  const {
    title, title_en, description, description_en, project_date,
    repo_url, live_url, tags, is_featured,
    project_type, status,
    images
  } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      `INSERT INTO projects
        (title, title_en, description, description_en, project_date,
         repo_url, live_url, tags, is_featured,
         project_type, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, title_en, description, description_en, project_date,
       repo_url, live_url, tags, !!is_featured,
       normType(project_type),
       normStatus(status)]
    );
    await promotePendingImages(images, result.insertId);
    await replaceProjectImages(connection, result.insertId, images);
    await connection.commit();
    res.status(201).json({ id: result.insertId, message: 'Proyecto creado', images });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: 'Error al crear proyecto' });
  } finally {
    connection.release();
  }
};

exports.updateProject = async (req, res) => {
  const { id } = req.params;
  const {
    title, title_en, description, description_en, project_date,
    repo_url, live_url, tags, is_featured,
    project_type, status,
    images
  } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      `UPDATE projects SET
         title = ?, title_en = ?, description = ?, description_en = ?,
         project_date = ?, repo_url = ?, live_url = ?,
         tags = ?, is_featured = ?,
         project_type = ?, status = ?
       WHERE id = ?`,
      [title, title_en, description, description_en, project_date,
       repo_url, live_url, tags, !!is_featured,
       normType(project_type),
       normStatus(status), id]
    );
    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }
    let orphanUrls = [];
    if (Array.isArray(images)) {
      orphanUrls = await replaceProjectImages(connection, id, images);
    }
    await connection.commit();
    orphanUrls.forEach(deleteLocalImageFile);
    res.status(200).json({ message: 'Proyecto actualizado' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar proyecto' });
  } finally {
    connection.release();
  }
};

exports.deleteProject = async (req, res) => {
  const { id } = req.params;
  try {
    const [imgs] = await pool.query(
      'SELECT image_url FROM project_images WHERE project_id = ?',
      [id]
    );
    const [result] = await pool.query('DELETE FROM projects WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }
    imgs.forEach(r => deleteLocalImageFile(r.image_url));
    const idNum = Number(id);
    if (Number.isInteger(idNum) && idNum > 0) {
      const folder = path.join(PROJECTS_DIR, String(idNum));
      fs.promises.rm(folder, { recursive: true, force: true }).catch(() => {});
    }
    res.status(200).json({ message: 'Proyecto eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar proyecto' });
  }
};

exports.createExperience = async (req, res) => {
  const {
    start_date, end_date, title, title_en, company,
    contract_type, contract_type_en, description, description_en,
    location, location_en, tags
  } = req.body;

  try {
    const [result] = await pool.query(
      `INSERT INTO experience
        (start_date, end_date, title, title_en, company,
         contract_type, contract_type_en, description, description_en,
         location, location_en, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [start_date, end_date || null, title, title_en, company,
       contract_type, contract_type_en, description, description_en,
       location, location_en, tags]
    );
    res.status(201).json({ id: result.insertId, message: 'Experiencia creada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al crear experiencia' });
  }
};

exports.updateExperience = async (req, res) => {
  const { id } = req.params;
  const {
    start_date, end_date, title, title_en, company,
    contract_type, contract_type_en, description, description_en,
    location, location_en, tags
  } = req.body;

  try {
    const [result] = await pool.query(
      `UPDATE experience SET
         start_date = ?, end_date = ?, title = ?, title_en = ?, company = ?,
         contract_type = ?, contract_type_en = ?, description = ?, description_en = ?,
         location = ?, location_en = ?, tags = ?
       WHERE id = ?`,
      [start_date, end_date || null, title, title_en, company,
       contract_type, contract_type_en, description, description_en,
       location, location_en, tags, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Experiencia no encontrada' });
    }
    res.status(200).json({ message: 'Experiencia actualizada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar experiencia' });
  }
};

exports.listVisitorLogs = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, visitor_uuid, entry_time, ip_address, user_agent, is_logged_in
       FROM visitor_logs
       ORDER BY entry_time DESC
       LIMIT 500`
    );
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al listar visitas' });
  }
};

exports.listLoginLogs = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT l.id, l.user_id, u.email, l.login_time, l.ip_address,
              l.user_agent, l.language, l.screen_resolution, l.time_zone
       FROM login_logs l
       LEFT JOIN users u ON u.id = l.user_id
       ORDER BY l.login_time DESC
       LIMIT 500`
    );
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al listar logins' });
  }
};

exports.listContactMessages = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, email, message, is_answered, created_at
       FROM contact_messages
       ORDER BY created_at DESC
       LIMIT 500`
    );
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al listar mensajes' });
  }
};

exports.updateContactMessageAnswered = async (req, res) => {
  const { id } = req.params;
  const { is_answered } = req.body;
  try {
    const [result] = await pool.query(
      'UPDATE contact_messages SET is_answered = ? WHERE id = ?',
      [is_answered ? 1 : 0, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Mensaje no encontrado' });
    }
    res.status(200).json({ message: 'Mensaje actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar mensaje' });
  }
};

exports.deleteContactMessage = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM contact_messages WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Mensaje no encontrado' });
    }
    res.status(200).json({ message: 'Mensaje eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar mensaje' });
  }
};

exports.listChatbotConversations = async (req, res) => {
  try {
    const [messages] = await pool.query(
      `SELECT m.id, m.user_id, m.session_id, u.email, m.role, m.message,
              m.tokens_used, m.model, m.ip_address, m.user_agent, m.created_at
       FROM chatbot_messages m
       LEFT JOIN users u ON u.id = m.user_id
       ORDER BY m.created_at DESC
       LIMIT 2000`
    );
    const [clears] = await pool.query(
      `SELECT c.user_id, c.cleared_at
       FROM chatbot_clears c
       ORDER BY c.cleared_at ASC`
    );
    res.status(200).json({ messages, clears });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al listar conversaciones del chatbot' });
  }
};

exports.deleteChatbotMessage = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM chatbot_messages WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Mensaje no encontrado' });
    }
    res.status(200).json({ message: 'Mensaje eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar mensaje del chatbot' });
  }
};

exports.deleteChatbotConversation = async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'Se requiere un array de IDs' });
  }
  try {
    const [result] = await pool.query(
      'DELETE FROM chatbot_messages WHERE id IN (?)',
      [ids]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Conversación no encontrada' });
    }
    res.status(200).json({ message: 'Conversación eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar conversación' });
  }
};

exports.deleteExperience = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM experience WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Experiencia no encontrada' });
    }
    res.status(200).json({ message: 'Experiencia eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar experiencia' });
  }
};

const ALLOWED_IMG_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
};
const MAX_PROJECT_IMG_BYTES = 5 * 1024 * 1024; // 5 MB

exports.uploadProjectImage = async (req, res) => {
  const { dataUrl, projectId } = req.body || {};
  if (typeof dataUrl !== 'string') {
    return res.status(400).json({ message: 'Archivo requerido' });
  }
  const match = /^data:(image\/(?:jpe?g|png|webp|gif));base64,(.+)$/i.exec(dataUrl);
  if (!match) {
    return res.status(400).json({ message: 'Formato no soportado (usa JPG, PNG, WEBP o GIF)' });
  }
  const mime = match[1].toLowerCase();
  const normalizedMime = mime === 'image/jpg' ? 'image/jpeg' : mime;
  if (!ALLOWED_IMG_MIME.includes(normalizedMime)) {
    return res.status(400).json({ message: 'Formato no soportado' });
  }
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > MAX_PROJECT_IMG_BYTES) {
    return res.status(413).json({ message: 'La imagen supera el límite de 5MB' });
  }

  let folder;
  if (projectId === undefined || projectId === null || projectId === '' || projectId === 'new') {
    folder = PENDING_FOLDER;
  } else {
    const idNum = Number(projectId);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return res.status(400).json({ message: 'projectId inválido' });
    }
    folder = String(idNum);
  }

  try {
    ensureProjectsDir();
    const targetDir = path.join(PROJECTS_DIR, folder);
    await fs.promises.mkdir(targetDir, { recursive: true });
    const ext = MIME_TO_EXT[normalizedMime];
    const filename = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${ext}`;
    const filePath = path.join(targetDir, filename);
    await fs.promises.writeFile(filePath, buffer);
    const url = `${PROJECT_IMG_URL_PREFIX}${folder}/${filename}`;
    res.status(201).json({ url, filename, folder, size: buffer.length, mime: normalizedMime });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al guardar la imagen' });
  }
};

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

exports.downloadBackup = async (req, res) => {
  const dbName = process.env.DB_NAME || 'portfolio';
  const pad = (n) => String(n).padStart(2, '0');
  const now = new Date();
  const stamp = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}_${pad(now.getHours())}h${pad(now.getMinutes())}`;
  const filename = `Backup_${stamp}.sql`;

  res.setHeader('Content-Type', 'application/sql; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');

  const write = (line) => res.write(line + '\n');

  try {
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
    res.end();
  } catch (err) {
    console.error('[admin] backup error:', err);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error al generar el backup' });
    } else {
      res.end();
    }
  }
};

exports.restoreBackup = async (req, res) => {
  const sql = typeof req.body === 'string' ? req.body : '';
  if (!sql.trim()) {
    return res.status(400).json({ message: 'El archivo SQL está vacío' });
  }

  const mysqlPromise = require('mysql2/promise');
  let conn;
  try {
    conn = await mysqlPromise.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      multipleStatements: true,
      charset: 'utf8mb4'
    });
    await conn.query(sql);
    res.status(200).json({ message: 'Base de datos restaurada correctamente' });
  } catch (err) {
    console.error('[admin] restore error:', err);
    res.status(500).json({
      message: 'Error al restaurar la base de datos',
      detail: err.sqlMessage || err.message || 'Error desconocido'
    });
  } finally {
    if (conn) {
      try { await conn.end(); } catch { /* noop */ }
    }
  }
};
