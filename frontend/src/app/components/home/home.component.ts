import {
  Component, OnInit, OnDestroy, Inject, PLATFORM_ID,
  ChangeDetectorRef, ElementRef, ViewChildren, ViewChild, QueryList,
  HostListener
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Subscription } from 'rxjs';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ProjectService, resolveApiAssetUrl } from '../../services/project.service';

type ProjectFilterId = 'all' | 'web' | 'android' | 'ai' | 'other';
import { ExperienceService } from '../../services/experience.service';
import { TranslationService } from '../../services/translation.service';
import { BackgroundThemeService } from '../../services/background-theme.service';
import { ProfileService } from '../../services/profile.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  // --- ViewChildren / ViewChild para animaciones GSAP ---
  @ViewChildren('cvSection')  cvSections!:  QueryList<ElementRef>;
  @ViewChildren('eduEl')      eduEls!:      QueryList<ElementRef>;

  // Scroll horizontal — Experiencia
  @ViewChild('expSection') expSection!: ElementRef;
  @ViewChild('expTrack')   expTrack!:   ElementRef;

  // Lista interna de proyectos: la usamos para resetear su scroll al
  // volver a la intro.
  @ViewChild('showcaseList') showcaseList!: ElementRef;

  // --- Datos de proyectos ---
  projects: any[] = [];
  errorMessage = '';

  // --- Filtro por tipo de proyecto ---
  // El id 'all' incluye todos. Los demás coinciden con la columna `project_type`
  // del backend. Si en el futuro añades un nuevo tipo, basta con añadir aquí
  // su entrada y la traducción correspondiente; el resto del flujo es genérico.
  projectFilters: { id: ProjectFilterId; labelKey: string }[] = [
    { id: 'all',     labelKey: 'projects.filter.all' },
    { id: 'web',     labelKey: 'projects.filter.web' },
    { id: 'android', labelKey: 'projects.filter.android' },
    { id: 'ai',      labelKey: 'projects.filter.ai' },
  ];
  activeFilter: ProjectFilterId = 'all';

  // QR popover y modal de caso de estudio. Solo uno abierto a la vez por card.
  openQrId: number | null = null;
  caseProject: any = null;
  lightboxOpen = false;

  // Índice activo del carrusel por proyecto. Mapa por id de proyecto. El modal
  // de caso completo usa una clave separada (-1) para no compartir índice con
  // la card de la lista. */
  carouselIndex: Record<number, number> = {};
  private static readonly CASE_KEY = -1;

  // --- Datos de experiencia ---
  experiences: any[] = [];

  // --- Perfil ---
  photoUrl = '';

  // --- Typewriter del hero ---
  // Cada entrada es el bloque de tags completo de un proyecto/experiencia
  // (p.ej. "Angular · TypeScript · Node.js"), no tags sueltos.
  private tagGroups: string[] = [];
  typedRole = '';
  private typewriterTimer: any = null;

  // --- Selector de idioma del CV ---
  cvMenuOpen = false;

  private animationsInitialized = false;
  private langSub!: Subscription;

  // Datos para el pin/scroll horizontal de la sección Experiencia. Si
  // `initAnimations()` se llama antes de que llegue la respuesta del
  // backend, los cards aún no están en el DOM y `track.scrollWidth` es
  // demasiado pequeño → el pin spacer se dimensiona mal y luego ni
  // `ScrollTrigger.refresh()` lo arregla del todo. Diferimos el init
  // hasta que ambas listas estén cargadas.
  private projectsLoaded = false;
  private experiencesLoaded = false;
  private initPending = false;

  constructor(
    private projectService: ProjectService,
    private experienceService: ExperienceService,
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
    // Forzar re-render al cambiar idioma. El typewriter no depende del idioma
    // (escribe tags técnicos), así que no hace falta reiniciarlo aquí.
    this.langSub = this.i18n.lang$.subscribe(() => this.cdr.detectChanges());

    this.projectService.getFeaturedProjects().subscribe({
      next: (data) => {
        this.projects = data ?? [];
        this.rebuildTagGroups();
        this.cdr.detectChanges();
        // Refrescar ScrollTrigger para que la fase 3 del telón
        // (scroll de la pista de proyectos) mida el alto real.
        if (isPlatformBrowser(this.platformId)) {
          ScrollTrigger.refresh();
        }
        this.projectsLoaded = true;
        this.tryDeferredInit();
      },
      error: (err) => {
        console.error('Error de red al cargar proyectos:', err);
        this.errorMessage = 'Error al cargar los proyectos.';
        this.cdr.detectChanges();
        // Aunque haya fallado, marcamos como cargado para no bloquear
        // indefinidamente el init de animaciones.
        this.projectsLoaded = true;
        this.tryDeferredInit();
      }
    });

    this.experienceService.getExperience().subscribe({
      next: (data) => {
        this.experiences = data ?? [];
        this.rebuildTagGroups();
        this.cdr.detectChanges();
        // Refrescar ScrollTrigger para recalcular el ancho del track de experiencia
        if (isPlatformBrowser(this.platformId)) {
          ScrollTrigger.refresh();
        }
        this.experiencesLoaded = true;
        this.tryDeferredInit();
      },
      error: (err) => {
        console.error('Error de red al cargar experiencias:', err);
        this.cdr.detectChanges();
        this.experiencesLoaded = true;
        this.tryDeferredInit();
      }
    });

    this.photoUrl = this.profile.photoUrl;
    // Carga textos editables del perfil (sobrescribe traducciones) y versión
    // de la foto para cache-busting. Silencioso si no hay backend.
    this.profile.load().subscribe(() => {
      setTimeout(() => {
        this.photoUrl = this.profile.photoUrl;
        this.cdr.detectChanges();
      }, 0);
    });
  }

  /** Cierra el menú del CV y el popover QR al hacer click fuera. Los
   *  triggers internos llaman a stopPropagation para evitar autocerrarse. */
  @HostListener('document:click')
  onDocClick(): void {
    let changed = false;
    if (this.cvMenuOpen) { this.cvMenuOpen = false; changed = true; }
    if (this.openQrId !== null) { this.openQrId = null; changed = true; }
    if (changed) this.cdr.detectChanges();
  }

  scrollToTop(event: Event): void {
    event.preventDefault();
    window.dispatchEvent(new CustomEvent('scrollToTop'));
  }

  // ─── Helpers para la sección de experiencia ───────────────────────────────

  /** Convierte valor de fecha (string YYYY-MM-DD o Date object de mysql2) a Date */
  private toDate(val: any): Date {
    if (!val) return new Date(NaN);
    if (val instanceof Date) return val;
    // String "YYYY-MM-DD" → añadir hora local para evitar desfase UTC
    return new Date(String(val).substring(0, 10) + 'T00:00:00');
  }

  getYear(exp: any): number {
    return this.toDate(exp.start_date).getFullYear();
  }

  /** Muestra marcador de año cuando cambia respecto a la entrada anterior */
  showYearMarker(i: number): boolean {
    if (i === 0) return true;
    return this.getYear(this.experiences[i]) !== this.getYear(this.experiences[i - 1]);
  }

  /** Formatea una fecha a "Mar 2026" según el idioma activo */
  formatDate(val: any): string {
    if (!val) return this.i18n.lang === 'en' ? 'Present' : 'Actualidad';
    const d = this.toDate(val);
    return d.toLocaleDateString(this.i18n.lang === 'en' ? 'en-US' : 'es-ES', {
      month: 'short',
      year: 'numeric'
    });
  }

  /** Rango de fechas para mostrar en la card */
  getDateRange(exp: any): string {
    return `${this.formatDate(exp.start_date)} – ${this.formatDate(exp.end_date)}`;
  }

  /** Línea de empresa + tipo contrato + localización */
  getCompanyDisplay(exp: any): string {
    const type     = this.i18n.lang === 'en' && exp.contract_type_en ? exp.contract_type_en : exp.contract_type;
    const location = this.i18n.lang === 'en' && exp.location_en     ? exp.location_en       : exp.location;
    return type ? `${exp.company} · ${type} · ${location}` : `${exp.company} · ${location}`;
  }

  /** Clases de la card según posición en la lista */
  getCardClasses(exp: any, i: number): string {
    const sizes  = ['exp-card--sm', 'exp-card--md', 'exp-card--lg', 'exp-card--md'];
    const positions = ['exp-pos--low', 'exp-pos--high', 'exp-pos--mid', 'exp-pos--low'];
    const size = sizes[i % sizes.length];
    const pos  = positions[i % positions.length];
    const current = !exp.end_date ? ' exp-card--current' : '';
    return `exp-card ${size} ${pos}${current}`;
  }

  /** Color de la barra lateral de la card */
  getBarClass(exp: any): string {
    if (!exp.end_date) return 'exp-bar exp-bar--green';
    if (exp.location && exp.location.toLowerCase().includes('estados unidos')) return 'exp-bar exp-bar--warm';
    return 'exp-bar exp-bar--blue';
  }

  isInternship(exp: any): boolean {
    return (exp.contract_type ?? '').toLowerCase().includes('prácticas') ||
           (exp.contract_type_en ?? '').toLowerCase() === 'internship';
  }

  // ─── Typewriter del hero ─────────────────────────────────────────────────

  /** Recalcula los bloques de tags por proyecto/experiencia. Cada bloque
   *  conserva todos los tags del item unidos por " · ". Dedupe a nivel de
   *  bloque completo (no de tag individual). Reinicia el typewriter si el
   *  conjunto cambia. */
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

  /** Tipa, espera y borra cada bloque de tags en bucle. Usa setTimeout
   *  encadenado para poder cancelarse limpiamente. No arranca si está vacío. */
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
      // Si la lista cambia mid-bucle, el restart limpia este timer; aun así
      // protegemos por si idx queda fuera de rango.
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

    // Iniciamos el bucle de forma asíncrona para evitar colisiones con el ciclo de detección de cambios de Angular (NG0100)
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

  // ─── Helpers para la vitrina de proyectos ────────────────────────────────

  /** QR generado vía servicio público a partir de la URL más relevante del proyecto */
  qrUrl(project: any): string {
    const target = project?.live_url || project?.repo_url ||
      (isPlatformBrowser(this.platformId) ? window.location.origin : '');
    return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=6&data=${encodeURIComponent(target)}`;
  }

  /** Tipo de proyecto normalizado. Sin valor cae a 'web' para que la card
   *  siempre tenga un mockup que dibujar. */
  getType(project: any): ProjectFilterId {
    const t = (project?.project_type || '').toLowerCase();
    if (t === 'android' || t === 'ai' || t === 'other' || t === 'web') return t;
    return 'web';
  }

  /** Lista visible según el filtro activo. */
  get filteredProjects(): any[] {
    if (this.activeFilter === 'all') return this.projects;
    return this.projects.filter(p => this.getType(p) === this.activeFilter);
  }

  setFilter(id: ProjectFilterId): void {
    if (this.activeFilter === id) return;
    this.activeFilter = id;
    this.openQrId = null;
    if (isPlatformBrowser(this.platformId)) {
      // Reposiciona ScrollTrigger porque el alto del listado puede cambiar
      // y el pin de la cortina necesita volver a medir.
      setTimeout(() => ScrollTrigger.refresh(), 0);
    }
  }

  countByFilter(id: ProjectFilterId): number {
    if (id === 'all') return this.projects.length;
    return this.projects.filter(p => this.getType(p) === id).length;
  }

  /** Rango de años de los proyectos (del más antiguo al más reciente).
   *  Devuelve '2024-2026' o '2025' si todos son del mismo año. */
  get projectsYearRange(): string {
    const years = this.projects
      .map(p => p?.project_date ? this.toDate(p.project_date).getFullYear() : NaN)
      .filter(y => Number.isFinite(y));
    if (years.length === 0) return '';
    const min = Math.min(...years);
    const max = Math.max(...years);
    return min === max ? `${min}` : `${min}-${max}`;
  }

  /** Acorta una URL para mostrarla en la barra del mockup de navegador
   *  (sin protocolo y truncada). Vacía si no hay URL. */
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

  /** Mapeo manual del nombre del tag al slug de simple-icons. Usar mapa explícito
   *  evita peticiones rotas a iconos inexistentes (los slugs no siempre coinciden
   *  con el nombre del tag). Devuelve URL del CDN o '' si no hay icono. */
  techIcon(rawTag: string): string {
    if (!rawTag) return '';
    const tag = rawTag.trim().toLowerCase();
    const slug = TECH_ICON_MAP[tag];
    if (!slug) return '';
    // Color de Simple Icons (sin #) — azul corporativo del portfolio
    // (--c-primary: #007bff) para coherencia con el resto de la página.
    return `https://cdn.simpleicons.org/${slug}/007bff`;
  }

  // ─── Carrusel de capturas ───────────────────────────────────────────────

  /** Lista de capturas para un proyecto. Si el array `images` viene vacío
   *  o no existe, devolvemos []: el espacio del mockup queda en blanco. */
  imagesFor(project: any): { url: string }[] {
    if (!project) return [];
    const arr = Array.isArray(project.images) ? project.images : [];
    // Las URLs subidas vienen como `/api/projects/images/…` (relativas al
    // backend). En dev hay que prefijarlas con el host del API o el navegador
    // las pediría al servidor de Angular y devolvería 404.
    return arr
      .filter((img: any) => img && typeof img.url === 'string' && img.url.length > 0)
      .map((img: any) => ({ url: resolveApiAssetUrl(img.url) }));
  }

  /** Índice activo (0 si no se ha tocado el carrusel). `key` opcional para
   *  diferenciar el carrusel del modal del de la card. */
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

  /** trackBy estable para *ngFor de imágenes — evita que Angular destruya y
   *  recree los <img> en cada ciclo de change detection (imagesFor() crea un
   *  array nuevo cada llamada y, sin trackBy, el clic sobre una miniatura
   *  registra sobre un nodo que se está reemplazando). */
  trackByImageIdx(index: number): number {
    return index;
  }

  /** URL de la imagen actualmente activa en el lightbox (o null si el
   *  carrusel no tiene imágenes). Se usa con `*ngIf="lightboxImage() as lbImg"`
   *  para renderizar UN solo <img> dimensionado por su contenido natural,
   *  de modo que clicks fuera del rectángulo visible caigan en el backdrop. */
  lightboxImage(): string | null {
    if (!this.caseProject) return null;
    const imgs = this.imagesFor(this.caseProject);
    if (imgs.length === 0) return null;
    const idx = this.activeImageIndex(this.caseProject, HomeComponent.CASE_KEY);
    return imgs[Math.min(Math.max(0, idx), imgs.length - 1)]?.url ?? null;
  }

  // ─── Acciones de la card ────────────────────────────────────────────────

  /** Toggle del popover QR sobre la card. Cierra cualquier otro abierto. */
  toggleQr(project: any, event: Event): void {
    event.stopPropagation();
    this.openQrId = this.openQrId === project.id ? null : project.id;
  }

  /** Cierra el QR si se hace click en cualquier sitio fuera (gracias al
   *  HostListener existente en onDocClick). */
  openCase(project: any): void {
    this.caseProject = project;
    this.openQrId = null;
    // Reset del carrusel del modal a la primera imagen para no abrir el modal
    // mostrando una captura intermedia heredada de una sesión anterior.
    this.carouselIndex[HomeComponent.CASE_KEY] = 0;
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
    // El lightbox se cierra primero: ESC dentro del lightbox no debe cerrar el
    // modal completo, solo volver a la vista de detalle.
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
      this.prevImage(this.caseProject, undefined, HomeComponent.CASE_KEY);
    }
  }

  @HostListener('document:keydown.arrowright', ['$event'])
  onArrowRight(event: Event): void {
    if (this.lightboxOpen && this.caseProject) {
      event.preventDefault();
      this.nextImage(this.caseProject, undefined, HomeComponent.CASE_KEY);
    }
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
    this.stopTypewriter();
    // revert: true restaura pin-spacers y estilos inline que GSAP inyecta
    // en body/html con pin:true. Sin esto, al navegar a /admin el scroll
    // queda bloqueado y aparece una animación de rebote.
    ScrollTrigger.getAll().forEach(t => t.kill(true));
    this.theme.setProgress(0);
    if (isPlatformBrowser(this.platformId)) {
      // Limpieza defensiva de estilos residuales
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

  // ─── API pública — llamada por AppComponent tras la transición intro ───

  /** Inicializa todas las animaciones scroll. Seguro llamar múltiples veces.
   *
   *  Si los datos del backend (proyectos y experiencias) aún no han llegado,
   *  el pin horizontal de la sección Experiencia se calcularía sobre un
   *  track casi vacío. En ese caso difiere la inicialización hasta que los
   *  subscribers marquen los datos como cargados (ver `tryDeferredInit`).
   */
  initAnimations(): void {
    if (this.animationsInitialized || !isPlatformBrowser(this.platformId)) return;
    if (!this.projectsLoaded || !this.experiencesLoaded) {
      this.initPending = true;
      return;
    }
    this.animationsInitialized = true;

    // Headers de sección — fade-up
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

    // About card — slide up
    const aboutCard = document.querySelector('.about-card');
    if (aboutCard) {
      gsap.from(aboutCard, {
        opacity: 0, y: 40,
        duration: 0.8, ease: 'power2.out',
        scrollTrigger: { trigger: aboutCard, start: 'top 88%', toggleActions: 'play none none reverse' }
      });
    }

    // Scroll horizontal — Sección experiencia
    if (window.innerWidth > 850 && this.expSection && this.expTrack) {
      const section = this.expSection.nativeElement;
      const track   = this.expTrack.nativeElement;

      // Escapa del padding del .main-content (250px/lado) antes de que GSAP
      // registre el estado inicial. getBoundingClientRect da la posición real.
      const applyFullBleed = () => {
        const rect = section.getBoundingClientRect();
        section.style.marginLeft = rect.left > 0 ? `-${rect.left}px` : '0px';
        section.style.width = '100vw';
      };

      applyFullBleed();

      // Offset inicial pequeño: antes era vw*0.5 (título a la derecha).
      // Ahora el título arranca pegado a la izquierda.
      const setTrackX = gsap.quickSetter(track, 'x', 'px') as (v: number) => void;

      let startX    = 0;
      let entryEndX = 0;
      let pinEndX   = 0;

      const computePositions = () => {
        applyFullBleed();
        // Arranca con el título aproximadamente centrado en el viewport.
        startX    = window.innerWidth * 0.5;
        entryEndX = 0;
        pinEndX   = -(track.scrollWidth - window.innerWidth);
      };

      computePositions();
      setTrackX(startX);

      // ST1 — Entrada: el track se desplaza horizontalmente mientras la
      // sección entra en viewport (desde "top bottom" hasta "top top"), sin
      // pin. Así el scroll horizontal comienza en cuanto la sección asoma.
      ScrollTrigger.create({
        trigger: section,
        start: 'top bottom',
        end:   'top top',
        scrub: 1,
        invalidateOnRefresh: true,
        onRefresh: computePositions,
        onUpdate: (self) => {
          setTrackX(startX + (entryEndX - startX) * self.progress);
        },
      });

      // ST2 — Pin + scroll horizontal restante.
      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: () => `+=${Math.abs(pinEndX - entryEndX)}`,
        scrub: 1,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onRefresh: computePositions,
        onUpdate: (self) => {
          setTrackX(entryEndX + (pinEndX - entryEndX) * self.progress);
          // Envía el progreso al canvas 3D: interpola bg/puntos/líneas.
          this.theme.setProgress(self.progress);
          // A partir de la mitad, los apartados de abajo usan texto claro.
          document.documentElement.classList.toggle('dark-scroll-active', self.progress > 0.5);
        },
      });
    }

    // Education cards — scale-up con bounce
    this.eduEls.forEach((card, i) => {
      gsap.from(card.nativeElement, {
        opacity: 0, y: 40, scale: 0.95,
        duration: 0.6, delay: i * 0.12, ease: 'back.out(1.4)',
        scrollTrigger: { trigger: card.nativeElement, start: 'top 90%', toggleActions: 'play none none reverse' }
      });
    });

    // La sección skills + proyectos vive en flujo normal: sin pin, sin
    // telón animado. Los proyectos del filtro activo se desplazan con el
    // scroll de la página y el footer queda al final de la lista.

    ScrollTrigger.refresh();
  }

  /** Si había una llamada a `initAnimations()` esperando datos, ahora que
   *  llegaron la disparamos. Aplaza una microtask para que detectChanges
   *  ya haya pintado los nuevos cards en el DOM antes de que GSAP mida. */
  private tryDeferredInit(): void {
    if (!this.initPending) return;
    if (!this.projectsLoaded || !this.experiencesLoaded) return;
    this.initPending = false;
    // requestAnimationFrame para asegurar que el layout post-detectChanges
    // está aplicado antes de que ScrollTrigger lea getBoundingClientRect.
    requestAnimationFrame(() => this.initAnimations());
  }

  /** Resetea animaciones para que puedan reproducirse de nuevo (al volver a la intro). */
  resetAnimations(): void {
    ScrollTrigger.getAll().forEach(t => t.kill(true));
    gsap.set('.section-header-cv, .about-card, .edu-card, .skill-category', {
      clearProps: 'all'
    });
    if (this.expTrack) {
      gsap.set(this.expTrack.nativeElement, { x: 0 });
    }
    if (this.expSection) {
      this.expSection.nativeElement.style.marginLeft = '';
      this.expSection.nativeElement.style.width = '';
    }
    if (this.showcaseList) this.showcaseList.nativeElement.scrollTop = 0;
    this.theme.setProgress(0);
    if (isPlatformBrowser(this.platformId)) {
      document.documentElement.classList.remove('dark-scroll-active');
    }
    this.animationsInitialized = false;
  }
}

// Mapeo manual tag → slug de simple-icons (cdn.simpleicons.org). Las claves
// están en minúsculas y se comparan así. Si un tag no aparece aquí, no se
// dibuja icono — preferible a una petición rota. Añade entradas según vayas
// usando nuevos tags en proyectos.
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
  // simple-icons renombró el slug css3 → css en v13. Usamos el nuevo.
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
