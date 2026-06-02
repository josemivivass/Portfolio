const pool = require('../config/db');
const { geoLookup } = require('../utils/geo');

exports.logEntry = async (req, res) => {
  const { visitor_uuid, user_agent, is_logged_in } = req.body;
  const ip_address = req.ip || req.connection.remoteAddress;
  const geo = geoLookup(ip_address);

  try {
    await pool.query(
      `INSERT INTO visitor_logs
        (visitor_uuid, ip_address, country_code, country_name, region, city, latitude, longitude, user_agent, is_logged_in)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        visitor_uuid,
        ip_address,
        geo?.country_code ?? null,
        geo?.country_name ?? null,
        geo?.region ?? null,
        geo?.city ?? null,
        geo?.latitude ?? null,
        geo?.longitude ?? null,
        user_agent,
        is_logged_in
      ]
    );
    res.status(200).json({ message: 'Entrada registrada exitosamente' });
  } catch (error) {
    console.error('Error al registrar entrada:', error);
    res.status(500).json({ message: 'Error en el servidor al registrar entrada' });
  }
};