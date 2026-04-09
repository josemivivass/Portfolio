import {
  Component, ElementRef, ViewChild, AfterViewInit, OnDestroy,
  HostListener, Inject, PLATFORM_ID, Input
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TranslationService } from '../../services/translation.service';

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

  @Input() imageOpacity = 1;
  @Input() hoverIntensity = 1;

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
    }, 0);
  }

  ngOnDestroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
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