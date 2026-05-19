const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./src/config/db');
const { ensureProjectsDir } = require('./src/utils/project-images');

ensureProjectsDir();

const authRoutes = require('./src/routes/auth.routes');
const trackingRoutes = require('./src/routes/tracking.routes');
const projectRoutes = require('./src/routes/project.routes');
const contactRoutes = require('./src/routes/contact.routes');
const experienceRoutes = require('./src/routes/experience.routes');
const educationRoutes = require('./src/routes/education.routes');
const skillsRoutes = require('./src/routes/skills.routes');
const adminRoutes = require('./src/routes/admin.routes');
const chatbotRoutes = require('./src/routes/chatbot.routes');
const profileRoutes = require('./src/routes/profile.routes');

const app = express();

app.set('trust proxy', 1);

const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const corsExposed = ['Content-Disposition'];
if (corsOrigins.length === 0) {
  app.use(cors({ exposedHeaders: corsExposed }));
} else {
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (corsOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} no permitido por CORS`));
    },
    exposedHeaders: corsExposed
  }));
}

app.use(express.json({ limit: '7mb' }));

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'ok' });
  } catch (err) {
    res.status(503).json({ status: 'degraded', db: 'down', error: err.code || 'ERR' });
  }
});

app.use('/api', authRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/experience', experienceRoutes);
app.use('/api/education', educationRoutes);
app.use('/api/skills', skillsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/profile', profileRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});