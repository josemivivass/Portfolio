const pool = require('../config/db');

exports.saveMessage = async (req, res) => {
  const { name, email, message } = req.body;

  try {
    await pool.query(
      'INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)',
      [name, email, message]
    );
    res.status(201).json({ message: 'Mensaje guardado correctamente' });
  } catch (error) {
    console.error('Error al guardar mensaje:', error);
    res.status(500).json({ message: 'Error en el servidor al guardar el mensaje' });
  }
};