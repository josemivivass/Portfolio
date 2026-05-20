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
import { TranslationService } from './services/translation.service';
import { AuthService } from './services/auth.service';
import { TrackingService } from './services/tracking.service';
import { ChatbotComponent } from './components/chatbot/chatbot.component';
import { PreloaderComponent } from './components/preloader/preloader.component';

type SectionId = 'hero' | 'about' | 'experience' | 'education' | 'skills';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterModule,
    CommonModule,
    BackgroundComponent,
    HomeComponent,
    ChatbotComponent,
    PreloaderComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild(HomeComponent) homeComponent?: HomeComponent;

  showPreloader = true;

  isLoggedIn = false;
  canAccessAdmin = false;
  isHomeRoute = true;
  isAdminRoute = false;
  mobileMenuOpen = false;
  activeSection: SectionId = 'hero';

  menuTranslateY = 0;

  private chatbotWasOpen = false;
  private touchStartY = 0;
  private isTransitioning = false;
  private routerSub!: Subscription;

  //SISTEMA DE SCROLL VIRTUAL (lerp + cap)
  private virtualScrollEnabled = false;
  private targetScrollY = 0;
  private currentScrollY = 0;
  private scrollRafId: number | null = null;
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
          scrollY: window.scrollY
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
    this.isHomeRoute = pathOnly === '/' || pathOnly === '';
    this.isAdminRoute = pathOnly.startsWith('/admin');

    if (isPlatformBrowser(this.platformId)) {
      const showBar = this.isHomeRoute || this.isAdminRoute;
      document.documentElement.classList.toggle('home-route', showBar);
    }

    if (!this.isHomeRoute) {
      this.showPreloader = false;
      if (isPlatformBrowser(this.platformId)) {
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
      this.stopVirtualScroll();
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
      setTimeout(() => {
        window.scrollTo(0, 0);
        this.homeComponent?.initAnimations();
        this.cdr.detectChanges();
        setTimeout(() => {
          ScrollTrigger.refresh();
          this.stopVirtualScroll();
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
      setTimeout(() => {
        window.scrollTo(0, 0);
        this.homeComponent?.initAnimations();
        this.cdr.detectChanges();
        setTimeout(() => {
          ScrollTrigger.refresh();
          const targetY = this.computeProjectsTargetY();
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

      const savedScrollY = savedStr ? (JSON.parse(savedStr).scrollY ?? 0) : 0;

      setTimeout(() => {
        window.scrollTo(0, 0);
        this.homeComponent?.initAnimations();
        this.cdr.detectChanges();
        requestAnimationFrame(() => {
          window.scrollTo({ top: savedScrollY, behavior: 'instant' });
          ScrollTrigger.refresh();
        });
      }, 60);
      return;
    }

    if (this.showPreloader) {
      setTimeout(() => {
        this.showPreloader = false;
        window.scrollTo(0, 0);
        this.homeComponent?.initAnimations();
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

    // Re-clamp el target
    const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    if (this.targetScrollY > maxY) this.targetScrollY = maxY;

    const diff = this.targetScrollY - this.currentScrollY;

    if (Math.abs(diff) > 0.5) {
      let step = diff * this.MAIN_SCROLL_LERP;
      if (Math.abs(step) > this.MAIN_SCROLL_MAX_PX_PER_FRAME) {
        step = Math.sign(step) * this.MAIN_SCROLL_MAX_PX_PER_FRAME;
      }
      this.currentScrollY += step;
      window.scrollTo(0, this.currentScrollY);
      
      // Mantenemos el bucle vivo mientras haya movimiento
      this.scrollRafId = requestAnimationFrame(() => this.tickVirtualScroll());
    } else {
      // Movimiento completado: ajustamos al valor exacto y APAGAMOS el bucle
      this.currentScrollY = this.targetScrollY;
      window.scrollTo(0, this.currentScrollY);
      this.stopVirtualScroll();
    }
  }

  //SCROLL & TOUCH HANDLERS

  @HostListener('window:scroll')
  onScroll(): void {
    if (!isPlatformBrowser(this.platformId) || !this.isHomeRoute || this.showPreloader) return;

    this.menuTranslateY = -window.scrollY;
    this.updateActiveSection();
    this.cdr.detectChanges();

    // Tolerancia ampliada a 10px para evitar falsos positivos por decimales del navegador
    if (Math.abs(window.scrollY - this.currentScrollY) > 10) {
      this.stopVirtualScroll();
      this.currentScrollY = window.scrollY;
      this.targetScrollY = window.scrollY;
    }
  }

  private updateActiveSection(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const ids: SectionId[] = ['hero', 'about', 'experience', 'education', 'skills'];
    const offsets: Array<{ id: SectionId; y: number }> = [];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      offsets.push({ id, y: rect.top + window.scrollY });
    }
    if (!offsets.length) return;
    const probe = window.scrollY + window.innerHeight * 0.35;
    let current: SectionId = offsets[0].id;
    for (const o of offsets) {
      if (probe >= o.y) current = o.id;
    }
    if (current !== this.activeSection) {
      this.activeSection = current;
    }
  }

  scrollToSection(id: SectionId): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.isHomeRoute) {
      sessionStorage.setItem('scrollToCv', '1');
      this.router.navigateByUrl('/');
      return;
    }
    const el = document.getElementById(id);
    if (!el) return;
    this.stopVirtualScroll();
    const targetY = id === 'hero' ? 0 : Math.max(0, el.getBoundingClientRect().top + window.scrollY);
    this.currentScrollY = targetY;
    this.targetScrollY = targetY;
    window.scrollTo(0, targetY);
  }

  setLang(lang: 'es' | 'en'): void {
    if (this.i18n.lang !== lang) {
      this.i18n.toggle();
    }
  }

  onWheel(event: WheelEvent): void {
    if (!isPlatformBrowser(this.platformId) || !this.isHomeRoute) return;

    if (document.body.classList.contains('lightbox-open')) return;

    if (this.isCursorInsideChatbot(event)) {
      event.preventDefault();
      event.stopPropagation();
      const target = event.target as HTMLElement;
      if (!target.closest('.chatbot-input-area')) {
        const msgContainer = document.querySelector('.chatbot-messages') as HTMLElement;
        if (msgContainer) msgContainer.scrollTop += event.deltaY;
      }
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

    if (this.scrollableContainerAbsorbs(event.target as HTMLElement, event.deltaY)) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    if (this.isTransitioning) return;

    if (!this.virtualScrollEnabled) {
      this.currentScrollY = window.scrollY;
      this.targetScrollY = window.scrollY;
    }

    let delta = event.deltaY;
    if (event.deltaMode === 1) delta *= 33;
    else if (event.deltaMode === 2) delta *= window.innerHeight;

    const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    this.targetScrollY = Math.max(0, Math.min(this.targetScrollY + delta, maxY));

    if (!this.virtualScrollEnabled) {
      this.startVirtualScroll(false);
    }
  }

  //El visor de notebook (.nb) y el telón (.showcase-list) tienen scroll propio.
  private scrollableContainerAbsorbs(target: HTMLElement | null, deltaY: number): boolean {
    if (!target || deltaY === 0) return false;

    // El notebook embebido tiene prioridad: si aún puede scrollear, el scroll va ahí.
    const nb = target.closest('.nb') as HTMLElement | null;
    if (nb) {
      const nbAtTop = nb.scrollTop <= 0;
      const nbAtBottom = nb.scrollTop + nb.clientHeight >= nb.scrollHeight - 1;
      if (!((deltaY > 0 && nbAtBottom) || (deltaY < 0 && nbAtTop))) {
        nb.scrollTop += deltaY;
        return true;
      }
    }

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

    if (document.body.classList.contains('lightbox-open')) return;

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

    if (!this.virtualScrollEnabled) {
      this.currentScrollY = window.scrollY;
      this.targetScrollY = window.scrollY;
    }

    const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    this.targetScrollY = Math.max(0, Math.min(this.targetScrollY + delta * 2, maxY));

    if (!this.virtualScrollEnabled) {
      this.startVirtualScroll(false);
    }
  }

  private isCursorInsideChatbot(event: WheelEvent): boolean {
    const target = event.target as HTMLElement;
    if (!target) return false;
    if (target.closest('app-chatbot, .chatbot-panel, .chatbot-toggle, .chatbot-input-area')) return true;
    return false;
  }

  scrollToCv(event: Event): void {
    event.preventDefault();
    if (!this.isHomeRoute) {
      sessionStorage.setItem('scrollToCv', '1');
      this.router.navigateByUrl('/');
      return;
    }
    this.stopVirtualScroll();
    const target = this.computeCvTargetY();
    this.currentScrollY = target;
    this.targetScrollY = target;
    window.scrollTo(0, target);
  }

  scrollToProjects(event: Event): void {
    event.preventDefault();
    if (!this.isHomeRoute) {
      sessionStorage.setItem('scrollToProjects', '1');
      this.router.navigateByUrl('/');
      return;
    }
    const target = this.computeProjectsTargetY();
    this.currentScrollY = target;
    this.targetScrollY = target;
    window.scrollTo(0, target);
    if (!this.virtualScrollEnabled) this.startVirtualScroll();
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

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!isPlatformBrowser(this.platformId) || !this.isHomeRoute || this.showPreloader) return;
    if (this.isTransitioning) return;

    const target = event.target as HTMLElement;
    if (target.tagName.toLowerCase() === 'input' || target.tagName.toLowerCase() === 'textarea') return;

    let delta = 0;
    const scrollAmount = 100;
    const pageAmount = window.innerHeight * 0.8;

    if (!this.virtualScrollEnabled) {
      this.currentScrollY = window.scrollY;
      this.targetScrollY = window.scrollY;
    }

    switch (event.key) {
      case 'ArrowUp': delta = -scrollAmount; break;
      case 'ArrowDown': delta = scrollAmount; break;
      case 'PageUp': delta = -pageAmount; break;
      case 'PageDown': delta = pageAmount; break;
      case ' ': delta = event.shiftKey ? -pageAmount : pageAmount; break;
      case 'Home': delta = -this.targetScrollY; break;
      case 'End': 
        delta = Math.max(0, document.documentElement.scrollHeight - window.innerHeight) - this.targetScrollY; 
        break;
      default: return;
    }

    event.preventDefault();

    const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    this.targetScrollY = Math.max(0, Math.min(this.targetScrollY + delta, maxY));

    if (!this.virtualScrollEnabled) {
      this.startVirtualScroll(false);
    }
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.setItem('authReturn', '1');
      sessionStorage.setItem('preAuthState', JSON.stringify({
        scrollY: window.scrollY
      }));
      localStorage.removeItem('token');
      window.location.reload();
    }
  }
}
