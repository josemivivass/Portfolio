import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TranslationService } from './translation.service';

function makeService(platformId: Object = 'browser') {
  return new TranslationService(platformId);
}

describe('TranslationService', () => {
  beforeEach(() => localStorage.clear());

  describe('idioma inicial', () => {
    it('por defecto es español', () => {
      expect(makeService().lang).toBe('es');
    });

    it('lee el idioma guardado en localStorage', () => {
      localStorage.setItem('lang', 'en');
      expect(makeService().lang).toBe('en');
    });

    it('en servidor (SSR) usa español sin tocar localStorage', () => {
      localStorage.setItem('lang', 'en');
      expect(makeService('server').lang).toBe('es');
    });
  });

  describe('t()', () => {
    it('devuelve la traducción del idioma activo', () => {
      const s = makeService();
      expect(s.t('nav.home')).toBe('Inicio');
      s.toggle();
      expect(s.t('nav.home')).toBe('Home');
    });

    it('devuelve la propia clave si no existe traducción', () => {
      expect(makeService().t('clave.que.no.existe')).toBe('clave.que.no.existe');
    });

    it('sustituye los parámetros {x}', () => {
      expect(makeService().t('projects.count', { n: 5 })).toBe('5 proyectos');
    });

    it('sustituye todas las apariciones del mismo parámetro', () => {
      const s = makeService();
      expect(s.t('projects.carousel.counter', { i: 2, n: 7 })).toBe('2 / 7');
    });
  });

  describe('toggle()', () => {
    it('alterna entre es y en', () => {
      const s = makeService();
      expect(s.lang).toBe('es');
      s.toggle();
      expect(s.lang).toBe('en');
      s.toggle();
      expect(s.lang).toBe('es');
    });

    it('persiste el idioma en localStorage', () => {
      const s = makeService();
      s.toggle();
      expect(localStorage.getItem('lang')).toBe('en');
    });
  });

  describe('applyOverrides()', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('los textos del backend tienen prioridad sobre el diccionario', () => {
      const s = makeService();
      s.applyOverrides({ 'nav.home': 'Portada' }, { 'nav.home': 'Cover' });
      vi.runAllTimers();
      expect(s.t('nav.home')).toBe('Portada');
      s.toggle();
      expect(s.t('nav.home')).toBe('Cover');
    });
  });
});
