// Lógica pura para preparar los proyectos de la vitrina del home.

export type ProjectType = 'web' | 'android' | 'ai' | 'other';

// Quita los &nbsp; / U+00A0 y los style inline que mete Quill antes de pintar con [innerHTML].
export function cleanRichText(value: string | null | undefined): string {
  return (value || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/ /g, ' ')
    .replace(/\s*style\s*=\s*("[^"]*"|'[^']*')/gi, '');
}

// Normaliza el tipo de proyecto; cualquier valor desconocido cae en 'web'.
export function projectType(rawType: string | null | undefined): ProjectType {
  const t = (rawType || '').toLowerCase();
  return (t === 'android' || t === 'ai' || t === 'other' || t === 'web') ? t : 'web';
}

// Acorta una URL a host+ruta legible (máx. 38 chars) para el mockup de navegador.
export function shortUrl(url?: string | null): string {
  if (!url) return 'localhost';
  try {
    const u = new URL(url);
    const host = u.host.replace(/^www\./, '');
    const path = u.pathname.length > 1 ? u.pathname : '';
    const full = `${host}${path}`;
    return full.length > 38 ? full.slice(0, 35) + '…' : full;
  } catch {
    return url.length > 38 ? url.slice(0, 35) + '…' : url;
  }
}

// Rango de años de un conjunto de fechas: "2024", "2023-2026" o "" si no hay ninguna válida.
export function yearRange(dates: Array<string | Date | null | undefined>): string {
  const years = dates
    .map((d) => (d ? toYear(d) : NaN))
    .filter((y) => Number.isFinite(y));
  if (years.length === 0) return '';
  const min = Math.min(...years);
  const max = Math.max(...years);
  return min === max ? `${min}` : `${min}-${max}`;
}

function toYear(val: string | Date): number {
  const d = val instanceof Date ? val : new Date(String(val).substring(0, 10) + 'T00:00:00');
  return d.getFullYear();
}
