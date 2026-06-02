import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

const KEY = 'auth';

// Crea el servicio con un HttpClient simulado y la plataforma indicada.
function makeService(platformId: Object = 'browser', postResponse: any = {}) {
  const http = { post: vi.fn(() => of(postResponse)) } as unknown as HttpClient;
  const service = new AuthService(http, platformId);
  return { service, http };
}

function setSession(role: string, email = 'jose@example.com') {
  localStorage.setItem(KEY, JSON.stringify({ role, email }));
}

describe('AuthService', () => {
  beforeEach(() => localStorage.clear());

  describe('sin sesión almacenada', () => {
    it('no está autenticado y no tiene rol', () => {
      const { service } = makeService();
      expect(service.isAuthenticated()).toBe(false);
      expect(service.getRole()).toBeNull();
      expect(service.getEmail()).toBeNull();
      expect(service.canAccessAdminPanel()).toBe(false);
    });
  });

  describe('sesión válida en localStorage', () => {
    it('admin: autenticado, isAdmin y acceso al panel', () => {
      setSession('admin');
      const { service } = makeService();
      expect(service.isAuthenticated()).toBe(true);
      expect(service.isAdmin()).toBe(true);
      expect(service.isEditor()).toBe(false);
      expect(service.canAccessAdminPanel()).toBe(true);
      expect(service.getEmail()).toBe('jose@example.com');
    });

    it('editor: acceso al panel pero no es admin', () => {
      setSession('editor');
      const { service } = makeService();
      expect(service.isEditor()).toBe(true);
      expect(service.isAdmin()).toBe(false);
      expect(service.canAccessAdminPanel()).toBe(true);
    });

    it('user: autenticado pero sin acceso al panel', () => {
      setSession('user');
      const { service } = makeService();
      expect(service.isAuthenticated()).toBe(true);
      expect(service.canAccessAdminPanel()).toBe(false);
    });
  });

  describe('datos corruptos o incompletos', () => {
    it('ignora JSON inválido', () => {
      localStorage.setItem(KEY, 'esto-no-es-json');
      const { service } = makeService();
      expect(service.isAuthenticated()).toBe(false);
    });

    it('ignora una sesión sin email', () => {
      localStorage.setItem(KEY, JSON.stringify({ role: 'admin' }));
      const { service } = makeService();
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('SSR (plataforma servidor)', () => {
    it('no lee localStorage en el servidor', () => {
      setSession('admin');
      const { service } = makeService('server');
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('login', () => {
    it('guarda la sesión y actualiza el estado', () => {
      const { service } = makeService('browser', { role: 'admin', email: 'a@b.com' });
      service.login({ email: 'a@b.com', password: 'x' }).subscribe();
      expect(service.isAuthenticated()).toBe(true);
      expect(service.getRole()).toBe('admin');
      expect(localStorage.getItem(KEY)).toContain('a@b.com');
    });

    it('no autentica si la respuesta no trae role/email', () => {
      const { service } = makeService('browser', { message: 'ok' });
      service.login({ email: 'a@b.com', password: 'x' }).subscribe();
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('logout', () => {
    it('limpia la sesión y el localStorage', () => {
      setSession('admin');
      const { service } = makeService();
      expect(service.isAuthenticated()).toBe(true);
      service.logout().subscribe();
      expect(service.isAuthenticated()).toBe(false);
      expect(service.getRole()).toBeNull();
      expect(localStorage.getItem(KEY)).toBeNull();
    });
  });
});
