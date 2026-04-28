const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const contactController = require('../controllers/contact.controller');

// Máx 3 mensajes por hora por IP
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Has enviado demasiados mensajes. Inténtalo de nuevo dentro de una hora.' }
});

router.post('/', contactLimiter, contactController.sendMessage);

module.exports = router;