const pool = require('../config/db');

exports.getAllEducation = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM education ORDER BY start_date DESC');
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error al obtener educación:', error);
    res.status(500).json({ message: 'Error en el servidor al obtener educación' });
  }
};

exports.createEducation = async (req, res) => {
  try {
    const { start_date, end_date, title, title_en, location } = req.body;
    const [result] = await pool.query(
      'INSERT INTO education (start_date, end_date, title, title_en, location) VALUES (?, ?, ?, ?, ?)',
      [start_date, end_date || null, title, title_en, location]
    );
    res.status(201).json({ id: result.insertId, message: 'Educación creada con éxito' });
  } catch (error) {
    console.error('Error al crear educación:', error);
    res.status(500).json({ message: 'Error al crear educación' });
  }
};

exports.updateEducation = async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date, title, title_en, location } = req.body;
    await pool.query(
      'UPDATE education SET start_date = ?, end_date = ?, title = ?, title_en = ?, location = ? WHERE id = ?',
      [start_date, end_date || null, title, title_en, location, id]
    );
    res.status(200).json({ message: 'Educación actualizada con éxito' });
  } catch (error) {
    console.error('Error al actualizar educación:', error);
    res.status(500).json({ message: 'Error al actualizar educación' });
  }
};

exports.deleteEducation = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM education WHERE id = ?', [id]);
    res.status(200).json({ message: 'Educación eliminada con éxito' });
  } catch (error) {
    console.error('Error al eliminar educación:', error);
    res.status(500).json({ message: 'Error al eliminar educación' });
  }
};