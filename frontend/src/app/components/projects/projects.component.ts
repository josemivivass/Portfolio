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
import { techIcon, hideIconOnError } from '../../utils/tech-icons';
import { parseNotebookUrl, colabUrl, notebookName } from '../../utils/notebook';
import { NotebookComponent } from '../notebook/notebook.component';

type ProjectFilterId = 'all' | 'web' | 'android' | 'ai' | 'other';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, NotebookComponent],
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
  lightboxOpen = false;
  lightboxProject: any = null;

  readonly colabMask = `url(${techIcon('colab')})`;

  // Zoom/pan en el lightbox (gestos táctiles en móvil).
  lightboxZoom = 1;
  lightboxPanX = 0;
  lightboxPanY = 0;
  private pinchStart: { distance: number; zoom: number } | null = null;
  private dragStart: { x: number; y: number; time: number; panX: number; panY: number } | null = null;

  private scrollYBeforeLightbox = 0;

  carouselIndex: Record<number, number> = {};

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
      if (this.lightboxOpen) {
        this.unlockBodyScroll();
      } else {
        document.body.style.overflow = '';
      }
      document.body.classList.remove('lightbox-open');
    }
  }

  @HostListener('document:click')
  onDocClick(): void {
    if (this.openQrId !== null) {
      this.openQrId = null;
      this.cdr.detectChanges();
    }
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

  get shownFilters(): { id: ProjectFilterId; labelKey: string }[] {
    return this.projectFilters.filter(f => f.id === 'all' || this.countByFilter(f.id) > 0);
  }

  isNotebook(project: any): boolean {
    return !!parseNotebookUrl(project?.notebook_url);
  }

  notebookFileName(project: any): string {
    const ref = parseNotebookUrl(project?.notebook_url);
    return ref ? notebookName(ref) : '';
  }

  colabUrlFor(project: any): string {
    const ref = parseNotebookUrl(project?.notebook_url);
    return ref ? colabUrl(ref) : '';
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
    return techIcon(rawTag);
  }

  hideIconOnError(event: Event): void {
    hideIconOnError(event);
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
    this.resetLightboxZoom();
  }

  nextImage(project: any, event?: Event, key?: number): void {
    if (event) { event.stopPropagation(); }
    const total = this.imagesFor(project).length;
    if (total <= 1) return;
    const k = (key !== undefined) ? key : (project?.id ?? 0);
    const cur = this.carouselIndex[k] ?? 0;
    this.carouselIndex[k] = (cur + 1) % total;
    this.resetLightboxZoom();
  }

  goToImage(project: any, idx: number, event?: Event, key?: number): void {
    if (event) { event.stopPropagation(); }
    const total = this.imagesFor(project).length;
    if (idx < 0 || idx >= total) return;
    const k = (key !== undefined) ? key : (project?.id ?? 0);
    this.carouselIndex[k] = idx;
    this.resetLightboxZoom();
  }

  trackByImageIdx(index: number): number {
    return index;
  }

  lightboxImage(): string | null {
    if (!this.lightboxProject) return null;
    const imgs = this.imagesFor(this.lightboxProject);
    if (imgs.length === 0) return null;
    const idx = this.activeImageIndex(this.lightboxProject);
    return imgs[Math.min(Math.max(0, idx), imgs.length - 1)]?.url ?? null;
  }

  //Acciones de la card

  toggleQr(project: any, event: Event): void {
    event.stopPropagation();
    this.openQrId = this.openQrId === project.id ? null : project.id;
  }

  openLightboxFor(project: any, event?: Event): void {
    if (event) { event.stopPropagation(); }
    if (!project) return;
    if (this.imagesFor(project).length === 0) return;
    const alreadyOpen = this.lightboxOpen;
    this.lightboxProject = project;
    this.lightboxOpen = true;
    this.openQrId = null;
    this.resetLightboxZoom();
    if (isPlatformBrowser(this.platformId) && !alreadyOpen) {
      this.lockBodyScroll();
      document.body.classList.add('lightbox-open');
    }
  }

  closeLightbox(event?: Event): void {
    if (event) { event.stopPropagation(); }
    this.lightboxOpen = false;
    this.lightboxProject = null;
    this.resetLightboxZoom();
    if (isPlatformBrowser(this.platformId)) {
      this.unlockBodyScroll();
      document.body.classList.remove('lightbox-open');
    }
  }

  private lockBodyScroll(): void {
    this.scrollYBeforeLightbox = window.scrollY || window.pageYOffset || 0;
    const body = document.body;
    body.style.position = 'fixed';
    body.style.top = `-${this.scrollYBeforeLightbox}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
  }

  private unlockBodyScroll(): void {
    const body = document.body;
    body.style.position = '';
    body.style.top = '';
    body.style.left = '';
    body.style.right = '';
    body.style.width = '';
    body.style.overflow = '';
    void body.offsetHeight;
    window.scrollTo(0, this.scrollYBeforeLightbox);
  }

  onLightboxTouchStart(event: TouchEvent): void {
    if (event.touches.length === 2) {
      this.pinchStart = {
        distance: this.touchDistance(event.touches),
        zoom: this.lightboxZoom,
      };
      this.dragStart = null;
    } else if (event.touches.length === 1) {
      const t = event.touches[0];
      this.dragStart = {
        x: t.clientX,
        y: t.clientY,
        time: Date.now(),
        panX: this.lightboxPanX,
        panY: this.lightboxPanY,
      };
    }
  }

  onLightboxTouchMove(event: TouchEvent): void {
    if (this.pinchStart && event.touches.length === 2) {
      const dist = this.touchDistance(event.touches);
      const scale = dist / this.pinchStart.distance;
      this.lightboxZoom = Math.min(4, Math.max(1, this.pinchStart.zoom * scale));
      if (this.lightboxZoom === 1) {
        this.lightboxPanX = 0;
        this.lightboxPanY = 0;
      }
      event.preventDefault();
    } else if (this.dragStart && event.touches.length === 1 && this.lightboxZoom > 1) {
      const t = event.touches[0];
      this.lightboxPanX = this.dragStart.panX + (t.clientX - this.dragStart.x);
      this.lightboxPanY = this.dragStart.panY + (t.clientY - this.dragStart.y);
      event.preventDefault();
    }
  }

  onLightboxTouchEnd(event: TouchEvent): void {
    // Swipe horizontal para navegar: solo si no hay zoom activo.
    if (
      this.dragStart &&
      this.lightboxZoom === 1 &&
      event.changedTouches.length >= 1 &&
      this.lightboxProject
    ) {
      const t = event.changedTouches[0];
      const dx = t.clientX - this.dragStart.x;
      const dy = t.clientY - this.dragStart.y;
      const dt = Date.now() - this.dragStart.time;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 600) {
        if (dx < 0) {
          this.nextImage(this.lightboxProject);
        } else {
          this.prevImage(this.lightboxProject);
        }
      }
    }
    if (event.touches.length === 0) {
      this.pinchStart = null;
      this.dragStart = null;
    }
  }

  private touchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private resetLightboxZoom(): void {
    this.lightboxZoom = 1;
    this.lightboxPanX = 0;
    this.lightboxPanY = 0;
    this.pinchStart = null;
    this.dragStart = null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.lightboxOpen) { this.closeLightbox(); this.cdr.detectChanges(); return; }
    if (this.openQrId !== null) {
      this.openQrId = null;
      this.cdr.detectChanges();
    }
  }

  @HostListener('document:keydown.arrowleft', ['$event'])
  onArrowLeft(event: Event): void {
    if (this.lightboxOpen && this.lightboxProject) {
      event.preventDefault();
      this.prevImage(this.lightboxProject);
    }
  }

  @HostListener('document:keydown.arrowright', ['$event'])
  onArrowRight(event: Event): void {
    if (this.lightboxOpen && this.lightboxProject) {
      event.preventDefault();
      this.nextImage(this.lightboxProject);
    }
  }
}
