import {
  Component, OnInit, OnDestroy, Inject, PLATFORM_ID,
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

  cvMenuOpen = false;

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
    this.langSub = this.i18n.lang$.subscribe(() => this.cdr.detectChanges());

    this.photoUrl = this.profile.photoUrl;
    this.profile.load().subscribe(() => {
      setTimeout(() => {
        this.photoUrl = this.profile.photoUrl;
        this.cdr.detectChanges();
      }, 0);
    });

    // Peticiones para la home
    this.http.get<any[]>('http://127.0.0.1:3000/api/education').subscribe(res => {
      this.educations = res;
      this.cdr.detectChanges();
    });
    this.http.get<any[]>('http://127.0.0.1:3000/api/skills').subscribe(res => {
      this.skills = res;
      this.cdr.detectChanges();
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
}