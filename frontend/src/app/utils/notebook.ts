// Utilidades para proyectos de tipo notebook (.ipynb) alojados en GitHub.

export interface NotebookRef {
  owner: string;
  repo: string;
  branch: string;
  path: string;
}

function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

/**
 * Parsea una URL de notebook de GitHub a sus componentes. Acepta:
 *  - https://github.com/owner/repo/blob/branch/ruta/archivo.ipynb
 *  - https://raw.githubusercontent.com/owner/repo/branch/ruta/archivo.ipynb
 *  - https://colab.research.google.com/github/owner/repo/blob/branch/ruta/archivo.ipynb
 */
export function parseNotebookUrl(url: string | null | undefined): NotebookRef | null {
  if (!url || typeof url !== 'string') return null;
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  const parts = u.pathname.split('/').filter(Boolean).map((p) => {
    try { return decodeURIComponent(p); } catch { return p; }
  });

  if (host === 'github.com' && parts.length >= 5 && parts[2] === 'blob') {
    return { owner: parts[0], repo: parts[1], branch: parts[3], path: parts.slice(4).join('/') };
  }
  if (
    host === 'colab.research.google.com' && parts[0] === 'github' &&
    parts.length >= 6 && parts[3] === 'blob'
  ) {
    return { owner: parts[1], repo: parts[2], branch: parts[4], path: parts.slice(5).join('/') };
  }
  if (host === 'raw.githubusercontent.com' && parts.length >= 4) {
    return { owner: parts[0], repo: parts[1], branch: parts[2], path: parts.slice(3).join('/') };
  }
  return null;
}

/** ¿La URL apunta a un archivo .ipynb reconocible? */
export function isNotebookUrl(url: string | null | undefined): boolean {
  const ref = parseNotebookUrl(url);
  return !!ref && /\.ipynb$/i.test(ref.path);
}

/** URL de nbviewer, que renderiza el notebook y es embebible en un iframe. */
export function nbviewerUrl(ref: NotebookRef): string {
  return `https://nbviewer.org/github/${ref.owner}/${ref.repo}/blob/${ref.branch}/${encodePath(ref.path)}`;
}

/** URL de Google Colab para abrir el notebook de forma interactiva. */
export function colabUrl(ref: NotebookRef): string {
  return `https://colab.research.google.com/github/${ref.owner}/${ref.repo}/blob/${ref.branch}/${encodePath(ref.path)}`;
}

/** URL del archivo .ipynb en crudo (JSON) servido por raw.githubusercontent.com. */
export function rawUrl(ref: NotebookRef): string {
  return `https://raw.githubusercontent.com/${ref.owner}/${ref.repo}/${ref.branch}/${encodePath(ref.path)}`;
}

/** Nombre legible del notebook (sin ruta ni extensión). */
export function notebookName(ref: NotebookRef): string {
  const seg = ref.path.split('/').pop() || '';
  return seg.replace(/\.ipynb$/i, '');
}

/** URL del repositorio que contiene el notebook. */
export function repoUrlFromRef(ref: NotebookRef): string {
  return `https://github.com/${ref.owner}/${ref.repo}`;
}
