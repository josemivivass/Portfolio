import { Component, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID, HostListener } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { Hero3dComponent } from './components/hero3d/hero3d.component';
import { ProjectsGsapComponent } from './components/projects-gsap/projects-gsap.component';
import { RevealComplexComponent } from './components/reveal-complex/reveal-complex.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, 
    RouterModule, 
    CommonModule,
    Hero3dComponent,
    ProjectsGsapComponent,
    RevealComplexComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  showPreloader: boolean = true;
  showIntro: boolean = true;
  
  isLoggedIn: boolean = false;
  isHomeRoute: boolean = true; 

  introScale: number = 1;
  introTranslateY: number = 0;
  introOpacity: number = 1;
  mainTranslateY: number = 100;
  overlayOpacity: number = 0;
  disableReveal: boolean = false;
  menuTranslateY: number = 0;

  private touchStartY = 0;
  private isTransitioning: boolean = false; 

  constructor(
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
      }
      window.scrollTo(0, 0);

      this.isHomeRoute = window.location.pathname === '/';
      const token = localStorage.getItem('token');
      this.isLoggedIn = !!token;

      if (!this.isHomeRoute) {
        this.showPreloader = false;
        this.showIntro = false;
        this.mainTranslateY = 0;
      } else {
        // La animación de cierre es 100% CSS (animation-delay: 2s en el overlay).
        // Solo necesitamos limpiar el DOM una vez terminada la animación.
        setTimeout(() => {
          this.showPreloader = false;
          this.cdr.detectChanges();
        }, 3200);
      }
    }
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (!isPlatformBrowser(this.platformId) || !this.isHomeRoute || this.showPreloader) return;

    const scrollY = window.scrollY;
    const vh = window.innerHeight;

    // Tras la transición: siempre actualizar el menú, sin bloquear con isTransitioning
    if (!this.showIntro) {
      this.menuTranslateY = -scrollY;
      this.cdr.detectChanges();
      return;
    }

    if (this.isTransitioning) return;

    this.disableReveal = scrollY > 250;

    const phase1 = Math.min(scrollY / vh, 1);
    const phase2 = Math.max(0, Math.min((scrollY - vh) / vh, 1));

    if (scrollY >= 2 * vh) {
      this.isTransitioning = true;
      this.showIntro = false;
      this.mainTranslateY = 0;
      this.menuTranslateY = 0;

      this.cdr.detectChanges();
      window.scrollTo(0, 0);

      // Retraso controlado para permitir al navegador expandir el DOM
      setTimeout(() => {
        // Obliga a GSAP a escanear de nuevo toda la página
        ScrollTrigger.refresh();
        window.dispatchEvent(new Event('resize'));

        setTimeout(() => {
          this.isTransitioning = false;
        }, 600);
      }, 100);

      return;
    }

    this.introScale = 1 - (0.55 * phase1);
    this.overlayOpacity = Math.min(phase1 * 1.5, 1);

    this.introTranslateY = -(phase2 * 100);
    this.introOpacity = 1;

    this.mainTranslateY = 100 - (phase2 * 100);
  }

  @HostListener('window:wheel', ['$event'])
  onWheel(event: WheelEvent): void {
    if (!this.showIntro && this.isHomeRoute && window.scrollY <= 0 && event.deltaY < -40 && !this.isTransitioning) {
      this.returnToIntro();
    }
  }

  @HostListener('window:touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    if (event.touches.length > 0) {
      this.touchStartY = event.touches[0].clientY;
    }
  }

  @HostListener('window:touchmove', ['$event'])
  onTouchMove(event: TouchEvent): void {
    if (!this.showIntro && this.isHomeRoute && window.scrollY <= 0 && event.touches.length > 0 && !this.isTransitioning) {
      const touchEndY = event.touches[0].clientY;
      if (touchEndY - this.touchStartY > 80) { 
        this.returnToIntro();
      }
    }
  }

  private returnToIntro(): void {
    if (this.isTransitioning || !isPlatformBrowser(this.platformId)) return;
    this.isTransitioning = true;
    this.menuTranslateY = 0;

    this.showIntro = true;
    this.cdr.detectChanges();

    const vh = window.innerHeight;
    window.scrollTo(0, Math.floor(2 * vh) - 50);

    setTimeout(() => {
      this.isTransitioning = false;
    }, 500);
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      this.isLoggedIn = false;
    }
  }
}