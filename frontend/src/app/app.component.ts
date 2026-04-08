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

  private touchStartY = 0;
  private isTransitioning = false;
  private routerSub!: Subscription;

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

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

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
  }

  // ─── Scroll & touch handlers ───

  @HostListener('window:scroll')
  onScroll(): void {
    if (!isPlatformBrowser(this.platformId) || !this.isHomeRoute || this.showPreloader) return;

    const scrollY = window.scrollY;
    const vh = window.innerHeight;

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

      setTimeout(() => {
        ScrollTrigger.refresh();
        window.dispatchEvent(new Event('resize'));
        this.homeComponent?.initAnimations();

        setTimeout(() => { this.isTransitioning = false; }, 600);
      }, 100);

      return;
    }

    this.introScale      = 1 - (0.55 * phase1);
    this.overlayOpacity  = Math.min(phase1 * 1.5, 1);
    this.introTranslateY = -(phase2 * 100);
    this.introOpacity    = 1;
    this.mainTranslateY  = 100 - (phase2 * 100);
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

    this.homeComponent?.resetAnimations();

    this.showIntro = true;
    this.cdr.detectChanges();

    const vh = window.innerHeight;
    window.scrollTo(0, Math.floor(2 * vh) - 50);

    setTimeout(() => { this.isTransitioning = false; }, 500);
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
