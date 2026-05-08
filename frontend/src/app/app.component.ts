import {
  Component, OnInit, OnDestroy, ChangeDetectorRef,
  Inject, PLATFORM_ID, HostListener, ViewChild
} from '@angular/core';
import { RouterOutlet, RouterModule, Router, NavigationEnd, NavigationStart } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { filter, Subscription } from 'rxjs';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { BackgroundComponent } from './components/background/background.component';
import { HomeComponent } from './components/home/home.component';
import { RevealComplexComponent } from './components/reveal-complex/reveal-complex.component';
import { TranslationService } from './services/translation.service';
import { AuthService } from './services/auth.service';
import { TrackingService } from './services/tracking.service';
import { ChatbotComponent } from './components/chatbot/chatbot.component';
import { PreloaderComponent } from './components/preloader/preloader.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterModule,
    CommonModule,
    BackgroundComponent,
    HomeComponent,
    RevealComplexComponent,
    ChatbotComponent,
    PreloaderComponent
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
  mobileMenuOpen = false;

  introScale = 1;
  introTranslateY = 0;
  introOpacity = 1;
  mainTranslateY = 100;
  overlayOpacity = 0;
  disableReveal = false;
  menuTranslateY = 0;
  introBorderRadius = 0;

  //FADE DE IMÁGENES Y FIRMA
  imageOpacity   = 1;
  firmaOpacity   = 0;
  firmaClipRight = 100;
  hoverIntensity = 1;

  //La firma solo aparece pasados 6 ticks de scroll (~100ms)
  private firmaScrollTicks = 0;
  private chatbotWasOpen = false;

  private touchStartY = 0;
  private isTransitioning = false;
  private routerSub!: Subscription;

  //SISTEMA DE SCROLL VIRTUAL (lerp + cap)
  private virtualScrollEnabled = false;
  private scrollMode: 'intro' | 'main' = 'intro';
  private targetScrollY = 0;
  private currentScrollY = 0;
  private scrollRafId: number | null = null;
  private readonly SCROLL_LERP = 0.08;
  private readonly SCROLL_SNAP_THRESHOLD = 0.5;
  private readonly INTRO_MIN_DURATION_FRAMES = 90;
  private readonly MAIN_SCROLL_LERP = 0.18;
  private readonly MAIN_SCROLL_MAX_PX_PER_FRAME = 42;

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

    //{ passive: false } para poder hacer preventDefault durante la intro
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
    const pathOnly = url.split(/[?#]/)[0];
    //`/experiencia` y `/proyectos` comparten vista con `/`; solo cambia el scroll inicial
    const isHomeAlias = pathOnly === '/experiencia' || pathOnly === '/proyectos';
    this.isHomeRoute = pathOnly === '/' || pathOnly === '' || isHomeAlias;
    this.isAdminRoute = pathOnly.startsWith('/admin');

    if (!this.isHomeRoute) {
      this.showPreloader  = false;
      this.showIntro      = false;
      this.mainTranslateY = 0;
      if (isPlatformBrowser(this.platformId)) {
        //Limpia estado residual de scroll virtual e intro para que la nueva ruta scrollee libre
        this.stopVirtualScroll();
        this.isTransitioning = false;
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

    const fromAdminFlag = sessionStorage.getItem('fromAdmin');
    if (fromAdminFlag) {
      sessionStorage.removeItem('fromAdmin');
      this.showPreloader = false;
      this.showIntro = false;
      this.mainTranslateY = 0;
      this.stopVirtualScroll();
      this.scrollMode = 'main';
      this.currentScrollY = 0;
      this.targetScrollY = 0;
      window.scrollTo(0, 0);
      requestAnimationFrame(() => {
        this.cdr.detectChanges();
        requestAnimationFrame(() => {
          window.scrollTo(0, 0);
          this.homeComponent?.initAnimations();
          setTimeout(() => {
            window.scrollTo(0, 0);
            ScrollTrigger.refresh();
          }, 120);
        });
      });
      return;
    }

    const scrollCvFlag = sessionStorage.getItem('scrollToCv');
    if (scrollCvFlag) {
      sessionStorage.removeItem('scrollToCv');
      this.showPreloader = false;
      this.showIntro = false;
      this.mainTranslateY = 0;
      setTimeout(() => {
        window.scrollTo(0, 0);
        this.homeComponent?.initAnimations();
        this.cdr.detectChanges();
        setTimeout(() => {
          ScrollTrigger.refresh();
          this.stopVirtualScroll();
          this.scrollMode = 'main';
          const targetY = this.computeCvTargetY();
          this.currentScrollY = targetY;
          this.targetScrollY = targetY;
          window.scrollTo(0, targetY);
        }, 100);
      }, 100);
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
          const targetY = this.computeProjectsTargetY();
          this.currentScrollY = targetY;
          this.targetScrollY = targetY;
          window.scrollTo(0, targetY);
          this.startVirtualScroll(true);
        }, 100);
      }, 100);
      return;
    }

    //Entrada directa por URL a `/experiencia` o `/proyectos`: salta intro y aterriza en la sección
    if (isHomeAlias) {
      this.showPreloader = false;
      this.showIntro = false;
      this.mainTranslateY = 0;
      const computeY = pathOnly === '/proyectos'
        ? () => this.computeProjectsTargetY()
        : () => this.computeExperienceTargetY();
      setTimeout(() => {
        window.scrollTo(0, 0);
        this.homeComponent?.initAnimations();
        this.cdr.detectChanges();
        setTimeout(() => {
          ScrollTrigger.refresh();
          this.stopVirtualScroll();
          const targetY = computeY();
          window.scrollTo(0, targetY);
        }, 150);
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
            //Registramos los ScrollTrigger con el viewport en 0 para capturar el pinSpacing correcto
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

  //SCROLL VIRTUAL — lerp + cap por frame

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

    //Re-clamp el target en main: el alto del documento cambia con pins/unpins de ScrollTrigger
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
    this.introBorderRadius = Math.min(phase1 * 2.5, 1) * 20;
    this.overlayOpacity  = Math.min(phase1 * 1.5, 1);
    this.introTranslateY = -(phase2 * 100);
    this.introOpacity    = 1;
    this.mainTranslateY  = 100 - (phase2 * 100);

    //Hover se atenúa linealmente con el scroll de la intro
    this.hoverIntensity = Math.max(0, 1 - phase1);

    if (scrollY > 0) {
      this.firmaScrollTicks = Math.min(this.firmaScrollTicks + 1, 100);
    } else {
      this.firmaScrollTicks = 0;
    }

    //Trazo de la firma sincronizado con el scroll (rango phase1 0.10 → 0.70)
    const firmaPhase = this.firmaScrollTicks >= 6
      ? Math.max(0, Math.min(1, (phase1 - 0.10) / 0.60))
      : 0;

    this.firmaOpacity   = firmaPhase;
    this.firmaClipRight = (1 - firmaPhase) * 100;

    this.cdr.detectChanges();
  }

  //SCROLL & TOUCH HANDLERS

  @HostListener('window:scroll')
  onScroll(): void {
    if (!isPlatformBrowser(this.platformId) || !this.isHomeRoute || this.showPreloader) return;

    const scrollY = window.scrollY;

    //Sin intro: parallax del menú lateral
    if (!this.showIntro) {
      this.menuTranslateY = -scrollY;
      this.cdr.detectChanges();
      return;
    }
    //Durante la intro, el scroll virtual se encarga via applyIntroScroll
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

    //Wheel sobre el chatbot: redirigir al panel de mensajes
    if (this.isCursorInsideChatbot(event)) {
      event.preventDefault();
      event.stopPropagation();
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

    //Resync del scroll virtual al cerrar el chatbot
    if (this.chatbotWasOpen) {
      this.chatbotWasOpen = false;
      this.currentScrollY = window.scrollY;
      this.targetScrollY = window.scrollY;
    }

    //Bloquear scroll nativo durante el preloader
    if (this.showPreloader) {
      event.preventDefault();
      return;
    }

    //Return-to-intro: scroll up en el top de la home
    if (!this.showIntro && this.currentScrollY <= 0 && event.deltaY < -40 && !this.isTransitioning) {
      event.preventDefault();
      this.returnToIntro();
      const vh = window.innerHeight;
      const maxScroll = 2 * vh + 10;
      this.targetScrollY = Math.max(0, Math.min(this.targetScrollY + event.deltaY, maxScroll));
      return;
    }

    //Intro: scroll virtual obligatorio
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

    //Excepción: lista interna de proyectos absorbe el delta antes de mover el documento
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

  //Si el target está sobre `.showcase-list` y aún hay scroll interno, lo absorbe ahí
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

    if ((event.target as HTMLElement)?.closest('.chatbot-panel, .chatbot-toggle')) {
      this.chatbotWasOpen = true;
      return;
    }

    if (this.chatbotWasOpen) {
      this.chatbotWasOpen = false;
      this.currentScrollY = window.scrollY;
      this.targetScrollY = window.scrollY;
    }

    if (this.showPreloader) {
      event.preventDefault();
      return;
    }

    //Return-to-intro vía swipe down en el top
    if (!this.showIntro && this.currentScrollY <= 0 && event.touches.length > 0 && !this.isTransitioning) {
      const touchEndY = event.touches[0].clientY;
      if (touchEndY - this.touchStartY > 80) {
        event.preventDefault();
        this.returnToIntro();
        const vh = window.innerHeight;
        const maxScroll = 2 * vh + 10;
        const delta = this.touchStartY - touchEndY;
        this.touchStartY = touchEndY;
        this.targetScrollY = Math.max(0, Math.min(this.targetScrollY + delta * 2, maxScroll));
        return;
      }
    }

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

    if (this.isTransitioning || event.touches.length === 0) {
      event.preventDefault();
      return;
    }

    const touchCurrentY = event.touches[0].clientY;
    const delta = this.touchStartY - touchCurrentY;
    this.touchStartY = touchCurrentY;

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
    this.firmaScrollTicks = 0;

    this.homeComponent?.resetAnimations();

    this.stopVirtualScroll();
    this.scrollMode = 'intro';

    this.showIntro = true;
    this.cdr.detectChanges();

    const vh = window.innerHeight;
    const startPos = Math.floor(2 * vh) - 50;
    window.scrollTo(0, startPos);

    this.currentScrollY = startPos;
    this.targetScrollY = startPos;
    this.applyIntroScroll(startPos);

    this.startVirtualScroll(false);
  }

  scrollToCv(event: Event): void {
    event.preventDefault();
    if (!this.isHomeRoute) {
      sessionStorage.setItem('scrollToCv', '1');
      this.router.navigateByUrl('/');
      return;
    }
    this.doScrollToCv();
  }

  private doScrollToCv(): void {
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
          const target = this.computeCvTargetY();
          this.currentScrollY = target;
          this.targetScrollY = target;
          window.scrollTo(0, target);
        }, 600);
      }, 100);
    } else {
      this.stopVirtualScroll();
      this.scrollMode = 'main';
      const target = this.computeCvTargetY();
      this.currentScrollY = target;
      this.targetScrollY = target;
      window.scrollTo(0, target);
    }
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
    const getTargetY = () => this.computeProjectsTargetY();

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
    this.router.navigateByUrl('/admin');
  }

  //Hard reload directo a `/` para que el home se reconstruya desde cero al salir del admin
  exitAdmin(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    sessionStorage.removeItem('preAdminState');
    sessionStorage.removeItem('preAuthState');
    sessionStorage.removeItem('authReturn');
    sessionStorage.removeItem('scrollToCv');
    sessionStorage.removeItem('scrollToProjects');
    sessionStorage.setItem('fromAdmin', '1');
    window.location.href = '/';
  }

  //Centra el `.hero-avatar` en el viewport (resultado típicamente cercano a 0)
  private computeCvTargetY(): number {
    if (!isPlatformBrowser(this.platformId)) return 0;
    const avatar = document.querySelector('.hero-avatar') as HTMLElement | null;
    if (avatar) {
      const rect = avatar.getBoundingClientRect();
      const center = rect.top + window.scrollY + rect.height / 2;
      return Math.max(0, center - window.innerHeight / 2);
    }
    return 0;
  }

  //Top del telón de proyectos (la lista vive en flujo normal en todas las anchuras)
  private computeProjectsTargetY(): number {
    if (!isPlatformBrowser(this.platformId)) return 0;
    const curtain = document.querySelector('.sp-projects-curtain') as HTMLElement | null;
    if (curtain) {
      return curtain.getBoundingClientRect().top + window.scrollY;
    }
    const showcaseSection = document.querySelector('.skills-showcase-section') as HTMLElement | null;
    if (showcaseSection) {
      return showcaseSection.getBoundingClientRect().top + window.scrollY;
    }
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  //Top de la `.exp-scroll-section` para que el pin horizontal arranque desde el principio
  private computeExperienceTargetY(): number {
    if (!isPlatformBrowser(this.platformId)) return 0;
    const expSection = document.querySelector('.exp-scroll-section') as HTMLElement | null;
    if (expSection) {
      return expSection.getBoundingClientRect().top + window.scrollY;
    }
    return 0;
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
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
