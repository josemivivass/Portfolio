const pool = require('../config/db');
const { sendContactNotification } = require('../services/email.service');
const { verifyRecaptcha } = require('../services/recaptcha.service');

exports.sendMessage = async (req, res) => {
  const { name, email, message, recaptchaToken } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: 'Todos los campos son requeridos.' });
  }

  const isHuman = await verifyRecaptcha(recaptchaToken, req.ip);
  if (!isHuman) {
    return res.status(400).json({ message: 'Verificación de captcha fallida. Recarga e inténtalo de nuevo.' });
  }

  try {
    await pool.query(
      'INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)',
      [name, email, message]
    );

    sendContactNotification({ name, email, message });

    res.status(201).json({ message: 'Mensaje guardado correctamente.' });
  } catch (error) {
    console.error('Error al guardar el mensaje de contacto:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};
