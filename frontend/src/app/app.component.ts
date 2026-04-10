import {
  Component, OnInit, OnDestroy, ChangeDetectorRef,
  Inject, PLATFORM_ID, HostListener, ViewChild
} from '@angular/core';
import { RouterOutlet, RouterModule, Router, NavigationEnd, NavigationStart } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { filter, Subscription } from 'rxjs';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { Hero3dComponent } from './components/hero3d/hero3d.component';
import { HomeComponent } from './components/home/home.component';
import { RevealComplexComponent } from './components/reveal-complex/reveal-complex.component';
import { TranslationService } from './services/translation.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterModule,
    CommonModule,
    Hero3dComponent,
    HomeComponent,
    RevealComplexComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild(HomeComponent) homeComponent?: HomeComponent;

  showPreloader = true;
  showIntro = true;

  isLoggedIn = false;
  isHomeRoute = true;

  introScale = 1;
  introTranslateY = 0;
  introOpacity = 1;
  mainTranslateY = 100;
  overlayOpacity = 0;
  disableReveal = false;
  menuTranslateY = 0;
  introBorderRadius = 0;

  // ─── Fade de imágenes y firma ───
  imageOpacity   = 1;    // mantenido por compatibilidad con RevealComplexComponent
  firmaOpacity   = 0;    // opacidad de la firma (0→1, sincronizada con scroll)
  firmaClipRight = 100;  // clip-path inset desde la derecha (100=oculta, 0=revelada)
  hoverIntensity = 1;    // intensidad del efecto hover (1=pleno, 0=ninguno al mínimo)

  // Contador de ticks de scroll: la firma solo aparece pasados 6 ticks (~100ms)
  private firmaScrollTicks = 0;

  private touchStartY = 0;
  private isTransitioning = false;
  private routerSub!: Subscription;

  // ─── Virtual smooth scroll system ───
  private virtualScrollEnabled = false;
  private targetScrollY = 0;
  private currentScrollY = 0;
  private scrollRafId: number | null = null;
  private readonly SCROLL_LERP = 0.08;        // interpolation speed (higher = faster catch-up)
  private readonly SCROLL_SNAP_THRESHOLD = 0.5; // px threshold to snap to target

  constructor(
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router,
    public i18n: TranslationService
  ) {
    if (isPlatformBrowser(this.platformId)) {
      gsap.registerPlugin(ScrollTrigger);
    }
  }

  private wheelHandler = (e: WheelEvent) => this.onWheel(e);
  private touchMoveHandler = (e: TouchEvent) => this.onTouchMove(e);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Register wheel & touchmove with { passive: false } so we can preventDefault during intro
    window.addEventListener('wheel', this.wheelHandler, { passive: false });
    window.addEventListener('touchmove', this.touchMoveHandler, { passive: false });

    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    const token = localStorage.getItem('token');
    this.isLoggedIn = !!token;

    this.applyRoute(window.location.pathname);

    this.router.events.pipe(
      filter(e => e instanceof NavigationStart)
    ).subscribe((e: NavigationStart) => {
      if ((e.url === '/login' || e.url === '/register') && this.isHomeRoute) {
        sessionStorage.setItem('preAuthState', JSON.stringify({
          showIntro: this.showIntro,
          scrollY:   window.scrollY
        }));
      }
    });

    this.routerSub = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: NavigationEnd) => {
      this.applyRoute(e.urlAfterRedirects);
      this.cdr.detectChanges();
    });
  }

  private applyRoute(url: string): void {
    this.isHomeRoute = url === '/' || url === '';

    if (!this.isHomeRoute) {
      this.showPreloader  = false;
      this.showIntro      = false;
      this.mainTranslateY = 0;
      return;
    }

    const returnFlag = sessionStorage.getItem('authReturn');
    if (returnFlag) {
      sessionStorage.removeItem('authReturn');
      this.showPreloader = false;

      const savedStr = sessionStorage.getItem('preAuthState');
      sessionStorage.removeItem('preAuthState');

      if (savedStr) {
        const saved: { showIntro: boolean; scrollY: number } = JSON.parse(savedStr);
        if (!saved.showIntro) {
          this.showIntro      = false;
          this.mainTranslateY = 0;
          setTimeout(() => {
            window.scrollTo({ top: saved.scrollY, behavior: 'instant' });
            ScrollTrigger.refresh();
            this.homeComponent?.initAnimations();
            this.cdr.detectChanges();
          }, 60);
        } else {
          this.showIntro      = false;
          this.mainTranslateY = 0;
          setTimeout(() => {
            ScrollTrigger.refresh();
            this.homeComponent?.initAnimations();
          }, 100);
        }
      } else {
        this.showIntro      = false;
        this.mainTranslateY = 0;
        setTimeout(() => {
          ScrollTrigger.refresh();
          this.homeComponent?.initAnimations();
        }, 100);
      }
      return;
    }

    if (this.showPreloader) {
      setTimeout(() => {
        this.showPreloader = false;
        this.cdr.detectChanges();
      }, 3200);
    }
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.stopVirtualScroll();
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('wheel', this.wheelHandler);
      window.removeEventListener('touchmove', this.touchMoveHandler);
    }
  }

  // ─── Virtual smooth scroll system ───

  private startVirtualScroll(): void {
    if (this.virtualScrollEnabled) return;
    this.virtualScrollEnabled = true;
    this.currentScrollY = window.scrollY;
    this.targetScrollY = this.currentScrollY;
    this.tickVirtualScroll();
  }

  private stopVirtualScroll(): void {
    this.virtualScrollEnabled = false;
    if (this.scrollRafId !== null) {
      cancelAnimationFrame(this.scrollRafId);
      this.scrollRafId = null;
    }
  }

  private tickVirtualScroll(): void {
    if (!this.virtualScrollEnabled) return;

    const diff = this.targetScrollY - this.currentScrollY;

    if (Math.abs(diff) > this.SCROLL_SNAP_THRESHOLD) {
      this.currentScrollY += diff * this.SCROLL_LERP;
    } else {
      this.currentScrollY = this.targetScrollY;
    }

    window.scrollTo(0, this.currentScrollY);
    this.applyIntroScroll(this.currentScrollY);

    this.scrollRafId = requestAnimationFrame(() => this.tickVirtualScroll());
  }

  private applyIntroScroll(scrollY: number): void {
    const vh = window.innerHeight;

    this.disableReveal = scrollY > 250;

    const phase1 = Math.min(scrollY / vh, 1);
    const phase2 = Math.max(0, Math.min((scrollY - vh) / vh, 1));

    if (scrollY >= 2 * vh) {
      this.stopVirtualScroll();
      this.isTransitioning = true;
      this.showIntro = false;
      this.mainTranslateY = 0;
      this.menuTranslateY = 0;

      this.cdr.detectChanges();
      window.scrollTo(0, 0);

      setTimeout(() => {
        ScrollTrigger.refresh();
        window.dispatchEvent(new Event('resize'));
        this.homeComponent?.initAnimations();

        setTimeout(() => { this.isTransitioning = false; }, 600);
      }, 100);

      return;
    }

    this.introScale        = 1 - (0.55 * phase1);
    this.introBorderRadius = Math.min(phase1 * 2.5, 1) * 20; // 0px → 20px, reaches max at 40% scroll
    this.overlayOpacity  = Math.min(phase1 * 1.5, 1);
    this.introTranslateY = -(phase2 * 100);
    this.introOpacity    = 1;
    this.mainTranslateY  = 100 - (phase2 * 100);

    // ── Hover: se atenúa linealmente con el scroll (pleno al inicio, cero al mínimo) ──
    // phase1 va de 0 (sin scroll) a 1 (intro en escala mínima)
    this.hoverIntensity = Math.max(0, 1 - phase1);

    // ── Firma: espera 6 ticks de scroll (~100ms) antes de aparecer ──
    if (scrollY > 0) {
      this.firmaScrollTicks = Math.min(this.firmaScrollTicks + 1, 100);
    } else {
      this.firmaScrollTicks = 0;
    }

    // La animación de trazo se sincroniza con el progreso de scroll
    // Rango: phase1 de 0.10 a 0.70 (60% del recorrido total)
    const firmaPhase = this.firmaScrollTicks >= 6
      ? Math.max(0, Math.min(1, (phase1 - 0.10) / 0.60))
      : 0;

    this.firmaOpacity   = firmaPhase;
    this.firmaClipRight = (1 - firmaPhase) * 100;

    this.cdr.detectChanges();
  }

  // ─── Scroll & touch handlers ───

  @HostListener('window:scroll')
  onScroll(): void {
    if (!isPlatformBrowser(this.platformId) || !this.isHomeRoute || this.showPreloader) return;

    const scrollY = window.scrollY;

    // When intro is NOT active, handle menu parallax normally
    if (!this.showIntro) {
      this.menuTranslateY = -scrollY;
      this.cdr.detectChanges();
      return;
    }

    // During intro, the virtual scroll system handles everything via applyIntroScroll
    // so we do NOT process raw scroll events here
  }

  onWheel(event: WheelEvent): void {
    if (!isPlatformBrowser(this.platformId) || !this.isHomeRoute || this.showPreloader) return;

    // Return-to-intro: when main content is active and user scrolls up at top
    if (!this.showIntro && window.scrollY <= 0 && event.deltaY < -40 && !this.isTransitioning) {
      this.returnToIntro();
      return;
    }

    // During intro: intercept wheel and feed virtual scroll
    if (this.showIntro && !this.isTransitioning) {
      event.preventDefault();

      if (!this.virtualScrollEnabled) {
        this.startVirtualScroll();
      }

      const vh = window.innerHeight;
      const maxScroll = 2 * vh + 10; // slightly past trigger point
      this.targetScrollY = Math.max(0, Math.min(this.targetScrollY + event.deltaY, maxScroll));
    }
  }

  @HostListener('window:touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    if (event.touches.length > 0) {
      this.touchStartY = event.touches[0].clientY;
    }
  }

  onTouchMove(event: TouchEvent): void {
    if (!isPlatformBrowser(this.platformId) || !this.isHomeRoute) return;

    // Return-to-intro via swipe down
    if (!this.showIntro && window.scrollY <= 0 && event.touches.length > 0 && !this.isTransitioning) {
      const touchEndY = event.touches[0].clientY;
      if (touchEndY - this.touchStartY > 80) {
        this.returnToIntro();
        return;
      }
    }

    // During intro: intercept touch and feed virtual scroll
    if (this.showIntro && !this.isTransitioning && event.touches.length > 0) {
      event.preventDefault();

      const touchCurrentY = event.touches[0].clientY;
      const delta = this.touchStartY - touchCurrentY; // positive = scroll down
      this.touchStartY = touchCurrentY;

      if (!this.virtualScrollEnabled) {
        this.startVirtualScroll();
      }

      const vh = window.innerHeight;
      const maxScroll = 2 * vh + 10;
      this.targetScrollY = Math.max(0, Math.min(this.targetScrollY + delta * 2, maxScroll));
    }
  }

  private returnToIntro(): void {
    if (this.isTransitioning || !isPlatformBrowser(this.platformId)) return;
    this.isTransitioning = true;
    this.menuTranslateY  = 0;
    this.firmaScrollTicks = 0; // resetear contador para la próxima visita

    this.homeComponent?.resetAnimations();

    this.showIntro = true;
    this.cdr.detectChanges();

    const vh = window.innerHeight;
    const startPos = Math.floor(2 * vh) - 50;
    window.scrollTo(0, startPos);

    // Initialize virtual scroll at the return position so it can animate back smoothly
    this.currentScrollY = startPos;
    this.targetScrollY = startPos;
    this.applyIntroScroll(startPos);

    setTimeout(() => {
      this.isTransitioning = false;
      this.startVirtualScroll();
    }, 500);
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.setItem('authReturn', '1');
      sessionStorage.setItem('preAuthState', JSON.stringify({
        showIntro: this.showIntro,
        scrollY:   window.scrollY
      }));
      localStorage.removeItem('token');
      window.location.reload();
    }
  }
}
