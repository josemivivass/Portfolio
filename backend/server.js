const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./src/routes/auth.routes');
const trackingRoutes = require('./src/routes/tracking.routes');
const projectRoutes = require('./src/routes/project.routes');
const contactRoutes = require('./src/routes/contact.routes');
const experienceRoutes = require('./src/routes/experience.routes');
const adminRoutes = require('./src/routes/admin.routes');
const chatbotRoutes = require('./src/routes/chatbot.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', authRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/experience', experienceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chatbot', chatbotRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});