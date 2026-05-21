import {
  Component, OnInit, AfterViewInit, OnDestroy, Inject, PLATFORM_ID,
  ChangeDetectorRef, ElementRef, ViewChildren, ViewChild, QueryList,
  HostListener
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TranslationService } from '../../services/translation.service';
import { BackgroundThemeService } from '../../services/background-theme.service';
import { ProfileService } from '../../services/profile.service';
import { ProjectsComponent } from '../projects/projects.component';
import { ExperienceComponent } from '../experience/experience.component';
import { techIcon, hideIconOnError } from '../../utils/tech-icons';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ProjectsComponent, ExperienceComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChildren('cvSection') cvSections!: QueryList<ElementRef>;
  @ViewChildren('eduEl')     eduEls!:     QueryList<ElementRef>;
  @ViewChild(ExperienceComponent) experienceComponent?: ExperienceComponent;
  @ViewChild('heroTitleEl') heroTitleEl?: ElementRef<HTMLElement>;

  // Listas públicas
  educations: any[] = [];
  skills: any[] = [];

  //Listas alimentadas por los sub-componentes — solo para el typewriter del hero
  private projects: any[] = [];
  private experiences: any[] = [];

  photoUrl = '';

  //TYPEWRITER DEL HERO
  //Cada entrada es el bloque de tags completo de un proyecto/experiencia
  private tagGroups: string[] = [];
  typedRole = '';
  private typewriterTimer: any = null;
  private twMeasureCanvas: HTMLCanvasElement | null = null;

  cvMenuOpen = false;

  downloadCv(lang: 'es' | 'en'): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const filename = lang === 'es'
      ? 'CV_ES_JoseMiguelVivasSanchez.pdf'
      : 'CV_EN_JoseMiguelVivasSanchez.pdf';
    const url = `${environment.apiUrl}/profile/cv/${lang}`;
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      })
      .catch(err => {
        console.error('CV download failed:', err);
        window.open(url, '_blank');
      })
      .finally(() => {
        this.cvMenuOpen = false;
        this.cdr.detectChanges();
      });
  }

  private resizeListener: (() => void) | null = null;
  private titleResizeObserver: ResizeObserver | null = null;

  private animationsInitialized = false;
  private langSub!: Subscription;

  private projectsLoaded = false;
  private experiencesLoaded = false;
  private initPending = false;

  constructor(
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
    public i18n: TranslationService,
    private theme: BackgroundThemeService,
    public profile: ProfileService,
    private http: HttpClient
  ) {
    if (isPlatformBrowser(this.platformId)) {
      gsap.registerPlugin(ScrollTrigger);
    }
  }

  ngOnInit(): void {
    this.langSub = this.i18n.lang$.subscribe(() => {
      this.cdr.detectChanges();
      if (isPlatformBrowser(this.platformId)) {
        setTimeout(() => this.fitHeroTitle(), 0);
      }
    });

    this.photoUrl = this.profile.photoUrl;
    this.profile.load().subscribe(() => {
      setTimeout(() => {
        this.photoUrl = this.profile.photoUrl;
        this.cdr.detectChanges();
      }, 0);
    });

    // Peticiones para la home
    this.http.get<any[]>(`${environment.apiUrl}/education`).subscribe(res => {
      this.educations = res;
      this.cdr.detectChanges();
    });
    this.http.get<any[]>(`${environment.apiUrl}/skills`).subscribe(res => {
      this.skills = res;
      this.cdr.detectChanges();
    });

  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const refit = () => this.fitHeroTitle();

    requestAnimationFrame(refit);
    setTimeout(refit, 100);
    setTimeout(refit, 500);
    const fonts = (document as any).fonts;
    if (fonts?.ready?.then) fonts.ready.then(refit);

    this.resizeListener = refit;
    window.addEventListener('resize', this.resizeListener, { passive: true });

    const el = this.heroTitleEl?.nativeElement;
    const parent = el?.parentElement;
    if (parent && typeof ResizeObserver !== 'undefined') {
      this.titleResizeObserver = new ResizeObserver(refit);
      this.titleResizeObserver.observe(parent);
    }
  }

  private fitHeroTitle(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const el = this.heroTitleEl?.nativeElement;
    if (!el) return;

    if (window.innerWidth > 980) {
      el.style.fontSize = '';
      el.style.whiteSpace = '';
      return;
    }

    const available = el.clientWidth;
    if (available <= 0) return;

    el.style.whiteSpace = 'nowrap';
    el.style.fontSize = '100px';
    void el.offsetWidth;
    const natural = el.scrollWidth;

    if (natural > 0) {
      const target = (available / natural) * 100;
      const capped = Math.max(14, Math.min(target, 96));
      el.style.fontSize = `${capped}px`;
    } else {
      el.style.fontSize = '';
    }
  }

  //Cierra el menú del CV al hacer click fuera
  @HostListener('document:click')
  onDocClick(): void {
    if (this.cvMenuOpen) {
      this.cvMenuOpen = false;
      this.cdr.detectChanges();
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
    let full = '';   //grupo actual ya recortado a una sola línea

    const TYPE_MS   = 55;
    const DELETE_MS = 25;
    const HOLD_MS   = 1800;
    const PAUSE_MS  = 350;

    const tick = () => {
      if (idx >= this.tagGroups.length) idx = 0;

      //Al arrancar un grupo nuevo recalculamos qué tags caben en una sola línea
      if (!deleting && charIdx === 0) {
        full = this.fitTypewriterGroup(this.tagGroups[idx]);
      }

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

  //Recorta un grupo de tags a los que caben en una sola línea del typewriter
  //visible (masthead móvil o hero de escritorio). Los que no caben se omiten.
  private fitTypewriterGroup(group: string): string {
    if (!isPlatformBrowser(this.platformId)) return group;

    //Elige el typewriter que esté visible en este momento
    const variants = [
      { text: '.hm-tw-text',           label: '.hm-tw-label',           caret: '.hm-tw-caret' },
      { text: '.hero-typewriter-text', label: '.hero-typewriter-label', caret: '.hero-typewriter-caret' },
    ];
    let textEl: HTMLElement | null = null;
    let v: (typeof variants)[number] | null = null;
    for (const candidate of variants) {
      const el = document.querySelector(candidate.text) as HTMLElement | null;
      if (el && el.offsetParent !== null) { textEl = el; v = candidate; break; }
    }
    const twEl = textEl?.parentElement ?? null;
    if (!textEl || !twEl || !v) return group;

    const tags = group.split('·').map(t => t.trim()).filter(Boolean);
    if (tags.length <= 1) return group;

    const gap = parseFloat(getComputedStyle(twEl).columnGap) || 0;
    const labelEl = twEl.querySelector(v.label) as HTMLElement | null;
    const caretEl = twEl.querySelector(v.caret) as HTMLElement | null;

    let avail = twEl.clientWidth - 2;
    if (labelEl) avail -= labelEl.offsetWidth + gap;
    if (caretEl) avail -= caretEl.offsetWidth + gap;
    if (avail <= 0) return tags[0];

    if (!this.twMeasureCanvas) this.twMeasureCanvas = document.createElement('canvas');
    const ctx = this.twMeasureCanvas.getContext('2d');
    if (!ctx) return group;

    const ts = getComputedStyle(textEl);
    ctx.font = `${ts.fontStyle} ${ts.fontWeight} ${ts.fontSize} ${ts.fontFamily}`;
    const letterSpacing = parseFloat(ts.letterSpacing) || 0;
    const upper = ts.textTransform === 'uppercase';
    const widthOf = (s: string): number => {
      const txt = upper ? s.toUpperCase() : s;
      return ctx.measureText(txt).width + letterSpacing * txt.length;
    };

    let fitted = tags[0];
    for (let i = 1; i < tags.length; i++) {
      const candidate = `${fitted} · ${tags[i]}`;
      if (widthOf(candidate) > avail) break;
      fitted = candidate;
    }
    return fitted;
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
    this.stopTypewriter();
    ScrollTrigger.getAll().forEach(t => t.kill(true));
    this.theme.setProgress(0);
    if (isPlatformBrowser(this.platformId) && this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
      this.resizeListener = null;
    }
    if (this.titleResizeObserver) {
      this.titleResizeObserver.disconnect();
      this.titleResizeObserver = null;
    }
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
    gsap.set('.section-header-cv, .about-card, .edu-card', {
      clearProps: 'all'
    });
    this.experienceComponent?.resetAnimations();
    this.theme.setProgress(0);
    if (isPlatformBrowser(this.platformId)) {
      document.documentElement.classList.remove('dark-scroll-active');
    }
    this.animationsInitialized = false;
  }

  getSkillTags(type: string): string[] {
    const skill = this.skills.find(s => s.tipo === type);
    if (!skill || !skill.tags) return [];
    try {
      return typeof skill.tags === 'string' ? JSON.parse(skill.tags) : skill.tags;
    } catch { return []; }
  }

  techIcon(tag: string): string {
    return techIcon(tag);
  }

  hideIconOnError(event: Event): void {
    hideIconOnError(event);
  }

  toRoman(n: number): string {
    const map: [number, string][] = [
      [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']
    ];
    let result = '';
    let value = Math.max(0, Math.floor(n));
    for (const [num, sym] of map) {
      while (value >= num) { result += sym; value -= num; }
    }
    return result;
  }

  formatSkillCount(n: number): string {
    return n.toString().padStart(2, '0');
  }
}