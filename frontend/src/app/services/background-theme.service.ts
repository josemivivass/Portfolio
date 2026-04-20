import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Progreso 0..1 que comparten el scroll horizontal (Home) y el canvas 3D
 * (Hero3d). 0 = tema claro (fondo claro, puntos oscuros). 1 = tema oscuro
 * (fondo gris, puntos blancos). El valor se interpola linealmente.
 */
@Injectable({ providedIn: 'root' })
export class BackgroundThemeService {
  readonly progress$ = new BehaviorSubject<number>(0);

  setProgress(value: number): void {
    const clamped = Math.max(0, Math.min(1, value));
    if (this.progress$.value !== clamped) {
      this.progress$.next(clamped);
    }
  }

  get progress(): number {
    return this.progress$.value;
  }
}
