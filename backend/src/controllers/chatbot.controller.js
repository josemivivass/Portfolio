const pool = require('../config/db');
const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');
const { loadSystemPrompt } = require('./profile.controller');

// Load API key from ai.env
const envPath = path.join(__dirname, '../../ai.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const apiKey = envContent.match(/AI_API_KEY=(.+)/)?.[1]?.trim();

const groq = new Groq({ apiKey });

const USER_TOKEN_LIMIT = 400000;
const GLOBAL_TOKEN_LIMIT = 500000;
const MODEL = 'llama-3.1-8b-instant';

// El prompt por defecto vive en profile.controller.js (DEFAULT_CHATBOT_PROMPT).
// En cada petición leemos el valor actual (editable desde el panel admin)
// mediante loadSystemPrompt(), que cae al default si no hay override.

// Helper: get the last clear timestamp for a user
async function getLastClear(userId) {
  const [rows] = await pool.query(
    `SELECT cleared_at FROM chatbot_clears
     WHERE user_id = ? ORDER BY cleared_at DESC LIMIT 1`,
    [userId]
  );
  return rows.length > 0 ? rows[0].cleared_at : null;
}

exports.sendMessage = async (req, res) => {
  const userId = req.user.userId;
  const { message } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'] || '';

  if (!message || !message.trim()) {
    return res.status(400).json({ message: 'El mensaje no puede estar vacío' });
  }

  try {
    // Check per-user daily token limit
    const [userTokenRows] = await pool.query(
      `SELECT COALESCE(SUM(tokens_used), 0) AS total_tokens FROM chatbot_messages
       WHERE user_id = ? AND DATE(created_at) = CURDATE()`,
      [userId]
    );
    if (userTokenRows[0].total_tokens >= USER_TOKEN_LIMIT) {
      return res.status(429).json({
        message: 'Has alcanzado el límite diario del asistente. Inténtalo mañana.'
      });
    }

    // Check global daily token limit (all users combined)
    const [globalTokenRows] = await pool.query(
      `SELECT COALESCE(SUM(tokens_used), 0) AS total_tokens FROM chatbot_messages
       WHERE DATE(created_at) = CURDATE()`
    );
    if (globalTokenRows[0].total_tokens >= GLOBAL_TOKEN_LIMIT) {
      return res.status(429).json({
        message: 'El asistente no está disponible temporalmente. Inténtalo mañana.'
      });
    }

    // Get conversation history (only after last clear)
    const lastClear = await getLastClear(userId);
    const historyQuery = lastClear
      ? `SELECT role, message FROM chatbot_messages
         WHERE user_id = ? AND DATE(created_at) = CURDATE() AND created_at > ?
         ORDER BY created_at ASC`
      : `SELECT role, message FROM chatbot_messages
         WHERE user_id = ? AND DATE(created_at) = CURDATE()
         ORDER BY created_at ASC`;
    const historyParams = lastClear ? [userId, lastClear] : [userId];
    const [history] = await pool.query(historyQuery, historyParams);

    // Build messages array for Groq (OpenAI-compatible format)
    const systemPrompt = await loadSystemPrompt();
    const messages = [
      { role: 'system', content: systemPrompt }
    ];
    for (const row of history) {
      messages.push({
        role: row.role === 'user' ? 'user' : 'assistant',
        content: row.message
      });
    }
    messages.push({ role: 'user', content: message });

    // Single API call to Groq
    const result = await groq.chat.completions.create({
      model: MODEL,
      messages,
      max_tokens: 1024
    });

    const reply = result.choices[0]?.message?.content || '';
    const tokensUsed = result.usage?.total_tokens || 0;

    // Save user message
    await pool.query(
      `INSERT INTO chatbot_messages (user_id, role, message, tokens_used, model, ip_address, user_agent)
       VALUES (?, 'user', ?, 0, ?, ?, ?)`,
      [userId, message, MODEL, ip, userAgent]
    );

    // Save assistant reply
    await pool.query(
      `INSERT INTO chatbot_messages (user_id, role, message, tokens_used, model, ip_address, user_agent)
       VALUES (?, 'assistant', ?, ?, ?, ?, ?)`,
      [userId, reply, tokensUsed, MODEL, ip, userAgent]
    );

    res.json({ reply });
  } catch (error) {
    console.error('Error en chatbot:', error);
    res.status(500).json({ message: 'Error del servidor al procesar el mensaje' });
  }
};

exports.getHistory = async (req, res) => {
  const userId = req.user.userId;

  try {
    const lastClear = await getLastClear(userId);
    const query = lastClear
      ? `SELECT role, message, created_at FROM chatbot_messages
         WHERE user_id = ? AND DATE(created_at) = CURDATE() AND created_at > ?
         ORDER BY created_at ASC`
      : `SELECT role, message, created_at FROM chatbot_messages
         WHERE user_id = ? AND DATE(created_at) = CURDATE()
         ORDER BY created_at ASC`;
    const params = lastClear ? [userId, lastClear] : [userId];
    const [messages] = await pool.query(query, params);

    res.json({ messages });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

exports.clearChat = async (req, res) => {
  const userId = req.user.userId;

  try {
    await pool.query(
      `INSERT INTO chatbot_clears (user_id) VALUES (?)`,
      [userId]
    );
    res.json({ message: 'Chat borrado' });
  } catch (error) {
    console.error('Error al borrar chat:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};
