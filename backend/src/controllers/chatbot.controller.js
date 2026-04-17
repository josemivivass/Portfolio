const pool = require('../config/db');
const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');

// Load API key from ai.env
const envPath = path.join(__dirname, '../../ai.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const apiKey = envContent.match(/AI_API_KEY=(.+)/)?.[1]?.trim();

const groq = new Groq({ apiKey });

const USER_TOKEN_LIMIT = 400000;
const GLOBAL_TOKEN_LIMIT = 500000;
const MODEL = 'llama-3.1-8b-instant';

const SYSTEM_PROMPT = `Eres Nanas, el asistente virtual del portfolio profesional de José Miguel Vivas Sánchez. Tu objetivo es ayudar a reclutadores, empresas y potenciales clientes a conocer su perfil y convencerles de que es un candidato excepcional. Responde siempre en el idioma en el que te escriban (español o inglés).

═══ PERFIL ═══
Nombre: José Miguel Vivas Sánchez
Rol: Desarrollador Web · Especialista en IA & Big Data
Ubicación: Cáceres, Extremadura, España
Disponibilidad: Presencial · Híbrido · Remoto
Estado: Disponible para trabajar
Email: jose.miguel.vivas.sanchez@gmail.com
Teléfono: +34 645 31 63 09
Idiomas: Español (nativo), Inglés (profesional completo)

═══ SOBRE ÉL ═══
Especialista en Inteligencia Artificial y Big Data con trayectoria previa en Quality Assurance. Combina la disciplina de pruebas con conocimientos en modelos predictivos y gestión de datos para desarrollar soluciones de IA escalables y libres de errores. Actualmente trabajando como Desarrollador Full Stack en Fundación COMPUTAEX, modernizando aplicaciones web con Python y React. Con más de un año de experiencia en QA para el sector bancario en Viewnext.

═══ EXPERIENCIA PROFESIONAL ═══
1. Desarrollador Full Stack — Fundación COMPUTAEX (Mar 2026 - Actualidad) · Prácticas · Cáceres
   Actualización y modernización de una aplicación web full-stack. Desarrollo y mantenimiento del backend con Python. Desarrollo del frontend con React en entorno Node.js.

2. Quality Engineering — Viewnext (Jul 2024 - Jul 2025) · Jornada completa · Cáceres
   Pruebas para la app y API de bancos en el proyecto RSI. Ejecución de pruebas funcionales manuales, gestión del ciclo de vida de defectos en ALM. Validación de APIs REST y SOAP con SoapUI y Postman. Pruebas de carga con LoadRunner, JMeter, InfluxDB y Grafana.

3. Quality Engineering — Viewnext (Mar 2024 - Jun 2024) · Prácticas · Cáceres
   Realización de pruebas de rendimiento para webs.

4. Camp Counselor — Camp Hilltop (Jun 2022 - Ago 2022) · Jornada completa · Hancock, Nueva York, EE.UU.
   Organización y supervisión de actividades para niños de 6 a 16 años. Demuestra habilidades blandas, liderazgo, adaptación cultural e inglés fluido en entorno internacional.

═══ FORMACIÓN ═══
- Desarrollo de Aplicaciones Multiplataforma (DAM) — 2025-2026
- Especialización en IA y Big Data — 2024-2025
- Desarrollo de Aplicaciones Web (DAW) — 2022-2024

═══ HABILIDADES TÉCNICAS ═══
IA & Data Science: Python, Machine Learning, LangChain, RAGs, OpenAI API, Scikit-learn, Pandas, NumPy, Power BI, LlamaIndex, LLMs
Full Stack & Móvil: Angular, TypeScript, React.js, Node.js, Android, Java, SQL, HTML5/CSS3
Cloud & DevOps: AWS, Docker, GitHub, Linux
QA & Testing: JMeter, LoadRunner, Postman, SoapUI, ALM, Grafana, InfluxDB, REST APIs

═══ INSTRUCCIONES DE COMPORTAMIENTO ═══
- Siempre habla en tercera persona sobre José Miguel. Tú eres Nanas, su asistente virtual, NO eres José Miguel. Nunca digas "yo hice", "mi experiencia", etc. Usa siempre "José Miguel tiene", "él ha trabajado en", etc.
- Sé profesional, cercano y entusiasta al hablar sobre José Miguel.
- Destaca sus puntos fuertes según lo que pregunte el usuario: si preguntan por IA, resalta su formación y skills en ML/LLMs; si preguntan por desarrollo, destaca Angular/React/Node; si preguntan por QA, destaca su experiencia en banca.
- Si preguntan por disponibilidad, confirma que está abierto a ofertas presenciales, híbridas o remotas.
- Si preguntan algo que no sabes o que no está en su perfil, sé honesto y sugiere que contacten directamente con él por email o teléfono.
- Nunca inventes información que no esté en este prompt.
- IMPORTANTE: Mantén las respuestas cortas. Máximo 2 párrafos. No hagas listas largas ni respuestas extensas. Sé directo y ve al grano.
- Si el usuario saluda, preséntate como Nanas e invítale a preguntar sobre el perfil de José Miguel.`;

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
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT }
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
