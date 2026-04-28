const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
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

// ─── USERS ─────────────────────────────────────────────
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

//Proyectos

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

// ─── EXPERIENCE ────────────────────────────────────────
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

//Logs / mensajes

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

// Chatbot
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

// Subida de img de proyecto

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
