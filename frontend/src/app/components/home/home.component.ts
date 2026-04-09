import {
  Component, OnInit, OnDestroy, Inject, PLATFORM_ID,
  ChangeDetectorRef, ElementRef, ViewChildren, ViewChild, QueryList
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ProjectService } from '../../services/project.service';
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

  private animationsInitialized = false;

  constructor(
    private projectService: ProjectService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
    public i18n: TranslationService
  ) {
    if (isPlatformBrowser(this.platformId)) {
      gsap.registerPlugin(ScrollTrigger);
    }
  }

  ngOnInit(): void {
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
  }

  ngOnDestroy(): void {
    // Limpiar ScrollTriggers propios al destruir el componente
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
