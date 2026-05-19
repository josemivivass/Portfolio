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

// `${slug}_Foto<N>.<ext>` con N libre en el directorio.
async function nextPhotoName(dirPath, slug, ext) {
  let entries = [];
  try {
    entries = await fs.promises.readdir(dirPath);
  } catch { /* dir aún no existe */ }
  const re = new RegExp(`^${escapeRegex(slug)}_Foto(\\d+)\\.[a-z0-9]+$`, 'i');
  let maxN = 0;
  for (const e of entries) {
    const m = re.exec(e);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxN) maxN = n;
    }
  }
  let candidate;
  do {
    maxN += 1;
    candidate = `${slug}_Foto${maxN}.${ext}`;
  } while (entries.includes(candidate));
  return candidate;
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

// Sincroniza FS y BD para un proyecto:
async function normalizeProjectImages(connection, projectId, projectTitle) {
  const dir = path.join(PROJECTS_DIR, String(projectId));
  let fsEntries = [];
  try {
    fsEntries = await fs.promises.readdir(dir);
  } catch {
    return; // carpeta inexistente
  }
  const fsImgs = fsEntries.filter((f) => IMG_EXT_RE.test(f));

  const [dbRows] = await connection.query(
    'SELECT id, image_url, position FROM project_images WHERE project_id = ? ORDER BY position ASC, id ASC',
    [projectId]
  );

  // Orden final: 1) BD en su orden (con archivo presente), 2) huérfanos del FS alfabéticos.
  const dbFilenames = new Set();
  const ordered = [];
  for (const row of dbRows) {
    const fname = path.basename(row.image_url);
    dbFilenames.add(fname);
    if (fsImgs.includes(fname)) {
      ordered.push({ dbId: row.id, currentFilename: fname });
    }
  }
  const orphanFiles = fsImgs.filter((f) => !dbFilenames.has(f)).sort();
  for (const f of orphanFiles) ordered.push({ dbId: null, currentFilename: f });

  // Limpia entradas fantasma de BD (estaban en BD pero no en disco).
  const validIds = new Set(ordered.filter((it) => it.dbId).map((it) => it.dbId));
  const ghostIds = dbRows.filter((r) => !validIds.has(r.id)).map((r) => r.id);
  if (ghostIds.length > 0) {
    await connection.query('DELETE FROM project_images WHERE id IN (?)', [ghostIds]);
  }

  if (ordered.length === 0) return;

  const slug = slugifyProjectTitle(projectTitle);
  for (let i = 0; i < ordered.length; i++) {
    const it = ordered[i];
    const ext = (path.extname(it.currentFilename).slice(1) || 'png').toLowerCase();
    it.targetName = `${slug}_Foto${i + 1}.${ext}`;
  }

  // Fase 1: renombrar a temporal los que cambian (evita colisiones por swap).
  const needsRename = ordered.filter((it) => it.currentFilename !== it.targetName);
  for (const it of needsRename) {
    const tempName = `_norm_${crypto.randomBytes(6).toString('hex')}_${it.targetName}`;
    try {
      await fs.promises.rename(path.join(dir, it.currentFilename), path.join(dir, tempName));
      it.tempName = tempName;
    } catch (e) {
      console.warn('[normalize] rename a temporal falló:', e.message);
    }
  }
  // Fase 2: temporal → final.
  for (const it of needsRename) {
    if (!it.tempName) continue;
    try {
      await fs.promises.rename(path.join(dir, it.tempName), path.join(dir, it.targetName));
    } catch (e) {
      console.warn('[normalize] rename a final falló:', e.message);
    }
  }

  // Sync BD con el orden y URL finales.
  for (let i = 0; i < ordered.length; i++) {
    const it = ordered[i];
    const newUrl = `${PROJECT_IMG_URL_PREFIX}${projectId}/${it.targetName}`;
    if (it.dbId) {
      await connection.query(
        'UPDATE project_images SET image_url = ?, position = ? WHERE id = ?',
        [newUrl, i, it.dbId]
      );
    } else {
      await connection.query(
        'INSERT INTO project_images (project_id, image_url, position) VALUES (?, ?, ?)',
        [projectId, newUrl, i]
      );
    }
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
