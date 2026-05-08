import {
  Component, OnInit, OnDestroy, Inject, PLATFORM_ID,
  ChangeDetectorRef, ElementRef, ViewChildren, ViewChild, QueryList,
  HostListener
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Subscription } from 'rxjs';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TranslationService } from '../../services/translation.service';
import { BackgroundThemeService } from '../../services/background-theme.service';
import { ProfileService } from '../../services/profile.service';
import { ProjectsComponent } from '../projects/projects.component';
import { ExperienceComponent } from '../experience/experience.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ProjectsComponent, ExperienceComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  @ViewChildren('cvSection') cvSections!: QueryList<ElementRef>;
  @ViewChildren('eduEl')     eduEls!:     QueryList<ElementRef>;
  @ViewChild(ExperienceComponent) experienceComponent?: ExperienceComponent;

  //Listas alimentadas por los sub-componentes — solo para el typewriter del hero
  private projects: any[] = [];
  private experiences: any[] = [];

  photoUrl = '';

  //TYPEWRITER DEL HERO
  //Cada entrada es el bloque de tags completo de un proyecto/experiencia
  private tagGroups: string[] = [];
  typedRole = '';
  private typewriterTimer: any = null;

  cvMenuOpen = false;

  private animationsInitialized = false;
  private langSub!: Subscription;

  //SINCRONIZACIÓN URL ↔ SCROLL
  private currentRouteSegment = '/';
  private routeSyncRaf: number | null = null;

  private projectsLoaded = false;
  private experiencesLoaded = false;
  private initPending = false;

  constructor(
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
    public i18n: TranslationService,
    private theme: BackgroundThemeService,
    public profile: ProfileService
  ) {
    if (isPlatformBrowser(this.platformId)) {
      gsap.registerPlugin(ScrollTrigger);
    }
  }

  ngOnInit(): void {
    this.langSub = this.i18n.lang$.subscribe(() => this.cdr.detectChanges());

    this.photoUrl = this.profile.photoUrl;
    this.profile.load().subscribe(() => {
      setTimeout(() => {
        this.photoUrl = this.profile.photoUrl;
        this.cdr.detectChanges();
      }, 0);
    });
  }

  //Cierra el menú del CV al hacer click fuera
  @HostListener('document:click')
  onDocClick(): void {
    if (this.cvMenuOpen) {
      this.cvMenuOpen = false;
      this.cdr.detectChanges();
    }
  }

  //Sincroniza URL con la sección visible (throttle por RAF)
  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.routeSyncRaf !== null) return;
    this.routeSyncRaf = requestAnimationFrame(() => {
      this.routeSyncRaf = null;
      this.syncRouteFromScroll();
    });
  }

  private syncRouteFromScroll(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const expEl  = document.querySelector('.exp-scroll-section')  as HTMLElement | null;
    const projEl = document.querySelector('.sp-projects-curtain') as HTMLElement | null;
    const probe = window.innerHeight / 2;
    let target = '/';
    if (projEl) {
      const r = projEl.getBoundingClientRect();
      if (r.top <= probe && r.bottom >= probe) target = '/proyectos';
    }
    if (target === '/' && expEl) {
      const r = expEl.getBoundingClientRect();
      if (r.top <= probe && r.bottom >= probe) target = '/experiencia';
    }

    if (target === this.currentRouteSegment) return;
    this.currentRouteSegment = target;
    if (window.location.pathname !== target) {
      window.history.replaceState(window.history.state, '', target);
    }
  }

  onProjectsLoaded(projects: any[]): void {
    this.projects = projects ?? [];
    this.rebuildTagGroups();
    this.cdr.detectChanges();
    if (isPlatformBrowser(this.platformId)) {
      ScrollTrigger.refresh();
    }
    this.projectsLoaded = true;
    this.tryDeferredInit();
  }

  onExperienceLoaded(experiences: any[]): void {
    this.experiences = experiences ?? [];
    this.rebuildTagGroups();
    this.cdr.detectChanges();
    if (isPlatformBrowser(this.platformId)) {
      ScrollTrigger.refresh();
    }
    this.experiencesLoaded = true;
    this.tryDeferredInit();
  }

  //TYPEWRITER

  private rebuildTagGroups(): void {
    const seen = new Set<string>();
    const groups: string[] = [];

    const addGroup = (tags: any) => {
      if (!tags || typeof tags !== 'string') return;
      const parts = tags.split(',').map(t => t.trim()).filter(Boolean);
      if (parts.length === 0) return;
      const block = parts.join(' · ');
      const key = block.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      groups.push(block);
    };

    for (const p of this.projects)    addGroup(p?.tags);
    for (const e of this.experiences) addGroup(e?.tags);

    const changed =
      groups.length !== this.tagGroups.length ||
      groups.some((v, i) => v !== this.tagGroups[i]);

    if (!changed) return;
    this.tagGroups = groups;
    this.restartTypewriter();
  }

  private startTypewriter(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.tagGroups.length === 0) return;

    let idx = 0;
    let charIdx = 0;
    let deleting = false;

    const TYPE_MS   = 55;
    const DELETE_MS = 25;
    const HOLD_MS   = 1800;
    const PAUSE_MS  = 350;

    const tick = () => {
      if (idx >= this.tagGroups.length) idx = 0;
      const full = this.tagGroups[idx];

      if (!deleting) {
        charIdx++;
        this.typedRole = full.slice(0, charIdx);
        this.cdr.detectChanges();
        if (charIdx === full.length) {
          deleting = true;
          this.typewriterTimer = setTimeout(tick, HOLD_MS);
          return;
        }
        this.typewriterTimer = setTimeout(tick, TYPE_MS);
      } else {
        charIdx--;
        this.typedRole = full.slice(0, charIdx);
        this.cdr.detectChanges();
        if (charIdx === 0) {
          deleting = false;
          idx = (idx + 1) % this.tagGroups.length;
          this.typewriterTimer = setTimeout(tick, PAUSE_MS);
          return;
        }
        this.typewriterTimer = setTimeout(tick, DELETE_MS);
      }
    };

    //Setrtimeout inicial para evitar NG0100 con el ciclo de detección de cambios
    this.typewriterTimer = setTimeout(tick, 50);
  }

  private stopTypewriter(): void {
    if (this.typewriterTimer) {
      clearTimeout(this.typewriterTimer);
      this.typewriterTimer = null;
    }
  }

  private restartTypewriter(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.stopTypewriter();
    this.typedRole = '';
    this.startTypewriter();
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
    this.stopTypewriter();
    if (this.routeSyncRaf !== null) {
      cancelAnimationFrame(this.routeSyncRaf);
      this.routeSyncRaf = null;
    }
    ScrollTrigger.getAll().forEach(t => t.kill(true));
    this.theme.setProgress(0);
    if (isPlatformBrowser(this.platformId)) {
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
      html.classList.remove('dark-scroll-active');
    }
  }

  //API PÚBLICA — la llama AppComponent tras la transición intro

  initAnimations(): void {
    if (this.animationsInitialized || !isPlatformBrowser(this.platformId)) return;
    if (!this.projectsLoaded || !this.experiencesLoaded) {
      this.initPending = true;
      return;
    }
    this.animationsInitialized = true;

    //Headers de sección — fade-up
    this.cvSections.forEach((section) => {
      const el = section.nativeElement;
      const header = el.querySelector('.section-header-cv');
      if (header) {
        gsap.from(header, {
          opacity: 0, y: 30,
          duration: 0.7, ease: 'power2.out',
          scrollTrigger: { trigger: header, start: 'top 88%', toggleActions: 'play none none reverse' }
        });
      }
    });

    //About card — slide up
    const aboutCard = document.querySelector('.about-card');
    if (aboutCard) {
      gsap.from(aboutCard, {
        opacity: 0, y: 40,
        duration: 0.8, ease: 'power2.out',
        scrollTrigger: { trigger: aboutCard, start: 'top 88%', toggleActions: 'play none none reverse' }
      });
    }

    //Scroll horizontal — delegado al sub-componente experience
    this.experienceComponent?.initAnimations();

    //Education cards — scale-up con bounce
    this.eduEls.forEach((card, i) => {
      gsap.from(card.nativeElement, {
        opacity: 0, y: 40, scale: 0.95,
        duration: 0.6, delay: i * 0.12, ease: 'back.out(1.4)',
        scrollTrigger: { trigger: card.nativeElement, start: 'top 90%', toggleActions: 'play none none reverse' }
      });
    });

    ScrollTrigger.refresh();
  }

  //Reinicia init cuando los datos llegan después de la primera llamada
  private tryDeferredInit(): void {
    if (!this.initPending) return;
    if (!this.projectsLoaded || !this.experiencesLoaded) return;
    this.initPending = false;
    requestAnimationFrame(() => this.initAnimations());
  }

  resetAnimations(): void {
    ScrollTrigger.getAll().forEach(t => t.kill(true));
    gsap.set('.section-header-cv, .about-card, .edu-card, .skill-category', {
      clearProps: 'all'
    });
    this.experienceComponent?.resetAnimations();
    this.theme.setProgress(0);
    if (isPlatformBrowser(this.platformId)) {
      document.documentElement.classList.remove('dark-scroll-active');
    }
    this.animationsInitialized = false;
  }
}
