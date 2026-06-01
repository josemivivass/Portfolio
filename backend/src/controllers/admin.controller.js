const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pool = require('../config/db');
const { streamBackup, backupFilename } = require('../services/backup.service');
const backupScheduler = require('../services/backup-scheduler');
const {
  PROJECTS_DIR,
  PROJECT_IMG_URL_PREFIX,
  PENDING_FOLDER,
  IMG_EXT_RE,
  ensureProjectsDir,
  resolveLocalImagePath,
  deleteLocalImageFile,
  slugifyProjectTitle,
  nextPhotoName,
  promotePendingImages,
  normalizeProjectImages
} = require('../utils/project-images');

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
const normNotebookUrl = (v) => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t || !/^https?:\/\//i.test(t)) return null;
  return t.slice(0, 500);
};

async function replaceProjectImages(connection, projectId, images) {
  const [prev] = await connection.query(
    'SELECT image_url FROM project_images WHERE project_id = ?',
    [projectId]
  );
  await connection.query('DELETE FROM project_images WHERE project_id = ?', [projectId]);
  const newUrls = new Set();
  const newFilenames = new Set();
  if (Array.isArray(images) && images.length > 0) {
    const rows = images
      .filter(img => img && typeof img.url === 'string' && img.url.trim().length > 0)
      .map((img, i) => {
        const url = img.url.trim();
        newUrls.add(url);
        newFilenames.add(path.basename(url));
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
  const orphanFromDb = prev.map(r => r.image_url).filter(u => !newUrls.has(u));
  const orphanFromFs = [];
  const dir = path.join(PROJECTS_DIR, String(projectId));
  let fsFiles = [];
  try { fsFiles = await fs.promises.readdir(dir); } catch { /* ok */ }
  for (const f of fsFiles) {
    if (!IMG_EXT_RE.test(f)) continue;
    if (newFilenames.has(f)) continue;
    orphanFromFs.push(`${PROJECT_IMG_URL_PREFIX}${projectId}/${f}`);
  }
  return [...new Set([...orphanFromDb, ...orphanFromFs])];
}

exports.createProject = async (req, res) => {
  const {
    title, title_en, description, description_en, project_date,
    repo_url, live_url, notebook_url, tags, is_featured,
    project_type, status,
    images
  } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      `INSERT INTO projects
        (title, title_en, description, description_en, project_date,
         repo_url, live_url, notebook_url, tags, is_featured,
         project_type, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, title_en, description, description_en, project_date,
       repo_url, live_url, normNotebookUrl(notebook_url), tags, !!is_featured,
       normType(project_type),
       normStatus(status)]
    );
    await promotePendingImages(images, result.insertId, title);
    await replaceProjectImages(connection, result.insertId, images);
    await normalizeProjectImages(connection, result.insertId, title);
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
    repo_url, live_url, notebook_url, tags, is_featured,
    project_type, status,
    images
  } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      `UPDATE projects SET
         title = ?, title_en = ?, description = ?, description_en = ?,
         project_date = ?, repo_url = ?, live_url = ?, notebook_url = ?,
         tags = ?, is_featured = ?,
         project_type = ?, status = ?
       WHERE id = ?`,
      [title, title_en, description, description_en, project_date,
       repo_url, live_url, normNotebookUrl(notebook_url), tags, !!is_featured,
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
    
    await Promise.all(orphanUrls.map(async (u) => {
      const fp = resolveLocalImagePath(u);
      if (!fp) return;
      try { await fs.promises.unlink(fp); } catch { /* ENOENT ok */ }
    }));
    await normalizeProjectImages(connection, id, title);
    await connection.commit();
    res.status(200).json({ message: 'Proyecto actualizado' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar proyecto' });
  } finally {
    connection.release();
  }
};

exports.updateProjectFeatured = async (req, res) => {
  const { id } = req.params;
  const { is_featured } = req.body;
  try {
    const [result] = await pool.query(
      'UPDATE projects SET is_featured = ? WHERE id = ?',
      [is_featured ? 1 : 0, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }
    res.status(200).json({ message: 'Proyecto actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar proyecto' });
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

exports.deleteVisitorLog = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM visitor_logs WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Visita no encontrada' });
    }
    res.status(200).json({ message: 'Visita eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar visita' });
  }
};

exports.deleteLoginLog = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM login_logs WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Inicio de sesión no encontrado' });
    }
    res.status(200).json({ message: 'Inicio de sesión eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar inicio de sesión' });
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

    let filename;
    if (folder === PENDING_FOLDER) {
      filename = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${ext}`;
    } else {
      const [rows] = await pool.query('SELECT title FROM projects WHERE id = ?', [Number(folder)]);
      const title = rows[0]?.title || `Proyecto${folder}`;
      const slug = slugifyProjectTitle(title);
      filename = await nextPhotoName(targetDir, slug, ext);
    }

    const filePath = path.join(targetDir, filename);
    await fs.promises.writeFile(filePath, buffer);
    const url = `${PROJECT_IMG_URL_PREFIX}${folder}/${filename}`;
    res.status(201).json({ url, filename, folder, size: buffer.length, mime: normalizedMime });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al guardar la imagen' });
  }
};

exports.downloadBackup = async (req, res) => {
  const filename = backupFilename();

  res.setHeader('Content-Type', 'application/sql; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');

  try {
    await streamBackup((line) => res.write(line + '\n'));
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

// Genera un backup y lo sube a Google Drive de inmediato
exports.runDriveBackup = async (req, res) => {
  try {
    const file = await backupScheduler.runBackup();
    res.status(200).json({
      message: 'Backup subido a Google Drive',
      file: { id: file.id, name: file.name, link: file.webViewLink || null }
    });
  } catch (err) {
    console.error('[admin] drive backup error:', err);
    res.status(500).json({
      message: 'Error al subir el backup a Google Drive',
      detail: err.message || 'Error desconocido'
    });
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
