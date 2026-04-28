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
import { AuthService } from './services/auth.service';
import { TrackingService } from './services/tracking.service';
import { ChatbotComponent } from './components/chatbot/chatbot.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterModule,
    CommonModule,
    Hero3dComponent,
    HomeComponent,
    RevealComplexComponent,
    ChatbotComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild(HomeComponent) homeComponent?: HomeComponent;

  showPreloader = true;
  showIntro = true;

  isLoggedIn = false;
  canAccessAdmin = false;
  isHomeRoute = true;
  isAdminRoute = false;

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
  private chatbotWasOpen = false;

  private touchStartY = 0;
  private isTransitioning = false;
  private routerSub!: Subscription;

  // ─── Virtual smooth scroll system ───
  private virtualScrollEnabled = false;
  private scrollMode: 'intro' | 'main' = 'intro';
  private targetScrollY = 0;
  private currentScrollY = 0;
  private scrollRafId: number | null = null;
  private readonly SCROLL_LERP = 0.08;        // intro lerp speed
  private readonly SCROLL_SNAP_THRESHOLD = 0.5; // px threshold to snap to target
  private readonly INTRO_MIN_DURATION_FRAMES = 90; // ~1.5s @60fps for full 2*vh traversal
  private readonly MAIN_SCROLL_LERP = 0.18;   // snappier catch-up for the main page
  private readonly MAIN_SCROLL_MAX_PX_PER_FRAME = 42; // ~2520 px/s cap — fast but prevents skipping

  constructor(
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router,
    public i18n: TranslationService,
    private auth: AuthService,
    private tracking: TrackingService
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
    this.canAccessAdmin = this.auth.canAccessAdminPanel();

    this.tracking.logEntry();
    this.auth.role$().subscribe(() => {
      this.canAccessAdmin = this.auth.canAccessAdminPanel();
      this.cdr.detectChanges();
    });

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
    this.isAdminRoute = url.startsWith('/admin');

    if (!this.isHomeRoute) {
      this.showPreloader  = false;
      this.showIntro      = false;
      this.mainTranslateY = 0;
      if (isPlatformBrowser(this.platformId)) {
        // Parar cualquier estado residual del sistema de scroll virtual
        // y de las transiciones de intro para que la nueva ruta (p.ej. /admin)
        // pueda hacer scroll libremente.
        this.stopVirtualScroll();
        this.isTransitioning = false;
        // Matar ScrollTriggers activos y limpiar estilos inline que GSAP pin
        // pudiera haber dejado en body/html, causando el bloqueo de scroll.
        ScrollTrigger.getAll().forEach(t => t.kill(true));
        const body = document.body;
        const html = document.documentElement;
        body.style.overflow = '';
        body.style.paddingRight = '';
        body.style.paddingBottom = '';
        body.style.position = '';
        body.style.top = '';
        body.style.touchAction = '';
        html.style.overflow = '';
        html.style.scrollBehavior = '';
        window.scrollTo(0, 0);
      }
      return;
    }

    const scrollProjFlag = sessionStorage.getItem('scrollToProjects');
    if (scrollProjFlag) {
      sessionStorage.removeItem('scrollToProjects');
      this.showPreloader = false;
      this.showIntro = false;
      this.mainTranslateY = 0;
      setTimeout(() => {
        window.scrollTo(0, 0);
        this.homeComponent?.initAnimations();
        this.cdr.detectChanges();
        setTimeout(() => {
          ScrollTrigger.refresh();
          this.scrollMode = 'main';
          const showcaseSection = document.querySelector('.skills-showcase-section') as HTMLElement;
          const targetY = showcaseSection ? showcaseSection.getBoundingClientRect().top + window.scrollY + (window.innerHeight * 0.5) : Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
          this.currentScrollY = targetY;
          this.targetScrollY = targetY;
          window.scrollTo(0, targetY);
          this.startVirtualScroll(true);
        }, 100);
      }, 100);
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
            // Registrar los ScrollTrigger con el viewport en 0 para que GSAP
            // capture el pinSpacing correcto del scroll horizontal de experiencia.
            window.scrollTo(0, 0);
            this.homeComponent?.initAnimations();
            this.cdr.detectChanges();
            requestAnimationFrame(() => {
              window.scrollTo({ top: saved.scrollY, behavior: 'instant' });
              ScrollTrigger.refresh();
            });
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
        // Reset any native scroll that may have leaked before listeners attached,
        // so the intro virtual scroll starts from a clean 0.
        window.scrollTo(0, 0);
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

  private startVirtualScroll(seedFromWindow = true): void {
    if (this.virtualScrollEnabled) return;
    this.virtualScrollEnabled = true;
    if (seedFromWindow) {
      this.currentScrollY = window.scrollY;
      this.targetScrollY = this.currentScrollY;
    }
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

    // Re-clamp the main-mode target every frame — the document height can
    // change while ScrollTrigger pins/unpins sections.
    if (this.scrollMode === 'main') {
      const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      if (this.targetScrollY > maxY) this.targetScrollY = maxY;
    }

    const diff = this.targetScrollY - this.currentScrollY;

    if (Math.abs(diff) > this.SCROLL_SNAP_THRESHOLD) {
      const isIntro = this.scrollMode === 'intro';
      const maxStepPerFrame = isIntro
        ? (2 * window.innerHeight) / this.INTRO_MIN_DURATION_FRAMES
        : this.MAIN_SCROLL_MAX_PX_PER_FRAME;
      const lerp = isIntro ? this.SCROLL_LERP : this.MAIN_SCROLL_LERP;
      let step = diff * lerp;
      if (Math.abs(step) > maxStepPerFrame) {
        step = Math.sign(step) * maxStepPerFrame;
      }
      this.currentScrollY += step;
    } else {
      this.currentScrollY = this.targetScrollY;
    }

    window.scrollTo(0, this.currentScrollY);
    if (this.scrollMode === 'intro') {
      this.applyIntroScroll(this.currentScrollY);
    }

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

  @HostListener('window:scrollToTop')
  onScrollToTop(): void {
    if (!this.isHomeRoute || this.showIntro) return;
    this.stopVirtualScroll();
    this.targetScrollY = 0;
    this.currentScrollY = 0;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  onWheel(event: WheelEvent): void {
    if (!isPlatformBrowser(this.platformId) || !this.isHomeRoute) return;

    // Ignore wheel events when cursor is inside the chatbot
    if (this.isCursorInsideChatbot(event)) {
      event.preventDefault();
      event.stopPropagation();
      // Only forward scroll to chat messages, not when over the input area
      const target = event.target as HTMLElement;
      if (!target.closest('.chatbot-input-area')) {
        const msgContainer = document.querySelector('.chatbot-messages') as HTMLElement;
        if (msgContainer) {
          msgContainer.scrollTop += event.deltaY;
        }
      }
      this.chatbotWasOpen = true;
      return;
    }

    // Resync virtual scroll after chatbot was open
    if (this.chatbotWasOpen) {
      this.chatbotWasOpen = false;
      this.currentScrollY = window.scrollY;
      this.targetScrollY = window.scrollY;
    }

    // Block native scroll during preloader so window.scrollY can't accumulate
    // past the intro trigger before the virtual scroll system takes over.
    if (this.showPreloader) {
      event.preventDefault();
      return;
    }

    // Return-to-intro: when main content is active and user scrolls up at top
    if (!this.showIntro && this.currentScrollY <= 0 && event.deltaY < -40 && !this.isTransitioning) {
      event.preventDefault();
      this.returnToIntro();
      // Seed the reverse animation with the triggering wheel's deltaY so the
      // virtual scroll immediately starts moving without a dead frame.
      const vh = window.innerHeight;
      const maxScroll = 2 * vh + 10;
      this.targetScrollY = Math.max(0, Math.min(this.targetScrollY + event.deltaY, maxScroll));
      return;
    }

    // Intro: always block native scroll while the overlay is mounted.
    if (this.showIntro) {
      event.preventDefault();
      if (!this.isTransitioning) {
        if (!this.virtualScrollEnabled || this.scrollMode !== 'intro') {
          this.scrollMode = 'intro';
          this.startVirtualScroll();
        }
        const vh = window.innerHeight;
        const maxScroll = 2 * vh + 10;
        this.targetScrollY = Math.max(0, Math.min(this.targetScrollY + event.deltaY, maxScroll));
      }
      return;
    }

    // Main page: intercept wheel and feed velocity-limited virtual scroll
    // so fast wheel bursts can't skip past sections.

    // Excepción: si el cursor está sobre la lista de proyectos y aún tiene
    // scroll por consumir en la dirección del wheel, lo absorbe ella en vez
    // del doc. Así el usuario puede recorrer las cards sin que el documento
    // avance ni un píxel hasta llegar al fin/inicio de la lista.
    if (this.scrollableContainerAbsorbs(event.target as HTMLElement, event.deltaY)) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    if (this.isTransitioning) return;

    if (!this.virtualScrollEnabled || this.scrollMode !== 'main') {
      this.scrollMode = 'main';
      this.currentScrollY = window.scrollY;
      this.targetScrollY = window.scrollY;
      this.startVirtualScroll();
    }
    const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    this.targetScrollY = Math.max(0, Math.min(this.targetScrollY + event.deltaY, maxY));
  }

  /** Si el target está dentro de un contenedor con scroll interno (hoy:
   *  `.showcase-list`) y todavía puede consumir delta en esa dirección,
   *  scrollea ese contenedor y devuelve true. El caller debe entonces
   *  preventDefault y NO tocar el virtual scroll del documento. */
  private scrollableContainerAbsorbs(target: HTMLElement | null, deltaY: number): boolean {
    if (!target || deltaY === 0) return false;
    const list = target.closest('.showcase-list') as HTMLElement | null;
    if (!list) return false;
    const atTop = list.scrollTop <= 0;
    const atBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 1;
    if ((deltaY > 0 && atBottom) || (deltaY < 0 && atTop)) return false;
    list.scrollTop += deltaY;
    return true;
  }

  @HostListener('window:touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    if (event.touches.length > 0) {
      this.touchStartY = event.touches[0].clientY;
    }
  }

  onTouchMove(event: TouchEvent): void {
    if (!isPlatformBrowser(this.platformId) || !this.isHomeRoute) return;

    // Ignore touch events from within the chatbot
    if ((event.target as HTMLElement)?.closest('.chatbot-panel, .chatbot-toggle')) {
      this.chatbotWasOpen = true;
      return;
    }

    // Resync virtual scroll after chatbot was open
    if (this.chatbotWasOpen) {
      this.chatbotWasOpen = false;
      this.currentScrollY = window.scrollY;
      this.targetScrollY = window.scrollY;
    }

    // Block native scroll during preloader to avoid skipping the intro.
    if (this.showPreloader) {
      event.preventDefault();
      return;
    }

    // Return-to-intro via swipe down
    if (!this.showIntro && this.currentScrollY <= 0 && event.touches.length > 0 && !this.isTransitioning) {
      const touchEndY = event.touches[0].clientY;
      if (touchEndY - this.touchStartY > 80) {
        event.preventDefault();
        this.returnToIntro();
        // Seed reverse animation with the swipe delta so it starts moving at once.
        const vh = window.innerHeight;
        const maxScroll = 2 * vh + 10;
        const delta = this.touchStartY - touchEndY; // negative (user swiped down)
        this.touchStartY = touchEndY;
        this.targetScrollY = Math.max(0, Math.min(this.targetScrollY + delta * 2, maxScroll));
        return;
      }
    }

    // Intro: block native scroll while the overlay is mounted.
    if (this.showIntro) {
      event.preventDefault();
      if (!this.isTransitioning && event.touches.length > 0) {
        const touchCurrentY = event.touches[0].clientY;
        const delta = this.touchStartY - touchCurrentY;
        this.touchStartY = touchCurrentY;

        if (!this.virtualScrollEnabled || this.scrollMode !== 'intro') {
          this.scrollMode = 'intro';
          this.startVirtualScroll();
        }

        const vh = window.innerHeight;
        const maxScroll = 2 * vh + 10;
        this.targetScrollY = Math.max(0, Math.min(this.targetScrollY + delta * 2, maxScroll));
      }
      return;
    }

    // Main page: intercept touch and feed velocity-limited virtual scroll.
    if (this.isTransitioning || event.touches.length === 0) {
      event.preventDefault();
      return;
    }

    const touchCurrentY = event.touches[0].clientY;
    const delta = this.touchStartY - touchCurrentY;
    this.touchStartY = touchCurrentY;

    // Igual que con la rueda: si el dedo arrastra sobre la lista de
    // proyectos y aún hay scroll por consumir en esa dirección, absórbelo
    // ahí en vez del doc.
    if (this.scrollableContainerAbsorbs(event.target as HTMLElement, delta * 2)) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    if (!this.virtualScrollEnabled || this.scrollMode !== 'main') {
      this.scrollMode = 'main';
      this.currentScrollY = window.scrollY;
      this.targetScrollY = window.scrollY;
      this.startVirtualScroll();
    }

    const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    this.targetScrollY = Math.max(0, Math.min(this.targetScrollY + delta * 2, maxY));
  }

  private isCursorInsideChatbot(event: WheelEvent): boolean {
    const target = event.target as HTMLElement;
    if (!target) return false;
    if (target.closest('app-chatbot, .chatbot-panel, .chatbot-toggle, .chatbot-input-area')) return true;
    return false;
  }

  private returnToIntro(): void {
    if (this.isTransitioning || !isPlatformBrowser(this.platformId) || this.showIntro) return;
    this.menuTranslateY  = 0;
    this.firmaScrollTicks = 0; // resetear contador para la próxima visita

    this.homeComponent?.resetAnimations();

    // Switch virtual scroll back into intro mode so caps/lerp match the entry.
    this.stopVirtualScroll();
    this.scrollMode = 'intro';

    this.showIntro = true;
    this.cdr.detectChanges();

    const vh = window.innerHeight;
    const startPos = Math.floor(2 * vh) - 50;
    window.scrollTo(0, startPos);

    // Initialize virtual scroll at the return position so it can animate back smoothly
    this.currentScrollY = startPos;
    this.targetScrollY = startPos;
    this.applyIntroScroll(startPos);

    // Start virtual scroll immediately — caller seeds targetScrollY right
    // after this returns, so the reverse animation begins on the next tick.
    this.startVirtualScroll(false);
  }

  scrollToProjects(event: Event): void {
    event.preventDefault();
    if (!this.isHomeRoute) {
      sessionStorage.setItem('scrollToProjects', '1');
      this.router.navigateByUrl('/');
      return;
    }
    this.doScrollToProjects();
  }

  private doScrollToProjects(): void {
    const getTargetY = () => {
      const showcaseSection = document.querySelector('.skills-showcase-section') as HTMLElement;
      if (showcaseSection) {
        // Sumamos 0.5vh para sobrepasar la animación de Skills y que el telón esté totalmente desplegado
        return showcaseSection.getBoundingClientRect().top + window.scrollY + (window.innerHeight * 0.5);
      }
      return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    };

    if (this.showIntro) {
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
        setTimeout(() => {
          this.isTransitioning = false;
          this.scrollMode = 'main';
          const target = getTargetY();
          this.currentScrollY = target;
          this.targetScrollY = target;
          window.scrollTo(0, target);
          this.startVirtualScroll(true);
        }, 600);
      }, 100);
    } else {
      this.scrollMode = 'main';
      const target = getTargetY();
      this.currentScrollY = target;
      this.targetScrollY = target;
      window.scrollTo(0, target);
      if (!this.virtualScrollEnabled) this.startVirtualScroll();
    }
  }

  returnToHome(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.isAdminRoute) {
      this.exitAdmin();
      return;
    }
    sessionStorage.setItem('authReturn', '1');
    this.router.navigateByUrl('/');
  }

  enterAdmin(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    sessionStorage.setItem('preAdminState', JSON.stringify({
      showIntro: this.showIntro,
      scrollY: window.scrollY
    }));
    this.router.navigateByUrl('/admin');
  }

  exitAdmin(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const saved = sessionStorage.getItem('preAdminState');
    sessionStorage.removeItem('preAdminState');
    sessionStorage.setItem('authReturn', '1');
    if (saved) {
      sessionStorage.setItem('preAuthState', saved);
    }
    window.location.href = '/';
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
