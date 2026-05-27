const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const chatbot = require('../controllers/chatbot.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// Límite anti-ráfaga del chatbot: frena scripts y floods sin molestar a un
// usuario real permite hasta 15 mensajes por minuto.
const chatBurstLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Estás enviando mensajes demasiado rápido. Espera unos segundos e inténtalo de nuevo.' }
});

router.post('/anonymous', chatBurstLimiter, chatbot.sendAnonymousMessage);
router.post('/', chatBurstLimiter, verifyToken, chatbot.sendMessage);
router.get('/history', verifyToken, chatbot.getHistory);
router.post('/clear', verifyToken, chatbot.clearChat);

module.exports = router;
