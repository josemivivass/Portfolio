const pool = require('../config/db');

exports.getAllExperience = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM experience ORDER BY start_date ASC');
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error al obtener experiencias:', error);
    res.status(500).json({ message: 'Error en el servidor al obtener experiencias' });
  }
};
