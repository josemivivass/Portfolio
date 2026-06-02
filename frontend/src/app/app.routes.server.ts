import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Server },
  { path: 'contacto', renderMode: RenderMode.Server },
  { path: '**', renderMode: RenderMode.Client },
];
