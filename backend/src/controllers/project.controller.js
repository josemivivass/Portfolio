const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { PROJECTS_DIR } = require('../utils/project-images');

const EXT_TO_MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif'
};

async function attachImages(projects) {
  if (!Array.isArray(projects) || projects.length === 0) return projects;

  const ids = projects.map((p) => p.id);
  const [images] = await pool.query(
    `SELECT id, project_id, image_url, position
       FROM project_images
      WHERE project_id IN (?)
      ORDER BY project_id ASC, position ASC, id ASC`,
    [ids]
  );
  const byProject = new Map();
  for (const img of images) {
    if (!byProject.has(img.project_id)) byProject.set(img.project_id, []);
    byProject.get(img.project_id).push({
      id: img.id,
      url: img.image_url,
      position: img.position
    });
  }
  return projects.map((p) => ({ ...p, images: byProject.get(p.id) || [] }));
}

exports.getAllProjects = async (req, res) => {
  try {
    const [projects] = await pool.query('SELECT * FROM projects ORDER BY project_date DESC');
    const enriched = await attachImages(projects);
    res.status(200).json(enriched);
  } catch (error) {
    console.error('Error al obtener proyectos:', error);
    res.status(500).json({ message: 'Error en el servidor al obtener proyectos' });
  }
};

exports.getFeaturedProjects = async (req, res) => {
  try {
    const [projects] = await pool.query('SELECT * FROM projects WHERE is_featured = TRUE ORDER BY project_date DESC');
    const enriched = await attachImages(projects);
    res.status(200).json(enriched);
  } catch (error) {
    console.error('Error al obtener proyectos destacados:', error);
    res.status(500).json({ message: 'Error en el servidor al obtener proyectos destacados' });
  }
};

exports._attachImages = attachImages;

exports.getProjectImage = (req, res) => {
  const rawFolder = req.params.folder;
  const rawFile = req.params.filename || '';
  const safeFile = path.basename(rawFile);
  if (!safeFile || safeFile !== rawFile) {
    return res.status(400).json({ message: 'Nombre de archivo inválido' });
  }

  let filePath;
  if (rawFolder !== undefined) {
    const safeFolder = path.basename(rawFolder);
    if (!safeFolder || safeFolder !== rawFolder) {
      return res.status(400).json({ message: 'Ruta inválida' });
    }
    filePath = path.join(PROJECTS_DIR, safeFolder, safeFile);
  } else {
    filePath = path.join(PROJECTS_DIR, safeFile);
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'Imagen no encontrada' });
  }
  const ext = path.extname(safeFile).toLowerCase();
  const mime = EXT_TO_MIME[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', mime);
  res.setHeader('Cache-Control', 'public, max-age=86400, must-revalidate');
  fs.createReadStream(filePath).pipe(res);
};