import {
  Component, OnInit, OnDestroy, Inject, PLATFORM_ID,
  ChangeDetectorRef, ElementRef, ViewChild, EventEmitter, Output,
  HostListener
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Subscription } from 'rxjs';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ProjectService, resolveApiAssetUrl } from '../../services/project.service';
import { TranslationService } from '../../services/translation.service';

type ProjectFilterId = 'all' | 'web' | 'android' | 'ai' | 'other';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.css']
})
export class ProjectsComponent implements OnInit, OnDestroy {
  @ViewChild('showcaseList') showcaseList!: ElementRef;
  @Output() loaded = new EventEmitter<any[]>();

  //Datos
  projects: any[] = [];
  errorMessage = '';

  //Filtro por tipo de proyecto
  projectFilters: { id: ProjectFilterId; labelKey: string }[] = [
    { id: 'all',     labelKey: 'projects.filter.all' },
    { id: 'web',     labelKey: 'projects.filter.web' },
    { id: 'android', labelKey: 'projects.filter.android' },
    { id: 'ai',      labelKey: 'projects.filter.ai' },
  ];
  activeFilter: ProjectFilterId = 'all';

  openQrId: number | null = null;
  caseProject: any = null;
  lightboxOpen = false;

  carouselIndex: Record<number, number> = {};
  private static readonly CASE_KEY = -1;

  private langSub!: Subscription;

  constructor(
    private projectService: ProjectService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
    public i18n: TranslationService
  ) {}

  ngOnInit(): void {
    this.langSub = this.i18n.lang$.subscribe(() => this.cdr.detectChanges());

    this.projectService.getFeaturedProjects().subscribe({
      next: (data) => {
        this.projects = data ?? [];
        this.cdr.detectChanges();
        if (isPlatformBrowser(this.platformId)) {
          ScrollTrigger.refresh();
        }
        this.loaded.emit(this.projects);
      },
      error: (err) => {
        console.error('Error de red al cargar proyectos:', err);
        this.errorMessage = 'Error al cargar los proyectos.';
        this.cdr.detectChanges();
        this.loaded.emit([]);
      }
    });
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
    }
  }

  @HostListener('document:click')
  onDocClick(): void {
    if (this.openQrId !== null) {
      this.openQrId = null;
      this.cdr.detectChanges();
    }
  }

  scrollToTop(event: Event): void {
    event.preventDefault();
    window.dispatchEvent(new CustomEvent('scrollToTop'));
  }

  //Helpers para la vitrina de proyectos

  /* QR */
  qrUrl(project: any): string {
    const target = project?.live_url || project?.repo_url ||
      (isPlatformBrowser(this.platformId) ? window.location.origin : '');
    return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=6&data=${encodeURIComponent(target)}`;
  }

  getType(project: any): ProjectFilterId {
    const t = (project?.project_type || '').toLowerCase();
    if (t === 'android' || t === 'ai' || t === 'other' || t === 'web') return t;
    return 'web';
  }

  get filteredProjects(): any[] {
    if (this.activeFilter === 'all') return this.projects;
    return this.projects.filter(p => this.getType(p) === this.activeFilter);
  }

  setFilter(id: ProjectFilterId): void {
    if (this.activeFilter === id) return;
    this.activeFilter = id;
    this.openQrId = null;
    if (isPlatformBrowser(this.platformId)) {
      // Reposiciona ScrollTrigger porque el alto del listado puede cambiar.
      setTimeout(() => ScrollTrigger.refresh(), 0);
    }
  }

  countByFilter(id: ProjectFilterId): number {
    if (id === 'all') return this.projects.length;
    return this.projects.filter(p => this.getType(p) === id).length;
  }

  get projectsYearRange(): string {
    const years = this.projects
      .map(p => p?.project_date ? this.toDate(p.project_date).getFullYear() : NaN)
      .filter(y => Number.isFinite(y));
    if (years.length === 0) return '';
    const min = Math.min(...years);
    const max = Math.max(...years);
    return min === max ? `${min}` : `${min}-${max}`;
  }

  private toDate(val: any): Date {
    if (!val) return new Date(NaN);
    if (val instanceof Date) return val;
    return new Date(String(val).substring(0, 10) + 'T00:00:00');
  }

  shortUrl(url?: string): string {
    if (!url) return 'localhost';
    try {
      const u = new URL(url);
      const host = u.host.replace(/^www\./, '');
      const path = u.pathname.length > 1 ? u.pathname : '';
      const full = `${host}${path}`;
      return full.length > 38 ? full.slice(0, 35) + '…' : full;
    } catch {
      return url.length > 38 ? url.slice(0, 35) + '…' : url;
    }
  }

  techIcon(rawTag: string): string {
    if (!rawTag) return '';
    const tag = rawTag.trim().toLowerCase();
    const slug = TECH_ICON_MAP[tag];
    if (!slug) return '';
    return `https://cdn.simpleicons.org/${slug}/007bff`;
  }

  //Carrusel de capturas

  imagesFor(project: any): { url: string }[] {
    if (!project) return [];
    const arr = Array.isArray(project.images) ? project.images : [];
    return arr
      .filter((img: any) => img && typeof img.url === 'string' && img.url.length > 0)
      .map((img: any) => ({ url: resolveApiAssetUrl(img.url) }));
  }

  activeImageIndex(project: any, key?: number): number {
    const k = (key !== undefined) ? key : (project?.id ?? 0);
    return this.carouselIndex[k] ?? 0;
  }

  prevImage(project: any, event?: Event, key?: number): void {
    if (event) { event.stopPropagation(); }
    const total = this.imagesFor(project).length;
    if (total <= 1) return;
    const k = (key !== undefined) ? key : (project?.id ?? 0);
    const cur = this.carouselIndex[k] ?? 0;
    this.carouselIndex[k] = (cur - 1 + total) % total;
  }

  nextImage(project: any, event?: Event, key?: number): void {
    if (event) { event.stopPropagation(); }
    const total = this.imagesFor(project).length;
    if (total <= 1) return;
    const k = (key !== undefined) ? key : (project?.id ?? 0);
    const cur = this.carouselIndex[k] ?? 0;
    this.carouselIndex[k] = (cur + 1) % total;
  }

  goToImage(project: any, idx: number, event?: Event, key?: number): void {
    if (event) { event.stopPropagation(); }
    const total = this.imagesFor(project).length;
    if (idx < 0 || idx >= total) return;
    const k = (key !== undefined) ? key : (project?.id ?? 0);
    this.carouselIndex[k] = idx;
  }

  trackByImageIdx(index: number): number {
    return index;
  }

  lightboxImage(): string | null {
    if (!this.caseProject) return null;
    const imgs = this.imagesFor(this.caseProject);
    if (imgs.length === 0) return null;
    const idx = this.activeImageIndex(this.caseProject, ProjectsComponent.CASE_KEY);
    return imgs[Math.min(Math.max(0, idx), imgs.length - 1)]?.url ?? null;
  }

  //Acciones de la card

  toggleQr(project: any, event: Event): void {
    event.stopPropagation();
    this.openQrId = this.openQrId === project.id ? null : project.id;
  }

  openCase(project: any): void {
    this.caseProject = project;
    this.openQrId = null;
    this.carouselIndex[ProjectsComponent.CASE_KEY] = 0;
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'hidden';
    }
  }

  closeCase(): void {
    this.caseProject = null;
    this.lightboxOpen = false;
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
    }
  }

  openLightbox(event?: Event): void {
    if (event) { event.stopPropagation(); }
    if (!this.caseProject) return;
    if (this.imagesFor(this.caseProject).length === 0) return;
    this.lightboxOpen = true;
  }

  closeLightbox(event?: Event): void {
    if (event) { event.stopPropagation(); }
    this.lightboxOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.lightboxOpen) { this.lightboxOpen = false; this.cdr.detectChanges(); return; }
    if (this.caseProject) this.closeCase();
    if (this.openQrId !== null) {
      this.openQrId = null;
      this.cdr.detectChanges();
    }
  }

  @HostListener('document:keydown.arrowleft', ['$event'])
  onArrowLeft(event: Event): void {
    if (this.lightboxOpen && this.caseProject) {
      event.preventDefault();
      this.prevImage(this.caseProject, undefined, ProjectsComponent.CASE_KEY);
    }
  }

  @HostListener('document:keydown.arrowright', ['$event'])
  onArrowRight(event: Event): void {
    if (this.lightboxOpen && this.caseProject) {
      event.preventDefault();
      this.nextImage(this.caseProject, undefined, ProjectsComponent.CASE_KEY);
    }
  }
}

// Mapeo manual tag → slug de simple-icons (cdn.simpleicons.org).
const TECH_ICON_MAP: Record<string, string> = {
  'angular': 'angular',
  'typescript': 'typescript',
  'javascript': 'javascript',
  'js': 'javascript',
  'node.js': 'nodedotjs',
  'nodejs': 'nodedotjs',
  'node': 'nodedotjs',
  'react': 'react',
  'react.js': 'react',
  'vue': 'vuedotjs',
  'next.js': 'nextdotjs',
  'nextjs': 'nextdotjs',
  'html': 'html5',
  'html5': 'html5',
  'css': 'css',
  'css3': 'css',
  'html5/css3': 'html5',
  'sass': 'sass',
  'tailwind': 'tailwindcss',
  'tailwindcss': 'tailwindcss',
  'bootstrap': 'bootstrap',
  'python': 'python',
  'java': 'openjdk',
  'kotlin': 'kotlin',
  'android': 'android',
  'flutter': 'flutter',
  'dart': 'dart',
  'mysql': 'mysql',
  'sql': 'mysql',
  'postgres': 'postgresql',
  'postgresql': 'postgresql',
  'mongodb': 'mongodb',
  'redis': 'redis',
  'docker': 'docker',
  'aws': 'amazonwebservices',
  'gcp': 'googlecloud',
  'azure': 'microsoftazure',
  'firebase': 'firebase',
  'github': 'github',
  'git': 'git',
  'gitlab': 'gitlab',
  'linux': 'linux',
  'express': 'express',
  'express.js': 'express',
  'django': 'django',
  'flask': 'flask',
  'fastapi': 'fastapi',
  'spring': 'spring',
  'laravel': 'laravel',
  'php': 'php',
  'tensorflow': 'tensorflow',
  'pytorch': 'pytorch',
  'scikit-learn': 'scikitlearn',
  'pandas': 'pandas',
  'numpy': 'numpy',
  'openai': 'openai',
  'openai api': 'openai',
  'langchain': 'langchain',
  'llms': 'openai',
  'rags': 'openai',
  'llamaindex': 'openai',
  'machine learning': 'tensorflow',
  'power bi': 'powerbi',
  'jmeter': 'apachejmeter',
  'postman': 'postman',
  'soapui': 'soapui',
  'grafana': 'grafana',
  'influxdb': 'influxdb',
  'rest apis': 'openapiinitiative',
  'figma': 'figma',
  'three.js': 'threedotjs',
  'gsap': 'greensock',
};
