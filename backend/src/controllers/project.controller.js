const pool = require('../config/db');

exports.getAllProjects = async (req, res) => {
  try {
    const [projects] = await pool.query('SELECT * FROM projects ORDER BY project_date DESC');
    res.status(200).json(projects);
  } catch (error) {
    console.error('Error al obtener proyectos:', error);
    res.status(500).json({ message: 'Error en el servidor al obtener proyectos' });
  }
};