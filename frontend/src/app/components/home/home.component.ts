import {
  Component, OnInit, OnDestroy, Inject, PLATFORM_ID,
  ChangeDetectorRef, ElementRef, ViewChildren, ViewChild, QueryList
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Subscription } from 'rxjs';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ProjectService } from '../../services/project.service';
import { ExperienceService } from '../../services/experience.service';
import { TranslationService } from '../../services/translation.service';
import { BackgroundThemeService } from '../../services/background-theme.service';

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

  // Telón skills → proyectos destacados
  @ViewChild('showcaseSection') showcaseSection!: ElementRef;
  @ViewChild('spPin')            spPin!:           ElementRef;
  @ViewChild('skillsColLeft')    skillsColLeft!:   ElementRef;
  @ViewChild('skillsColRight')   skillsColRight!:  ElementRef;
  @ViewChild('projectsCurtain')  projectsCurtain!: ElementRef;

  // --- Datos de proyectos ---
  projects: any[] = [];
  errorMessage = '';

  // --- Datos de experiencia ---
  experiences: any[] = [];

  private animationsInitialized = false;
  private langSub!: Subscription;

  constructor(
    private projectService: ProjectService,
    private experienceService: ExperienceService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
    public i18n: TranslationService,
    private theme: BackgroundThemeService
  ) {
    if (isPlatformBrowser(this.platformId)) {
      gsap.registerPlugin(ScrollTrigger);
    }
  }

  ngOnInit(): void {
    // Forzar re-render al cambiar idioma para que los métodos getCompanyDisplay etc. se reevalúen
    this.langSub = this.i18n.lang$.subscribe(() => this.cdr.detectChanges());

    this.projectService.getProjects().subscribe({
      next: (data) => {
        this.projects = data?.length ? data.slice(0, 3) : [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error de red al cargar proyectos:', err);
        this.errorMessage = 'Error al cargar los proyectos.';
        this.cdr.detectChanges();
      }
    });

    this.experienceService.getExperience().subscribe({
      next: (data) => {
        this.experiences = data ?? [];
        this.cdr.detectChanges();
        // Refrescar ScrollTrigger para recalcular el ancho del track de experiencia
        if (isPlatformBrowser(this.platformId)) {
          ScrollTrigger.refresh();
        }
      },
      error: (err) => {
        console.error('Error de red al cargar experiencias:', err);
        this.cdr.detectChanges();
      }
    });
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

  // ─── Helpers para la vitrina de proyectos ────────────────────────────────

  /** QR generado vía servicio público a partir de la URL más relevante del proyecto */
  qrUrl(project: any): string {
    const target = project?.live_url || project?.repo_url ||
      (isPlatformBrowser(this.platformId) ? window.location.origin : '');
    return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=6&data=${encodeURIComponent(target)}`;
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
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

  /** Inicializa todas las animaciones scroll. Seguro llamar múltiples veces. */
  initAnimations(): void {
    if (this.animationsInitialized || !isPlatformBrowser(this.platformId)) return;
    this.animationsInitialized = true;

    // Headers de sección — fade-up
    this.cvSections.forEach((section) => {
      const header = section.nativeElement.querySelector('.section-header-cv');
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

      // Offset inicial: la pista arranca desplazada a la derecha para que el
      // primer panel (título) aparezca en la mitad derecha del viewport.
      const initialOffset = () => window.innerWidth * 0.5;
      const totalScroll   = () => track.scrollWidth - window.innerWidth + initialOffset();

      gsap.fromTo(track,
        { x: initialOffset },
        {
          x: () => -(track.scrollWidth - window.innerWidth),
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: () => `+=${totalScroll()}`,
            scrub: 1,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onRefresh: applyFullBleed,
            onUpdate: (self) => {
              // Envía el progreso al canvas 3D: interpola bg/puntos/líneas
              // sin reposicionar nada, solo color.
              this.theme.setProgress(self.progress);
              // A partir de la mitad, los apartados de abajo usan texto claro
              document.documentElement.classList.toggle('dark-scroll-active', self.progress > 0.5);
            },
          }
        }
      );
    }

    // Education cards — scale-up con bounce
    this.eduEls.forEach((card, i) => {
      gsap.from(card.nativeElement, {
        opacity: 0, y: 40, scale: 0.95,
        duration: 0.6, delay: i * 0.12, ease: 'back.out(1.4)',
        scrollTrigger: { trigger: card.nativeElement, start: 'top 90%', toggleActions: 'play none none reverse' }
      });
    });

    // Skills → Proyectos — telón combinado (solo desktop).
    // Fase 1 (0-50%): ambas columnas entran desde los laterales hacia el centro.
    // Fase 2 (50-100%): el telón de proyectos sube desde abajo hasta cubrir la página.
    if (window.innerWidth > 850 && this.showcaseSection && this.spPin
        && this.skillsColLeft && this.skillsColRight && this.projectsCurtain) {
      const section   = this.showcaseSection.nativeElement;
      const pin       = this.spPin.nativeElement;
      const leftCol   = this.skillsColLeft.nativeElement;
      const rightCol  = this.skillsColRight.nativeElement;
      const curtain   = this.projectsCurtain.nativeElement;

      // Escapa del padding del .main-content (250px/lado) para que la sección
      // ocupe el 100% del ancho del viewport.
      const applyFullBleedShowcase = () => {
        const rect = section.getBoundingClientRect();
        section.style.marginLeft = rect.left > 0 ? `-${rect.left}px` : '0px';
        section.style.width = '100vw';
      };
      applyFullBleedShowcase();

      // Ambas columnas entran con la misma lógica que la derecha (evita el
      // bug al hacer scroll que aparecía con el desplazamiento negativo).
      // Las dos arrancan desplazadas hacia la derecha — dentro del viewport —
      // y convergen a su posición natural.
      const measureEntryShift = () => {
        const savedR = rightCol.style.transform;
        rightCol.style.transform = '';
        const rRect = rightCol.getBoundingClientRect();
        rightCol.style.transform = savedR;
        const vw = window.innerWidth;
        return Math.max(0, vw - rRect.right - 24);
      };

      let entryShift = measureEntryShift();

      // Estado inicial: ambas columnas desplazadas a la derecha (sin salir del
      // viewport), telón oculto debajo. Sin transparencias.
      gsap.set(curtain, { yPercent: 100 });
      gsap.set(leftCol,  { x: entryShift });
      gsap.set(rightCol, { x: entryShift });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${window.innerHeight * 2}`,
          pin: pin,
          pinType: 'fixed',
          pinSpacing: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: () => {
            applyFullBleedShowcase();
            ({ leftShift, rightShift } = measureEntryShift());
          },
        }
      });

      // Fase 1: columnas entran desde los laterales al centro (sin opacidad).
      tl.fromTo(leftCol,
        { x: () => -leftShift },
        { x: 0, ease: 'none', duration: 1 },
        0
      );
      tl.fromTo(rightCol,
        { x: () => rightShift },
        { x: 0, ease: 'none', duration: 1 },
        0
      );

      // Fase 2: telón sube desde abajo cubriendo todo
      tl.fromTo(curtain,
        { yPercent: 100 },
        { yPercent: 0, ease: 'none', duration: 1 },
        1
      );
    } else if (this.projectsCurtain) {
      // En móvil o si faltan refs, mostrar el telón en su sitio sin animación
      gsap.set(this.projectsCurtain.nativeElement, { yPercent: 0, position: 'relative' });
    }

    ScrollTrigger.refresh();
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
    if (this.showcaseSection) {
      this.showcaseSection.nativeElement.style.marginLeft = '';
      this.showcaseSection.nativeElement.style.width = '';
    }
    if (this.skillsColLeft)   gsap.set(this.skillsColLeft.nativeElement,   { clearProps: 'all' });
    if (this.skillsColRight)  gsap.set(this.skillsColRight.nativeElement,  { clearProps: 'all' });
    if (this.projectsCurtain) gsap.set(this.projectsCurtain.nativeElement, { clearProps: 'all' });
    this.theme.setProgress(0);
    if (isPlatformBrowser(this.platformId)) {
      document.documentElement.classList.remove('dark-scroll-active');
    }
    this.animationsInitialized = false;
  }
}
