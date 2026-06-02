import { describe, it, expect } from 'vitest';
import { techIcon, hideIconOnError } from './tech-icons';

describe('techIcon', () => {
  it('devuelve la ruta del icono para un tag conocido', () => {
    expect(techIcon('angular')).toBe('/icons/angular.svg');
  });

  it('es insensible a mayúsculas y espacios', () => {
    expect(techIcon('  Angular  ')).toBe('/icons/angular.svg');
    expect(techIcon('TypeScript')).toBe('/icons/typescript.svg');
  });

  it('resuelve alias al mismo icono', () => {
    expect(techIcon('js')).toBe('/icons/javascript.svg');
    expect(techIcon('javascript')).toBe('/icons/javascript.svg');
    expect(techIcon('node.js')).toBe(techIcon('nodejs'));
  });

  it('devuelve cadena vacía para tag vacío o desconocido', () => {
    expect(techIcon('')).toBe('');
    expect(techIcon('tecnologia-inventada')).toBe('');
  });
});

describe('hideIconOnError', () => {
  it('oculta el elemento que disparó el error', () => {
    const target = { style: { display: '' } } as unknown as HTMLImageElement;
    hideIconOnError({ target } as unknown as Event);
    expect(target.style.display).toBe('none');
  });
});
