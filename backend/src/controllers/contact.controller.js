const pool = require('../config/db');
const { sendContactNotification } = require('../services/email.service');

exports.sendMessage = async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: 'Todos los campos son requeridos.' });
  }

  try {
    await pool.query(
      'INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)',
      [name, email, message]
    );

    // Enviamos el correo de notificación sin esperar a que termine (fire-and-forget)
    sendContactNotification({ name, email, message });

    res.status(201).json({ message: 'Mensaje guardado correctamente.' });
  } catch (error) {
    console.error('Error al guardar el mensaje de contacto:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};