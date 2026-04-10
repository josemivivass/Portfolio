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
  @ViewChildren('skillEl')    skillEls!:    QueryList<ElementRef>;
  @ViewChildren('projectCard') projectCards!: QueryList<ElementRef>;

  // Scroll horizontal — Experiencia
  @ViewChild('expSection') expSection!: ElementRef;
  @ViewChild('expTrack')   expTrack!:   ElementRef;

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
    public i18n: TranslationService
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

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
    ScrollTrigger.getAll().forEach(t => t.kill());
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

      // Aplicar ANTES de crear el ScrollTrigger para que GSAP capture el ancho correcto
      applyFullBleed();

      gsap.to(track, {
        x: () => -(track.scrollWidth - window.innerWidth),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${track.scrollWidth - window.innerWidth}`,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: applyFullBleed,
        }
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

    // Skill categories — alternando izquierda/derecha
    this.skillEls.forEach((card, i) => {
      gsap.from(card.nativeElement, {
        opacity: 0, x: i % 2 === 0 ? -40 : 40,
        duration: 0.65, delay: i * 0.1, ease: 'power2.out',
        scrollTrigger: { trigger: card.nativeElement, start: 'top 90%', toggleActions: 'play none none reverse' }
      });
    });

    // Project cards — alternando izquierda/derecha
    if (this.projectCards?.length) {
      this.projectCards.forEach((card, i) => {
        gsap.from(card.nativeElement, {
          opacity: 0, x: i % 2 === 0 ? -100 : 100,
          duration: 1, ease: 'power2.out',
          scrollTrigger: { trigger: card.nativeElement, start: 'top 85%', toggleActions: 'play none none reverse' }
        });
      });
    }

    ScrollTrigger.refresh();
  }

  /** Resetea animaciones para que puedan reproducirse de nuevo (al volver a la intro). */
  resetAnimations(): void {
    ScrollTrigger.getAll().forEach(t => t.kill());
    gsap.set('.section-header-cv, .about-card, .edu-card, .skill-category, .project-card-horizontal', {
      clearProps: 'all'
    });
    if (this.expTrack) {
      gsap.set(this.expTrack.nativeElement, { x: 0 });
    }
    if (this.expSection) {
      this.expSection.nativeElement.style.marginLeft = '';
      this.expSection.nativeElement.style.width = '';
    }
    this.animationsInitialized = false;
  }
}
