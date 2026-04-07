import {
  Component, ElementRef, ViewChild, AfterViewInit, OnDestroy,
  HostListener, Inject, PLATFORM_ID, ChangeDetectorRef, Input
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

// Sub-círculo relativo al centro del blob
interface SubCircle { dx: number; dy: number; r: number; }

// Un blob con ciclo de vida: crece → aguanta → desaparece
interface Blob {
  cx: number;
  cy: number;
  circles: SubCircle[];
  startTime: number;
  growDur:  number; // ms
  holdDur:  number; // ms
  fadeDur:  number; // ms
}

// ── Parámetros ────────────────────────────────────────────────────────────────
const BLOB_INT_MIN  = 700;   // ms — intervalo mínimo entre blobs
const BLOB_INT_MAX  = 1600;  // ms — intervalo máximo
const BLOB_GROW_MIN = 450;   // ms — duración del crecimiento
const BLOB_GROW_MAX = 850;
const BLOB_HOLD_MIN = 600;   // ms — cuánto tiempo se mantiene visible
const BLOB_HOLD_MAX = 1800;
const BLOB_FADE_MIN = 550;   // ms — duración del desvanecimiento
const BLOB_FADE_MAX = 1050;
const BLOB_R_MIN    = 55;    // px — radio base mínimo del blob
const BLOB_R_MAX    = 135;   // px — radio base máximo
const MOUSE_GLOW    = 155;   // px — radio del halo del ratón

@Component({
  selector: 'app-reveal-complex',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reveal-complex.component.html',
  styleUrls: ['./reveal-complex.component.css']
})
export class RevealComplexComponent implements AfterViewInit, OnDestroy {
  @ViewChild('trailCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() disableInteraction = false;

  private ctx!: CanvasRenderingContext2D;
  private animationId = 0;
  private image1 = new Image();
  private image2 = new Image();
  isLoaded = false;

  private blobs: Blob[] = [];
  private nextBlobAt = 0;

  private mouseX = 0;
  private mouseY = 0;
  private isMouseIn = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.resize();
    this.loadImages();
    this.animate();
  }

  ngOnDestroy(): void { cancelAnimationFrame(this.animationId); }

  // ─── Eventos ────────────────────────────────────────────────────────────────

  @HostListener('window:resize')
  onResize(): void { if (isPlatformBrowser(this.platformId)) this.resize(); }

  @HostListener('mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (this.disableInteraction) { this.isMouseIn = false; return; }
    const el = this.canvasRef.nativeElement;
    const r  = el.getBoundingClientRect();
    this.mouseX  = (e.clientX - r.left) * (el.width  / r.width);
    this.mouseY  = (e.clientY - r.top)  * (el.height / r.height);
    this.isMouseIn = true;
  }

  @HostListener('mouseleave')
  onMouseLeave(): void { this.isMouseIn = false; }

  // ─── Setup ──────────────────────────────────────────────────────────────────

  private resize(): void {
    const el = this.canvasRef.nativeElement;
    el.width  = window.innerWidth;
    el.height = window.innerHeight;
  }

  private loadImages(): void {
    let n = 0;
    const done = () => { if (++n === 2) { this.isLoaded = true; this.cdr.detectChanges(); } };
    this.image1.onload = done;
    this.image2.onload = done;
    this.image1.src = '/images/fondo1.png';
    this.image2.src = '/images/fondo2.png';
  }

  // ─── Creación de blobs irregulares ──────────────────────────────────────────

  private createBlob(cx: number, cy: number): Blob {
    const mainR   = BLOB_R_MIN + Math.random() * (BLOB_R_MAX - BLOB_R_MIN);
    const count   = 4 + Math.floor(Math.random() * 4); // 4–7 sub-círculos
    const circles: SubCircle[] = [];

    // Núcleo central (siempre presente)
    circles.push({ dx: 0, dy: 0, r: mainR });

    // Satélites: offsets aleatorios, radios variados → forma orgánica
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist  = mainR * (0.15 + Math.random() * 0.65);
      const r     = mainR * (0.35 + Math.random() * 0.55);
      circles.push({
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        r,
      });
    }

    return {
      cx, cy, circles,
      startTime: performance.now(),
      growDur:  BLOB_GROW_MIN + Math.random() * (BLOB_GROW_MAX - BLOB_GROW_MIN),
      holdDur:  BLOB_HOLD_MIN + Math.random() * (BLOB_HOLD_MAX - BLOB_HOLD_MIN),
      fadeDur:  BLOB_FADE_MIN + Math.random() * (BLOB_FADE_MAX - BLOB_FADE_MIN),
    };
  }

  // ─── Dibujar un blob en el contexto actual ──────────────────────────────────

  private drawBlob(blob: Blob, scale: number, alpha: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'source-over';

    for (const c of blob.circles) {
      const x = blob.cx + c.dx * scale;
      const y = blob.cy + c.dy * scale;
      const r = c.r * scale;
      if (r < 0.5) continue;

      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0,    'rgba(255,255,255,1)');
      g.addColorStop(0.55, 'rgba(255,255,255,0.75)');
      g.addColorStop(0.85, 'rgba(255,255,255,0.2)');
      g.addColorStop(1,    'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ─── Imagen cover ───────────────────────────────────────────────────────────

  private drawImageCover(img: HTMLImageElement): void {
    const W = this.ctx.canvas.width, H = this.ctx.canvas.height;
    const cR = W / H, iR = img.width / img.height;
    let rW: number, rH: number, x: number, y: number;
    if (iR > cR) { rH = H; rW = img.width * H / img.height; x = (W - rW) / 2; y = 0; }
    else          { rW = W; rH = img.height * W / img.width;  x = 0; y = (H - rH) / 2; }
    this.ctx.drawImage(img, x, y, rW, rH);
  }

  // ─── Loop ───────────────────────────────────────────────────────────────────

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    if (!this.isLoaded) return;

    const now    = performance.now();
    const canvas = this.canvasRef.nativeElement;
    const ctx    = this.ctx;
    const W = canvas.width, H = canvas.height;

    // Generar nuevo blob autónomo
    if (now >= this.nextBlobAt) {
      this.blobs.push(this.createBlob(
        Math.random() * W,
        Math.random() * H
      ));
      this.nextBlobAt = now + BLOB_INT_MIN + Math.random() * (BLOB_INT_MAX - BLOB_INT_MIN);
    }

    // ── Construir máscara del frame actual ──────────────────────────────────
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';

    // Blobs autónomos — ciclo: crecer → aguantar → desvanecer
    this.blobs = this.blobs.filter(b => {
      const elapsed = now - b.startTime;
      const total   = b.growDur + b.holdDur + b.fadeDur;
      if (elapsed >= total) return false; // eliminar blob caducado

      let scale: number, alpha: number;

      if (elapsed < b.growDur) {
        // Crecimiento con ease-out cúbico
        const t = elapsed / b.growDur;
        scale = 1 - Math.pow(1 - t, 3);
        alpha = scale;
      } else if (elapsed < b.growDur + b.holdDur) {
        // Pleno — visible al máximo
        scale = 1;
        alpha = 1;
      } else {
        // Desvanecimiento ease-in cuadrático
        const t = (elapsed - b.growDur - b.holdDur) / b.fadeDur;
        scale = 1;
        alpha = 1 - t * t;
      }

      this.drawBlob(b, scale, alpha);
      return true;
    });

    // Halo del ratón — solo visible mientras el cursor está dentro
    if (this.isMouseIn && !this.disableInteraction) {
      const g = ctx.createRadialGradient(
        this.mouseX, this.mouseY, 0,
        this.mouseX, this.mouseY, MOUSE_GLOW
      );
      g.addColorStop(0,    'rgba(255,255,255,0.9)');
      g.addColorStop(0.4,  'rgba(255,255,255,0.6)');
      g.addColorStop(0.75, 'rgba(255,255,255,0.15)');
      g.addColorStop(1,    'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(this.mouseX, this.mouseY, MOUSE_GLOW, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Composite final ─────────────────────────────────────────────────────
    // Recortar imagen 2 a la máscara (blobs + halo)
    ctx.globalCompositeOperation = 'source-in';
    this.drawImageCover(this.image2);

    // Imagen 1 de fondo completa
    ctx.globalCompositeOperation = 'destination-over';
    this.drawImageCover(this.image1);

    ctx.globalCompositeOperation = 'source-over';
  };
}
