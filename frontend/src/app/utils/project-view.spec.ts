import { describe, it, expect } from 'vitest';
import { cleanRichText, projectType, shortUrl, yearRange } from './project-view';

describe('cleanRichText', () => {
  it('reemplaza &nbsp; y U+00A0 por espacios normales', () => {
    expect(cleanRichText('Hola&nbsp;mundo')).toBe('Hola mundo');
    expect(cleanRichText('Hola mundo')).toBe('Hola mundo');
  });

  it('elimina atributos style inline (comillas dobles y simples)', () => {
    expect(cleanRichText('<p style="color: red;">x</p>')).toBe('<p>x</p>');
    expect(cleanRichText("<span style='font-weight:bold'>y</span>")).toBe('<span>y</span>');
  });

  it('conserva el resto del marcado (negrita, cursiva)', () => {
    expect(cleanRichText('<strong>A</strong> <em>B</em>')).toBe('<strong>A</strong> <em>B</em>');
  });

  it('devuelve cadena vacía para null/undefined', () => {
    expect(cleanRichText(null)).toBe('');
    expect(cleanRichText(undefined)).toBe('');
  });
});

describe('projectType', () => {
  it('acepta los tipos válidos', () => {
    expect(projectType('web')).toBe('web');
    expect(projectType('android')).toBe('android');
    expect(projectType('ai')).toBe('ai');
    expect(projectType('other')).toBe('other');
  });

  it('es insensible a mayúsculas', () => {
    expect(projectType('Android')).toBe('android');
  });

  it('cae en "web" ante valores desconocidos o vacíos', () => {
    expect(projectType('desktop')).toBe('web');
    expect(projectType('')).toBe('web');
    expect(projectType(null)).toBe('web');
    expect(projectType(undefined)).toBe('web');
  });
});

describe('shortUrl', () => {
  it('devuelve "localhost" si no hay url', () => {
    expect(shortUrl('')).toBe('localhost');
    expect(shortUrl(null)).toBe('localhost');
  });

  it('quita protocolo y www y conserva host', () => {
    expect(shortUrl('https://www.josemivivass.com')).toBe('josemivivass.com');
    expect(shortUrl('https://example.com/')).toBe('example.com');
  });

  it('incluye la ruta cuando existe', () => {
    expect(shortUrl('https://vercel.app/demo')).toBe('vercel.app/demo');
  });

  it('trunca con elipsis las urls largas (>38)', () => {
    const out = shortUrl('https://example.com/una/ruta/muy/larga/que/supera/el/limite');
    expect(out.length).toBeLessThanOrEqual(36);
    expect(out.endsWith('…')).toBe(true);
  });

  it('devuelve el texto recortado si no es una URL válida', () => {
    expect(shortUrl('no-es-url')).toBe('no-es-url');
  });
});

describe('yearRange', () => {
  it('un solo año si todas las fechas son del mismo año', () => {
    expect(yearRange(['2026-01-01', '2026-12-31'])).toBe('2026');
  });

  it('rango min-max con varios años', () => {
    expect(yearRange(['2023-05-01', '2026-02-01', '2024-09-01'])).toBe('2023-2026');
  });

  it('ignora fechas nulas o inválidas', () => {
    expect(yearRange([null, undefined, '2025-03-03'])).toBe('2025');
  });

  it('cadena vacía si no hay fechas válidas', () => {
    expect(yearRange([])).toBe('');
    expect(yearRange([null, undefined])).toBe('');
  });

  it('acepta objetos Date', () => {
    expect(yearRange([new Date('2022-01-01T00:00:00')])).toBe('2022');
  });
});
