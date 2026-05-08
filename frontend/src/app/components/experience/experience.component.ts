import {
  Component, OnInit, OnDestroy, Inject, PLATFORM_ID,
  ChangeDetectorRef, ElementRef, ViewChild, EventEmitter, Output
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Subscription } from 'rxjs';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ExperienceService } from '../../services/experience.service';
import { TranslationService } from '../../services/translation.service';
import { BackgroundThemeService } from '../../services/background-theme.service';

@Component({
  selector: 'app-experience',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './experience.component.html',
  styleUrls: ['./experience.component.css']
})
export class ExperienceComponent implements OnInit, OnDestroy {
  @ViewChild('expSection') expSection!: ElementRef;
  @ViewChild('expTrack')   expTrack!:   ElementRef;

  @Output() loaded = new EventEmitter<any[]>();

  experiences: any[] = [];

  private animationsInitialized = false;
  private langSub!: Subscription;

  constructor(
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
    this.langSub = this.i18n.lang$.subscribe(() => this.cdr.detectChanges());

    this.experienceService.getExperience().subscribe({
      next: (data) => {
        this.experiences = data ?? [];
        this.cdr.detectChanges();
        if (isPlatformBrowser(this.platformId)) {
          ScrollTrigger.refresh();
        }
        this.loaded.emit(this.experiences);
      },
      error: (err) => {
        console.error('Error de red al cargar experiencias:', err);
        this.cdr.detectChanges();
        this.loaded.emit([]);
      }
    });
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }

  //HELPERS DE FECHA Y CARD

  private toDate(val: any): Date {
    if (!val) return new Date(NaN);
    if (val instanceof Date) return val;
    return new Date(String(val).substring(0, 10) + 'T00:00:00');
  }

  getYear(exp: any): number {
    return this.toDate(exp.start_date).getFullYear();
  }

  //Marca el año solo cuando cambia respecto a la entrada anterior
  showYearMarker(i: number): boolean {
    if (i === 0) return true;
    return this.getYear(this.experiences[i]) !== this.getYear(this.experiences[i - 1]);
  }

  formatDate(val: any): string {
    if (!val) return this.i18n.lang === 'en' ? 'Present' : 'Actualidad';
    const d = this.toDate(val);
    return d.toLocaleDateString(this.i18n.lang === 'en' ? 'en-US' : 'es-ES', {
      month: 'short',
      year: 'numeric'
    });
  }

  getDateRange(exp: any): string {
    return `${this.formatDate(exp.start_date)} – ${this.formatDate(exp.end_date)}`;
  }

  getCompanyDisplay(exp: any): string {
    const type     = this.i18n.lang === 'en' && exp.contract_type_en ? exp.contract_type_en : exp.contract_type;
    const location = this.i18n.lang === 'en' && exp.location_en     ? exp.location_en       : exp.location;
    return type ? `${exp.company} · ${type} · ${location}` : `${exp.company} · ${location}`;
  }

  getCardClasses(exp: any, i: number): string {
    const sizes  = ['exp-card--sm', 'exp-card--md', 'exp-card--lg', 'exp-card--md'];
    const positions = ['exp-pos--low', 'exp-pos--high', 'exp-pos--mid', 'exp-pos--low'];
    const size = sizes[i % sizes.length];
    const pos  = positions[i % positions.length];
    const current = !exp.end_date ? ' exp-card--current' : '';
    return `exp-card ${size} ${pos}${current}`;
  }

  getBarClass(exp: any): string {
    if (!exp.end_date) return 'exp-bar exp-bar--green';
    if (exp.location && exp.location.toLowerCase().includes('estados unidos')) return 'exp-bar exp-bar--warm';
    return 'exp-bar exp-bar--blue';
  }

  isInternship(exp: any): boolean {
    return (exp.contract_type ?? '').toLowerCase().includes('prácticas') ||
           (exp.contract_type_en ?? '').toLowerCase() === 'internship';
  }

  //API PÚBLICA — la llama HomeComponent tras la intro

  initAnimations(): void {
    if (this.animationsInitialized || !isPlatformBrowser(this.platformId)) return;
    if (window.innerWidth <= 850 || !this.expSection || !this.expTrack) return;
    this.animationsInitialized = true;
    const section = this.expSection.nativeElement;
    const track   = this.expTrack.nativeElement;

    //Escapa del padding del .main-content para ocupar 100vw
    const applyFullBleed = () => {
      const rect = section.getBoundingClientRect();
      section.style.marginLeft = rect.left > 0 ? `-${rect.left}px` : '0px';
      section.style.width = '100vw';
    };

    applyFullBleed();

    const setTrackX = gsap.quickSetter(track, 'x', 'px') as (v: number) => void;

    let startX    = 0;
    let entryEndX = 0;
    let pinEndX   = 0;

    const computePositions = () => {
      applyFullBleed();
      startX    = window.innerWidth * 0.5;
      entryEndX = 0;
      pinEndX   = -(track.scrollWidth - window.innerWidth);
    };

    computePositions();
    setTrackX(startX);

    //ST1 — entrada sin pin: arranca cuando la sección asoma por abajo
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

    //ST2 — pin + scroll horizontal restante
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
        this.theme.setProgress(self.progress);
        document.documentElement.classList.toggle('dark-scroll-active', self.progress > 0.5);
      },
    });

    ScrollTrigger.refresh();
  }

  resetAnimations(): void {
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
