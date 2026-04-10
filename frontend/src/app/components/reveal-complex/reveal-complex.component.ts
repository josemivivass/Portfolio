import {
  Component, ElementRef, ViewChild, AfterViewInit, OnDestroy,
  HostListener, Inject, PLATFORM_ID, Input
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TranslationService } from '../../services/translation.service';
import { gsap } from 'gsap';

const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

const CHAR_W = 6.6;
const CHAR_H = 16.5;

@Component({
  selector: 'app-reveal-complex',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reveal-complex.component.html',
  styleUrls: ['./reveal-complex.component.css']
})
export class RevealComplexComponent implements AfterViewInit, OnDestroy {
  @ViewChild('staticWrapperEl', { static: true }) private staticWrapperEl!: ElementRef<HTMLDivElement>;
  @ViewChild('ambientEl',       { static: true }) private ambientEl!:       ElementRef<HTMLDivElement>;
  @ViewChild('centerGlowEl',    { static: true }) private centerGlowEl!:    ElementRef<HTMLDivElement>;
  @ViewChild('hoverEl',         { static: true }) private hoverEl!:         ElementRef<HTMLDivElement>;
  @ViewChild('nameLetters',     { static: true }) private nameLetters!:     ElementRef<HTMLDivElement>;

  @Input() imageOpacity = 1;
  @Input() hoverIntensity = 1;

  readonly nameChars = 'José Miguel Vivas Sánchez'.split('');

  // 4 triangles with apex slightly past center so they overlap and leave no visible seam
  readonly fragClips = [
    'polygon(-2% -2%, 102% -2%, 50% 56%)',    // top    — apex pushed below center
    'polygon(102% -2%, 102% 102%, 44% 50%)',   // right  — apex pushed left of center
    'polygon(102% 102%, -2% 102%, 50% 44%)',   // bottom — apex pushed above center
    'polygon(-2% 102%, -2% -2%, 56% 50%)',     // left   — apex pushed right of center
  ];

  private nameTl: gsap.core.Timeline | null = null;
  private rafId: number | null = null;
  private pendingX = 0;
  private pendingY = 0;
  private ambientStr = '';
  private screenCharCount = 0;
  private lastTextUpdate = 0;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    public i18n: TranslationService
  ) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    setTimeout(() => {
      this.fillAmbient();
      this.initNameAnimation();
    }, 0);
  }

  ngOnDestroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.nameTl?.kill();
  }

  private initNameAnimation(): void {
    const container = this.nameLetters.nativeElement;
    const frags = Array.from(container.querySelectorAll<HTMLSpanElement>('.char-frag'));

    // Scatter each fragment to an independent random position
    frags.forEach(el => {
      gsap.set(el, {
        x:               this.getRandom(-700, 700),
        y:               this.getRandom(-450, 450),
        rotation:        this.getRandom(-720, 720),
        scale:           0,
        opacity:         0,
        transformOrigin: '50% 50%'
      });
    });

    this.nameTl = gsap.timeline({ repeat: -1, repeatDelay: 1.8, yoyo: true });

    this.nameTl.to(frags, {
      x:        0,
      y:        0,
      opacity:  1,
      scale:    1,
      rotation: 0,
      ease:     'power4.inOut',
      duration: 1.2,
      stagger:  0.018
    });

    // Hover: slow motion on enter, normal on leave
    container.addEventListener('mouseenter', () => this.nameTl?.timeScale(0.15));
    container.addEventListener('mouseleave', () => this.nameTl?.timeScale(1));
  }

  private getRandom(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  @HostListener('window:resize')
  onResize(): void {
    if (isPlatformBrowser(this.platformId)) this.fillAmbient();
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    this.pendingX = e.clientX;
    this.pendingY = e.clientY;

    if (this.rafId === null) {
      this.rafId = requestAnimationFrame((timestamp) => this.updateHover(timestamp));
    }
  }

  @HostListener('window:mouseleave')
  onMouseLeave(): void {
    this.hoverEl.nativeElement.style.opacity = '0';
    // Mueve el "agujero" invertido fuera de la pantalla
    this.staticWrapperEl.nativeElement.style.setProperty('--x', '-9999px');
    this.staticWrapperEl.nativeElement.style.setProperty('--y', '-9999px');
  }

  private updateHover(timestamp: number): void {
    this.rafId = null;

    const intensity = Math.max(0, Math.min(1, this.hoverIntensity));
    const hoverDiv   = this.hoverEl.nativeElement;
    const staticWrap = this.staticWrapperEl.nativeElement;

    if (intensity <= 0) {
      hoverDiv.style.opacity = '0';
      staticWrap.style.setProperty('--x', '-9999px');
      staticWrap.style.setProperty('--y', '-9999px');
      return;
    }

    const rect = hoverDiv.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const scaleX = window.innerWidth  / rect.width;
    const scaleY = window.innerHeight / rect.height;
    const localX = (this.pendingX - rect.left) * scaleX;
    const localY = (this.pendingY - rect.top)  * scaleY;

    // Actualiza coordenadas del brillo dinámico
    hoverDiv.style.setProperty('--x', `${localX}px`);
    hoverDiv.style.setProperty('--y', `${localY}px`);
    hoverDiv.style.opacity = `${intensity}`;

    // Sincroniza el "agujero" en el contenedor de las capas estáticas
    staticWrap.style.setProperty('--x', `${localX}px`);
    staticWrap.style.setProperty('--y', `${localY}px`);

    if (timestamp - this.lastTextUpdate > 80) {
      hoverDiv.textContent = this.randomStr(this.screenCharCount || 16000);
      this.lastTextUpdate = timestamp;
    }
  }

  private fillAmbient(): void {
    const cols = Math.ceil(window.innerWidth  / CHAR_W);
    const rows = Math.ceil(window.innerHeight / CHAR_H) + 3;
    this.screenCharCount = cols * rows;

    this.ambientStr = this.randomStr(this.screenCharCount * 2);
    
    // TODAS las capas reciben exactamente la misma cadena inicial para garantizar alineación
    this.ambientEl.nativeElement.textContent    = this.ambientStr;
    this.centerGlowEl.nativeElement.textContent = this.ambientStr;
    this.hoverEl.nativeElement.textContent      = this.ambientStr;
  }

  private randomStr(n: number): string {
    const src = CHARS;
    const len = src.length;
    let s = '';
    for (let i = 0; i < n; i++) s += src[Math.floor(Math.random() * len)];
    return s;
  }
}