// Convierte el JSON de un notebook de Jupyter (.ipynb v4) en un modelo de celdas listo para pintar.
import { marked } from 'marked';
import hljs from 'highlight.js/lib/core';
import python from 'highlight.js/lib/languages/python';

hljs.registerLanguage('python', python);

/** Una salida concreta de una celda de código. */
export interface NbOutput {
  kind: 'image' | 'html' | 'text';
  src?: string;
  html?: string;
  text?: string;
  error?: boolean;
}

/** Una celda del notebook ya renderizada. */
export interface NbCell {
  type: 'markdown' | 'code';
  html?: string;
  source?: string;
  sourceHtml?: string;
  prompt?: string;
  outputs?: NbOutput[];
}

export interface NbDoc {
  cells: NbCell[];
}

marked.use({ gfm: true, breaks: false });

/** El campo `source`/`text` de un .ipynb es un array de líneas o una cadena. */
function joinText(src: unknown): string {
  if (Array.isArray(src)) return src.join('');
  if (typeof src === 'string') return src;
  return '';
}

/** Elimina los códigos de color ANSI de los tracebacks de error. */
function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

/** Escapa el texto para insertarlo con seguridad vía [innerHTML]. */
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Renderiza markdown a HTML; abre los enlaces en una pestaña nueva. */
function renderMarkdown(md: string): string {
  if (!md.trim()) return '';
  try {
    const html = marked.parse(md, { async: false }) as string;
    return html.replace(/<a /g, '<a target="_blank" rel="noopener" ');
  } catch {
    return '';
  }
}

/** Lenguaje del notebook (para el resaltado de sintaxis). */
function notebookLanguage(json: any): string {
  const raw = String(
    json?.metadata?.language_info?.name ||
    json?.metadata?.kernelspec?.language || '',
  ).toLowerCase();
  if (raw.startsWith('python') || raw === 'ipython') return 'python';
  return raw;
}

/** Resalta el código con highlight.js; si el lenguaje no está soportado, lo escapa. */
function highlightCode(code: string, lang: string): string {
  try {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
    }
  } catch {
    // Si el resaltado falla, se cae al texto plano escapado.
  }
  return escapeHtml(code);
}

function dataUri(mime: string, b64: string): string {
  return `data:${mime};base64,${b64.replace(/\s+/g, '')}`;
}

/** Convierte el dict `data` de una salida en un NbOutput según prioridad de mime. */
function outputFromData(data: Record<string, unknown> | undefined): NbOutput | null {
  if (!data || typeof data !== 'object') return null;
  if (data['image/png']) return { kind: 'image', src: dataUri('image/png', joinText(data['image/png'])) };
  if (data['image/jpeg']) return { kind: 'image', src: dataUri('image/jpeg', joinText(data['image/jpeg'])) };
  if (data['image/gif']) return { kind: 'image', src: dataUri('image/gif', joinText(data['image/gif'])) };
  if (data['image/svg+xml']) return { kind: 'html', html: joinText(data['image/svg+xml']) };
  if (data['text/html']) return { kind: 'html', html: joinText(data['text/html']) };
  if (data['text/markdown']) return { kind: 'html', html: renderMarkdown(joinText(data['text/markdown'])) };
  if (data['text/plain']) return { kind: 'text', text: joinText(data['text/plain']) };
  return null;
}

function parseOutputs(raw: unknown): NbOutput[] {
  const out: NbOutput[] = [];
  if (!Array.isArray(raw)) return out;
  for (const o of raw) {
    if (!o || typeof o !== 'object') continue;
    const outType = (o as any).output_type;
    if (outType === 'stream') {
      const text = joinText((o as any).text);
      if (text) out.push({ kind: 'text', text, error: (o as any).name === 'stderr' });
    } else if (outType === 'execute_result' || outType === 'display_data') {
      const item = outputFromData((o as any).data);
      if (item) out.push(item);
    } else if (outType === 'error') {
      const tb = Array.isArray((o as any).traceback) ? (o as any).traceback.join('\n') : '';
      const head = [(o as any).ename, (o as any).evalue].filter(Boolean).join(': ');
      const text = stripAnsi(tb || head);
      if (text) out.push({ kind: 'text', text, error: true });
    }
  }
  return out;
}

/** Sustituye las referencias `attachment:nombre` por su data URI (imágenes pegadas). */
function resolveAttachments(source: string, attachments: unknown): string {
  if (!attachments || typeof attachments !== 'object') return source;
  let result = source;
  for (const name of Object.keys(attachments as object)) {
    const mimes = (attachments as any)[name];
    const mime = mimes && Object.keys(mimes)[0];
    if (!mime) continue;
    result = result.split(`attachment:${name}`).join(dataUri(mime, joinText(mimes[mime])));
  }
  return result;
}

/** Parsea el JSON de un notebook a un NbDoc renderizable. */
export function renderNotebook(json: any): NbDoc {
  const rawCells: any[] = Array.isArray(json?.cells) ? json.cells : [];
  const lang = notebookLanguage(json);
  const cells: NbCell[] = [];
  for (const c of rawCells) {
    if (!c || typeof c !== 'object') continue;
    if (c.cell_type === 'markdown') {
      const html = renderMarkdown(resolveAttachments(joinText(c.source), c.attachments));
      if (html.trim()) cells.push({ type: 'markdown', html });
    } else if (c.cell_type === 'code') {
      const source = joinText(c.source);
      const outputs = parseOutputs(c.outputs);
      if (!source.trim() && outputs.length === 0) continue;
      const n = c.execution_count;
      cells.push({
        type: 'code',
        source,
        sourceHtml: highlightCode(source, lang),
        prompt: `In [${n != null ? n : ' '}]`,
        outputs,
      });
    }
  }
  return { cells };
}
