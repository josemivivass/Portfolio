const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PROJECTS_DIR = path.join(__dirname, '..', 'data', 'projects');
const PROJECT_IMG_URL_PREFIX = '/api/projects/images/';
const PENDING_FOLDER = 'pending';
const LEGACY_PENDING_FOLDER = '_pending';
const IMG_EXT_RE = /\.(jpe?g|png|webp|gif)$/i;

function ensureProjectsDir() {
  if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  const legacy = path.join(PROJECTS_DIR, LEGACY_PENDING_FOLDER);
  const target = path.join(PROJECTS_DIR, PENDING_FOLDER);
  if (!fs.existsSync(legacy)) return;
  try {
    if (!fs.existsSync(target)) {
      fs.renameSync(legacy, target);
    } else {
      for (const f of fs.readdirSync(legacy)) {
        const src = path.join(legacy, f);
        const dst = path.join(target, f);
        if (!fs.existsSync(dst)) fs.renameSync(src, dst);
      }
      try { fs.rmdirSync(legacy); } catch { }
    }
  } catch (e) {
    console.warn('[project-images] migración _pending → pending falló:', e.message);
  }
}

function resolveLocalImagePath(url) {
  if (typeof url !== 'string' || !url.startsWith(PROJECT_IMG_URL_PREFIX)) return null;
  const tail = url.slice(PROJECT_IMG_URL_PREFIX.length);
  const parts = tail.split('/').filter(Boolean);
  if (parts.length === 1) {
    const safe = path.basename(parts[0]);
    if (!safe) return null;
    return path.join(PROJECTS_DIR, safe);
  }
  if (parts.length === 2) {
    const folder = path.basename(parts[0]);
    const filename = path.basename(parts[1]);
    if (!folder || !filename) return null;
    return path.join(PROJECTS_DIR, folder, filename);
  }
  return null;
}

function deleteLocalImageFile(url) {
  const filePath = resolveLocalImagePath(url);
  if (!filePath) return;
  fs.promises.unlink(filePath).catch(() => { /* ENOENT ok */ });
}

// "Dashboard Analítica" → "DashboardAnalitica"
function slugifyProjectTitle(title) {
  const raw = typeof title === 'string' ? title.trim() : '';
  if (!raw) return 'Proyecto';
  const noAccents = raw.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const words = noAccents.replace(/[^a-zA-Z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'Proyecto';
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function nextPhotoName(dirPath, slug, ext) {
  let entries = [];
  try {
    entries = await fs.promises.readdir(dirPath);
  } catch { /* dir aún no existe */ }
  const re = new RegExp(`^${escapeRegex(slug)}_Foto(\\d+)(?:_[a-z0-9]+)?\\.[a-z0-9]+$`, 'i');
  let maxN = 0;
  for (const e of entries) {
    const m = re.exec(e);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxN) maxN = n;
    }
  }
  const uniq = Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
  return `${slug}_Foto${maxN + 1}_${uniq}.${ext}`;
}

async function promotePendingImages(images, projectId, projectTitle) {
  if (!Array.isArray(images) || images.length === 0) return;
  const pendingPrefix = `${PROJECT_IMG_URL_PREFIX}${PENDING_FOLDER}/`;
  const legacyPrefix = `${PROJECT_IMG_URL_PREFIX}${LEGACY_PENDING_FOLDER}/`;
  const targetDir = path.join(PROJECTS_DIR, String(projectId));
  const slug = slugifyProjectTitle(projectTitle);
  let dirReady = false;
  for (const img of images) {
    if (!img || typeof img.url !== 'string') continue;
    let oldFilename = null;
    let sourceDir = null;
    if (img.url.startsWith(pendingPrefix)) {
      oldFilename = path.basename(img.url.slice(pendingPrefix.length));
      sourceDir = path.join(PROJECTS_DIR, PENDING_FOLDER);
    } else if (img.url.startsWith(legacyPrefix)) {
      oldFilename = path.basename(img.url.slice(legacyPrefix.length));
      sourceDir = path.join(PROJECTS_DIR, LEGACY_PENDING_FOLDER);
    }
    if (!oldFilename) continue;
    if (!dirReady) {
      await fs.promises.mkdir(targetDir, { recursive: true });
      dirReady = true;
    }
    const ext = (path.extname(oldFilename).slice(1) || 'png').toLowerCase();
    const newFilename = await nextPhotoName(targetDir, slug, ext);
    const oldPath = path.join(sourceDir, oldFilename);
    const newPath = path.join(targetDir, newFilename);
    try {
      await fs.promises.rename(oldPath, newPath);
      img.url = `${PROJECT_IMG_URL_PREFIX}${projectId}/${newFilename}`;
    } catch (e) {
      console.warn('[project-images] no se pudo mover imagen pending', oldPath, e?.message);
    }
  }
}

// Sincroniza BD con FS para un proyecto sin renombrar archivos
async function normalizeProjectImages(connection, projectId, /* projectTitle */ _unused) {
  const dir = path.join(PROJECTS_DIR, String(projectId));
  let fsEntries = [];
  try {
    fsEntries = await fs.promises.readdir(dir);
  } catch {
    return; // carpeta inexistente
  }
  const fsImgs = fsEntries.filter((f) => IMG_EXT_RE.test(f));
  const fsSet = new Set(fsImgs);

  const [dbRows] = await connection.query(
    'SELECT id, image_url, position FROM project_images WHERE project_id = ? ORDER BY position ASC, id ASC',
    [projectId]
  );

  // 1) Borra rows fantasma (BD sin archivo en disco).
  const validRows = [];
  const ghostIds = [];
  for (const row of dbRows) {
    if (fsSet.has(path.basename(row.image_url))) {
      validRows.push(row);
    } else {
      ghostIds.push(row.id);
    }
  }
  if (ghostIds.length > 0) {
    await connection.query('DELETE FROM project_images WHERE id IN (?)', [ghostIds]);
  }

  // 2) Reindexa posiciones contiguas (0..N-1) preservando el orden previo.
  for (let i = 0; i < validRows.length; i++) {
    if (validRows[i].position !== i) {
      await connection.query(
        'UPDATE project_images SET position = ? WHERE id = ?',
        [i, validRows[i].id]
      );
    }
  }

  // 3) Inserta orphans del FS (archivos sin row en BD) al final del orden.
  const dbFilenames = new Set(validRows.map((r) => path.basename(r.image_url)));
  const orphans = fsImgs.filter((f) => !dbFilenames.has(f)).sort();
  for (let i = 0; i < orphans.length; i++) {
    const url = `${PROJECT_IMG_URL_PREFIX}${projectId}/${orphans[i]}`;
    await connection.query(
      'INSERT INTO project_images (project_id, image_url, position) VALUES (?, ?, ?)',
      [projectId, url, validRows.length + i]
    );
  }
}

// Detecta si FS y BD del proyecto están desincronizados (orphans o ghosts).
async function isProjectImagesOutOfSync(connection, projectId) {
  const dir = path.join(PROJECTS_DIR, String(projectId));
  let entries = [];
  try { entries = await fs.promises.readdir(dir); } catch { return false; }
  const fsImgs = new Set(entries.filter((f) => IMG_EXT_RE.test(f)));
  const [rows] = await connection.query(
    'SELECT image_url FROM project_images WHERE project_id = ?',
    [projectId]
  );
  const dbFiles = new Set(rows.map((r) => path.basename(r.image_url)));
  for (const f of fsImgs) if (!dbFiles.has(f)) return true;
  for (const f of dbFiles) if (!fsImgs.has(f)) return true;
  return false;
}

module.exports = {
  PROJECTS_DIR,
  PROJECT_IMG_URL_PREFIX,
  PENDING_FOLDER,
  IMG_EXT_RE,
  ensureProjectsDir,
  resolveLocalImagePath,
  deleteLocalImageFile,
  slugifyProjectTitle,
  nextPhotoName,
  promotePendingImages,
  normalizeProjectImages,
  isProjectImagesOutOfSync
};
