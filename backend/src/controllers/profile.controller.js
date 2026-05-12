const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PHOTO_FILE = path.join(DATA_DIR, 'perfil.jpg');
const DEFAULT_PHOTO = path.join(
  __dirname, '..', '..', '..', 'frontend', 'public', 'images', 'perfil.jpg'
);

const EDITABLE_KEYS = ['hero.tagline', 'about', 'footer.role'];

const KEY_TO_COLS = {
  'hero.tagline': { es: 'hero_tagline_es', en: 'hero_tagline_en' },
  'about':        { es: 'about_es',        en: 'about_en' },
  'footer.role':  { es: 'footer_role_es',  en: 'footer_role_en' }
};

const TEXT_DEFAULTS = {
  'hero.tagline': {
    es: 'DESARROLLADOR FULL-STACK ESPECIALIZADO EN IA Y BIGDATA',
    en: 'FULL-STACK DEVELOPER SPECIALIZED IN AI AND BIG DATA'
  },
  'about': {
    es: 'Especialista en <strong>Inteligencia Artificial y Big Data</strong> con trayectoria previa en <strong>Quality Assurance</strong>. Combino la disciplina de pruebas con conocimientos en modelos predictivos y gestión de datos para desarrollar soluciones de IA escalables y libres de errores. Actualmente trabajando como <strong>Desarrollador Full Stack</strong> en Fundación COMPUTAEX, modernizando aplicaciones web con Python y React. Con más de un año de experiencia en QA para el sector bancario en Viewnext.',
    en: '<strong>Artificial Intelligence and Big Data</strong> specialist with a previous career in <strong>Quality Assurance</strong>. I combine testing discipline with predictive modeling and data management skills to develop scalable, error-free AI solutions. Currently working as a <strong>Full Stack Developer</strong> at Fundación COMPUTAEX, modernizing web applications with Python and React. With over a year of QA experience in the banking sector at Viewnext.'
  },
  'footer.role': {
    es: 'Desarrollador Web · IA & Big Data',
    en: 'Web Developer · AI & Big Data'
  }
};

const DEFAULT_CHATBOT_PROMPT = `Eres Nanas, el asistente virtual del portfolio profesional de José Miguel Vivas Sánchez. Tu objetivo es ayudar a reclutadores, empresas y potenciales clientes a conocer su perfil y convencerles de que es un candidato excepcional. Responde siempre en el idioma en el que te escriban (español o inglés).

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

const DEFAULT_CHATBOT_MODEL = 'llama-3.1-8b-instant';

const AVAILABLE_CHATBOT_MODELS = [
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b'
];

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function fetchTexts() {
  const [rows] = await pool.query(
    'SELECT * FROM profile_texts WHERE id = 1 LIMIT 1'
  );
  const row = rows[0] || {};
  const es = {};
  const en = {};
  for (const k of Object.keys(TEXT_DEFAULTS)) {
    const cols = KEY_TO_COLS[k];
    es[k] = row[cols.es] ?? TEXT_DEFAULTS[k].es;
    en[k] = row[cols.en] ?? TEXT_DEFAULTS[k].en;
  }
  return { es, en };
}

async function fetchMeta(key, fallback) {
  const [rows] = await pool.query(
    'SELECT meta_value FROM profile_meta WHERE meta_key = ? LIMIT 1',
    [key]
  );
  if (rows.length === 0 || rows[0].meta_value == null) return fallback;
  return rows[0].meta_value;
}

async function upsertText(key, es, en) {
  const cols = KEY_TO_COLS[key];
  if (!cols) return;
  await pool.query(
    `INSERT INTO profile_texts (id, ${cols.es}, ${cols.en})
     VALUES (1, ?, ?)
     ON DUPLICATE KEY UPDATE ${cols.es} = VALUES(${cols.es}), ${cols.en} = VALUES(${cols.en})`,
    [es, en]
  );
}

async function upsertMeta(key, value) {
  await pool.query(
    `INSERT INTO profile_meta (meta_key, meta_value)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value)`,
    [key, String(value)]
  );
}

exports.loadSystemPrompt = async function () {
  try {
    const value = await fetchMeta('chatbot_prompt', null);
    return value && String(value).trim() ? String(value) : DEFAULT_CHATBOT_PROMPT;
  } catch (err) {
    console.error('[profile] loadSystemPrompt failed', err);
    return DEFAULT_CHATBOT_PROMPT;
  }
};

exports.loadChatbotModel = async function () {
  try {
    const value = await fetchMeta('chatbot_model', null);
    if (value && AVAILABLE_CHATBOT_MODELS.includes(String(value))) {
      return String(value);
    }
    return DEFAULT_CHATBOT_MODEL;
  } catch (err) {
    console.error('[profile] loadChatbotModel failed', err);
    return DEFAULT_CHATBOT_MODEL;
  }
};

exports.getTexts = async (req, res) => {
  try {
    const texts = await fetchTexts();
    const photoMeta = await fetchMeta('photo_updated_at', '0');
    res.status(200).json({
      es: texts.es,
      en: texts.en,
      photo_updated_at: Number(photoMeta) || 0,
      editable_keys: EDITABLE_KEYS
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al leer los textos' });
  }
};

exports.updateTexts = async (req, res) => {
  const { es = {}, en = {} } = req.body || {};
  try {
    const current = await fetchTexts();
    for (const k of EDITABLE_KEYS) {
      const nextEs = typeof es[k] === 'string' ? es[k] : current.es[k];
      const nextEn = typeof en[k] === 'string' ? en[k] : current.en[k];
      await upsertText(k, nextEs, nextEn);
    }
    const texts = await fetchTexts();
    const photoMeta = await fetchMeta('photo_updated_at', '0');
    res.status(200).json({
      es: texts.es,
      en: texts.en,
      photo_updated_at: Number(photoMeta) || 0,
      editable_keys: EDITABLE_KEYS
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al guardar los textos' });
  }
};

exports.getPhoto = (req, res) => {
  const file = fs.existsSync(PHOTO_FILE) ? PHOTO_FILE : DEFAULT_PHOTO;
  if (!fs.existsSync(file)) {
    return res.status(404).json({ message: 'Foto no encontrada' });
  }
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  fs.createReadStream(file).pipe(res);
};

exports.getChatbotPrompt = async (req, res) => {
  try {
    const prompt = await exports.loadSystemPrompt();
    res.status(200).json({ prompt, default_prompt: DEFAULT_CHATBOT_PROMPT });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al leer el prompt' });
  }
};

exports.updateChatbotPrompt = async (req, res) => {
  const { prompt } = req.body || {};
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ message: 'El prompt no puede estar vacío' });
  }
  if (prompt.length > 20000) {
    return res.status(413).json({ message: 'El prompt supera el límite de 20000 caracteres' });
  }
  try {
    await upsertMeta('chatbot_prompt', prompt);
    res.status(200).json({ prompt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al guardar el prompt' });
  }
};

exports.getChatbotModel = async (req, res) => {
  try {
    const model = await exports.loadChatbotModel();
    res.status(200).json({
      model,
      default_model: DEFAULT_CHATBOT_MODEL,
      available_models: AVAILABLE_CHATBOT_MODELS
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al leer el modelo' });
  }
};

exports.updateChatbotModel = async (req, res) => {
  const { model } = req.body || {};
  if (typeof model !== 'string' || !AVAILABLE_CHATBOT_MODELS.includes(model)) {
    return res.status(400).json({ message: 'Modelo no válido' });
  }
  try {
    await upsertMeta('chatbot_model', model);
    res.status(200).json({ model });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al guardar el modelo' });
  }
};

exports.uploadPhoto = async (req, res) => {
  const { dataUrl } = req.body || {};
  if (typeof dataUrl !== 'string') {
    return res.status(400).json({ message: 'Archivo requerido' });
  }
  const match = /^data:(image\/(?:jpe?g|png|webp));base64,(.+)$/.exec(dataUrl);
  if (!match) {
    return res.status(400).json({ message: 'Formato no soportado (usa JPG, PNG o WEBP)' });
  }
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 5 * 1024 * 1024) {
    return res.status(413).json({ message: 'La imagen supera el límite de 5MB' });
  }
  try {
    ensureDir();
    fs.writeFileSync(PHOTO_FILE, buffer);
    const ts = Date.now();
    await upsertMeta('photo_updated_at', ts);
    res.status(200).json({ photo_updated_at: ts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al guardar la foto' });
  }
};
