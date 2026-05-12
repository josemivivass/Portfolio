const pool = require('../config/db');

exports.getAllSkills = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM skills');
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error al obtener habilidades:', error);
    res.status(500).json({ message: 'Error al obtener habilidades' });
  }
};

exports.createSkill = async (req, res) => {
  try {
    const { tipo, tags } = req.body;
    const [result] = await pool.query(
      'INSERT INTO skills (tipo, tags) VALUES (?, ?)',
      [tipo, JSON.stringify(tags)]
    );
    res.status(201).json({ id: result.insertId, message: 'Habilidad creada con éxito' });
  } catch (error) {
    console.error('Error al crear habilidad:', error);
    res.status(500).json({ message: 'Error al crear habilidad' });
  }
};

exports.updateSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, tags } = req.body;
    await pool.query(
      'UPDATE skills SET tipo = ?, tags = ? WHERE id = ?',
      [tipo, JSON.stringify(tags), id]
    );
    res.status(200).json({ message: 'Habilidad actualizada con éxito' });
  } catch (error) {
    console.error('Error al actualizar habilidad:', error);
    res.status(500).json({ message: 'Error al actualizar habilidad' });
  }
};

exports.deleteSkill = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM skills WHERE id = ?', [id]);
    res.status(200).json({ message: 'Habilidad eliminada con éxito' });
  } catch (error) {
    console.error('Error al eliminar habilidad:', error);
    res.status(500).json({ message: 'Error al eliminar habilidad' });
  }
};