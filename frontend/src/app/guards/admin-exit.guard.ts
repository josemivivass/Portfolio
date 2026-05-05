import { CanDeactivateFn } from '@angular/router';

/**
 * Intercepta cualquier salida del panel de admin (botón ← de la página,
 * botón atrás del navegador, swipe atrás en móvil, navegación programática)
 * y fuerza siempre el mismo flujo: marcar `scrollToCv=1` y hacer un reload
 * duro a `/`.
 *
 * Volver vía SPA dejaba el home a medio inicializar (ScrollTrigger
 * huérfanos, pin spacers viejos, ViewChild que no terminaba de poblar a
 * tiempo); recargar y dejar que el branch `scrollToCv` de
 * `applyRoute()` reconstruya todo desde cero es el camino fiable.
 *
 * Retorna `false` para cancelar la navegación SPA — el `window.location`
 * que disparamos a continuación reemplaza la navegación actual.
 *
 * Solo dispara cuando se sale REALMENTE del árbol `/admin/*`. Cambiar
 * de pestaña dentro del admin (p.ej. /admin/dashboard → /admin/projects)
 * no activa este guard porque el `AdminComponent` no se desactiva.
 */
export const adminExitGuard: CanDeactivateFn<unknown> = (_component, _currentRoute, _currentState, nextState) => {
  if (typeof window === 'undefined') return true;

  const nextUrl = nextState?.url ?? '/';
  if (nextUrl.startsWith('/admin')) return true;

  sessionStorage.removeItem('preAdminState');
  sessionStorage.removeItem('preAuthState');
  sessionStorage.removeItem('authReturn');
  sessionStorage.setItem('scrollToCv', '1');

  window.location.href = '/';
  return false;
};
