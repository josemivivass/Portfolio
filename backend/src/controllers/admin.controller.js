const pool = require('../config/db');

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

// ─── PROJECTS ──────────────────────────────────────────
exports.createProject = async (req, res) => {
  const {
    title, title_en, description, description_en, project_date,
    repo_url, live_url, image_url, tags, is_featured
  } = req.body;

  try {
    const [result] = await pool.query(
      `INSERT INTO projects
        (title, title_en, description, description_en, project_date,
         repo_url, live_url, image_url, tags, is_featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, title_en, description, description_en, project_date,
       repo_url, live_url, image_url, tags, !!is_featured]
    );
    res.status(201).json({ id: result.insertId, message: 'Proyecto creado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al crear proyecto' });
  }
};

exports.updateProject = async (req, res) => {
  const { id } = req.params;
  const {
    title, title_en, description, description_en, project_date,
    repo_url, live_url, image_url, tags, is_featured
  } = req.body;

  try {
    const [result] = await pool.query(
      `UPDATE projects SET
         title = ?, title_en = ?, description = ?, description_en = ?,
         project_date = ?, repo_url = ?, live_url = ?, image_url = ?,
         tags = ?, is_featured = ?
       WHERE id = ?`,
      [title, title_en, description, description_en, project_date,
       repo_url, live_url, image_url, tags, !!is_featured, id]
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
    const [result] = await pool.query('DELETE FROM projects WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
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

// ─── LOGS / MESSAGES ───────────────────────────────────
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

// ─── CHATBOT ──────────────────────────────────────────
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
