const pool = require('../config/db');

exports.logEntry = async (req, res) => {
  const { visitor_uuid, user_agent, is_logged_in } = req.body;
  const ip_address = req.ip || req.connection.remoteAddress;

  try {
    await pool.query(
      `INSERT INTO visitor_logs (visitor_uuid, ip_address, user_agent, is_logged_in) 
       VALUES (?, ?, ?, ?)`,
      [visitor_uuid, ip_address, user_agent, is_logged_in]
    );
    res.status(200).json({ message: 'Entrada registrada exitosamente' });
  } catch (error) {
    console.error('Error al registrar entrada:', error);
    res.status(500).json({ message: 'Error en el servidor al registrar entrada' });
  }
};