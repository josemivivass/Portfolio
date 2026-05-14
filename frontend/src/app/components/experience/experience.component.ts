import {
  Component, OnInit, AfterViewInit, OnDestroy, Inject, PLATFORM_ID,
  ChangeDetectorRef, ElementRef, ViewChild, EventEmitter, Output
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Subscription } from 'rxjs';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ExperienceService } from '../../services/experience.service';
import { TranslationService } from '../../services/translation.service';
import { BackgroundThemeService } from '../../services/background-theme.service';
import { techIcon, hideIconOnError } from '../../utils/tech-icons';

@Component({
  selector: 'app-experience',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './experience.component.html',
  styleUrls: ['./experience.component.css']
})
export class ExperienceComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('expSection')  expSection!: ElementRef;
  @ViewChild('expTrack')    expTrack!:   ElementRef;
  @ViewChild('progressFill') progressFill?: ElementRef<HTMLElement>;
  @ViewChild('expTitleEl')  expTitleEl?: ElementRef<HTMLElement>;

  @Output() loaded = new EventEmitter<any[]>();

  experiences: any[] = [];
  activeIndex = 1;
  yearRange = '';

  private static readonly SIZE_CYCLE = ['exp-card--lg', 'exp-card--md', 'exp-card--md', 'exp-card--sm', 'exp-card--md', 'exp-card--sm'];
  private static readonly POS_CYCLE  = ['exp-pos--mid', 'exp-pos--high', 'exp-pos--low', 'exp-pos--mid', 'exp-pos--high', 'exp-pos--low'];

  private animationsInitialized = false;
  private langSub!: Subscription;
  private titleResizeListener: (() => void) | null = null;
  private titleResizeObserver: ResizeObserver | null = null;

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
        this.experiences = this.sortNewestFirst(data ?? []);
        this.yearRange = this.computeYearRange();
        this.activeIndex = this.experiences.length ? 1 : 0;
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

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const refit = () => this.fitExpTitle();
    requestAnimationFrame(refit);
    setTimeout(refit, 150);
    setTimeout(refit, 500);
    const fonts = (document as any).fonts;
    if (fonts?.ready?.then) fonts.ready.then(refit);

    this.titleResizeListener = refit;
    window.addEventListener('resize', this.titleResizeListener, { passive: true });

    const el = this.expTitleEl?.nativeElement;
    const parent = el?.parentElement;
    if (parent && typeof ResizeObserver !== 'undefined') {
      this.titleResizeObserver = new ResizeObserver(refit);
      this.titleResizeObserver.observe(parent);
    }
  }

  private fitExpTitle(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const el = this.expTitleEl?.nativeElement;
    if (!el) return;

    if (window.innerWidth > 850) {
      el.style.fontSize = '';
      return;
    }

    const container = el.parentElement;
    if (!container) return;
    const available = container.clientWidth;
    if (available <= 0) return;

    el.style.whiteSpace = 'nowrap';
    el.style.fontSize = '100px';
    void el.offsetWidth;
    const natural = el.scrollWidth;

    if (natural > 0) {
      const target = (available / natural) * 100;
      const capped = Math.max(14, Math.min(target, 64));
      el.style.fontSize = `${capped}px`;
    } else {
      el.style.fontSize = '';
    }
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
    if (isPlatformBrowser(this.platformId) && this.titleResizeListener) {
      window.removeEventListener('resize', this.titleResizeListener);
      this.titleResizeListener = null;
    }
    if (this.titleResizeObserver) {
      this.titleResizeObserver.disconnect();
      this.titleResizeObserver = null;
    }
  }

  private sortNewestFirst(data: any[]): any[] {
    return [...data].sort((a, b) => {
      const ta = this.toDate(a.start_date).getTime();
      const tb = this.toDate(b.start_date).getTime();
      if (tb !== ta) return tb - ta;
      if (!a.end_date && b.end_date) return -1;
      if (a.end_date && !b.end_date) return 1;
      return 0;
    });
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

  showYearMarker(i: number): boolean {
    if (i === 0) return true;
    return this.getYear(this.experiences[i]) !== this.getYear(this.experiences[i - 1]);
  }

  getYearLabel(exp: any): string {
    const year = this.getYear(exp);
    const hasCurrentInYear = this.experiences.some(e => !e.end_date && this.getYear(e) === year);
    if (hasCurrentInYear) return this.i18n.t('exp.year.label.present');

    const years = this.experiences.map(e => this.getYear(e)).filter(y => !Number.isNaN(y));
    if (!years.length) return '';
    const minYear = Math.min(...years);
    if (year === minYear) return this.i18n.t('exp.year.label.start');
    return '';
  }

  formatDate(val: any): string {
    if (!val) return this.i18n.lang === 'en' ? 'Present' : 'Presente';
    const d = this.toDate(val);
    return d.toLocaleDateString(this.i18n.lang === 'en' ? 'en-US' : 'es-ES', {
      month: 'short',
      year: 'numeric'
    });
  }

  getDateRange(exp: any): string {
    return `${this.formatDate(exp.start_date)} — ${this.formatDate(exp.end_date)}`;
  }

  getContractType(exp: any): string {
    return (this.i18n.lang === 'en' && exp.contract_type_en) ? exp.contract_type_en : (exp.contract_type ?? '');
  }

  getLocation(exp: any): string {
    return (this.i18n.lang === 'en' && exp.location_en) ? exp.location_en : (exp.location ?? '');
  }

  getCardClasses(exp: any, i: number): string {
    const size = ExperienceComponent.SIZE_CYCLE[i % ExperienceComponent.SIZE_CYCLE.length];
    const pos  = ExperienceComponent.POS_CYCLE[i % ExperienceComponent.POS_CYCLE.length];
    return `exp-card ${size} ${pos}`;
  }

  isLargeCard(i: number): boolean {
    return ExperienceComponent.SIZE_CYCLE[i % ExperienceComponent.SIZE_CYCLE.length] === 'exp-card--lg';
  }

  getBarClass(exp: any): string {
    if (!exp.end_date) return 'exp-card-bar exp-card-bar--current';
    return 'exp-card-bar exp-card-bar--past';
  }

  isInternship(exp: any): boolean {
    return (exp.contract_type ?? '').toLowerCase().includes('prácticas') ||
           (exp.contract_type_en ?? '').toLowerCase() === 'internship';
  }

  formatNumber(n: number): string {
    return String(Math.max(0, n)).padStart(2, '0');
  }

  techIcon(tag: string): string {
    return techIcon(tag);
  }

  hideIconOnError(event: Event): void {
    hideIconOnError(event);
  }

  private computeYearRange(): string {
    if (!this.experiences.length) return '';
    const startYears = this.experiences.map(e => this.getYear(e)).filter(y => !Number.isNaN(y));
    if (!startYears.length) return '';
    const endYears = this.experiences.map(e => e.end_date ? this.toDate(e.end_date).getFullYear() : new Date().getFullYear());
    const minY = Math.min(...startYears);
    const maxY = Math.max(...endYears);
    return minY === maxY ? `${minY}` : `${minY}–${maxY}`;
  }

  //API PÚBLICA — la llama HomeComponent tras la intro

  initAnimations(): void {
    if (this.animationsInitialized || !isPlatformBrowser(this.platformId)) return;
    if (!this.expSection || !this.expTrack) return;

    if (window.innerWidth <= 850) {
      this.animationsInitialized = true;
      const root = this.expSection.nativeElement as HTMLElement;
      const heading = root.querySelector('.section-heading-block');
      if (heading) {
        gsap.from(heading, {
          opacity: 0, y: 30,
          duration: 0.7, ease: 'power2.out',
          scrollTrigger: { trigger: heading, start: 'top 88%', toggleActions: 'play none none reverse' }
        });
      }
      root.querySelectorAll<HTMLElement>('.exp-card').forEach((card, i) => {
        gsap.from(card, {
          opacity: 0, y: 40,
          duration: 0.6, delay: i * 0.06, ease: 'power2.out',
          scrollTrigger: { trigger: card, start: 'top 90%', toggleActions: 'play none none reverse' }
        });
      });
      ScrollTrigger.refresh();
      return;
    }

    this.animationsInitialized = true;
    const section = this.expSection.nativeElement;
    const track   = this.expTrack.nativeElement;

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
        this.updateProgress(self.progress, track);
      },
    });

    ScrollTrigger.refresh();
  }

  private updateProgress(progress: number, track: HTMLElement): void {
    if (this.progressFill?.nativeElement) {
      this.progressFill.nativeElement.style.width = `${Math.max(0, Math.min(1, progress)) * 100}%`;
    }
    const total = this.experiences.length;
    if (!total) return;

    let newActive: number;

    if (progress >= 0.985) {
      newActive = total;
    } else {
      const cards = track.querySelectorAll<HTMLElement>('.exp-card');
      if (!cards.length) return;

      const viewportCenter = window.innerWidth / 2;
      let bestIdx = 0;
      let bestDist = Infinity;
      cards.forEach((card, i) => {
        const r = card.getBoundingClientRect();
        const center = r.left + r.width / 2;
        const dist = Math.abs(center - viewportCenter);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      });
      newActive = bestIdx + 1;
    }

    if (newActive !== this.activeIndex) {
      this.activeIndex = newActive;
      this.cdr.detectChanges();
    }
  }

  resetAnimations(): void {
    if (this.expTrack) {
      gsap.set(this.expTrack.nativeElement, { x: 0 });
    }
    if (this.expSection) {
      this.expSection.nativeElement.style.marginLeft = '';
      this.expSection.nativeElement.style.width = '';
    }
    if (this.progressFill?.nativeElement) {
      this.progressFill.nativeElement.style.width = '0%';
    }
    this.activeIndex = this.experiences.length ? 1 : 0;
    this.animationsInitialized = false;
  }
}
