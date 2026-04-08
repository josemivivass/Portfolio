import {
  Component, ElementRef, ViewChild, AfterViewInit, OnDestroy,
  HostListener, Inject, PLATFORM_ID, ChangeDetectorRef, Input
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TranslationService } from '../../services/translation.service';

interface TrailPoint {
  cx: number;
  cy: number;
  time: number;
}

interface Blob {
  cx: number;
  cy: number;
  vx: number;              // velocidad horizontal (px/s)
  vy: number;              // velocidad vertical (px/s)
  baseR: number;
  radii: number[];         // radio por cada vértice angular — forma irregular
  startTime: number;
  growDur: number;
  holdDur: number;
  fadeDur: number;
  hasTrail: boolean;       // si deja rastro
  trail: TrailPoint[];     // historial de posiciones
  lastTrailTime: number;
  phaseOffset: number;     // offset para movimiento sinusoidal único
}

// ─── Constantes de timing y tamaño ───
const BLOB_INT_MIN   = 800;    // intervalo mínimo entre spawns (ms)
const BLOB_INT_MAX   = 2000;
const BLOB_GROW_MIN  = 600;
const BLOB_GROW_MAX  = 1200;
const BLOB_HOLD_MIN  = 4000;   // duración larga para apreciar el movimiento
const BLOB_HOLD_MAX  = 8000;
const BLOB_FADE_MIN  = 1500;
const BLOB_FADE_MAX  = 3000;
const BLOB_R_MIN     = 50;
const BLOB_R_MAX     = 140;
const MOUSE_GLOW     = 155;

// ─── Constantes de movimiento ───
const SPEED_MIN      = 15;     // px/s mínimo
const SPEED_MAX      = 55;     // px/s máximo
const DRIFT_AMP      = 0.5;    // amplitud de drift sinusoidal adicional

// ─── Constantes de rastro ───
const TRAIL_INTERVAL = 150;    // ms entre capturas de posición
const TRAIL_MAX_AGE  = 1800;   // ms que dura un punto de rastro
const TRAIL_CHANCE   = 0.30;   // 30% de blobs tendrán rastro

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
  @Input() imageOpacity = 1;       // 1 = imágenes visibles, 0 = desvanecidas

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
  private lastFrameTime = 0;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef,
    public i18n: TranslationService
  ) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.resize();
    this.loadImages();
    this.animate();
  }

  ngOnDestroy(): void { cancelAnimationFrame(this.animationId); }

  @HostListener('window:resize')
  onResize(): void { if (isPlatformBrowser(this.platformId)) this.resize(); }

  @HostListener('mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (this.disableInteraction) { this.isMouseIn = false; return; }
    const el = this.canvasRef.nativeElement;
    const r  = el.getBoundingClientRect();
    this.mouseX    = (e.clientX - r.left) * (el.width  / r.width);
    this.mouseY    = (e.clientY - r.top)  * (el.height / r.height);
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
    const done = () => {
      if (++n === 2) { this.isLoaded = true; this.cdr.detectChanges(); }
    };
    this.image1.onload = done;
    this.image2.onload = done;
    this.image1.src = '/images/fondo1.png';
    this.image2.src = '/images/fondo2.png';
  }

  // ─── Blob factory ───────────────────────────────────────────────────────────

  private makeBlob(cx: number, cy: number): Blob {
    const baseR  = BLOB_R_MIN + Math.random() * (BLOB_R_MAX - BLOB_R_MIN);
    const N      = 7 + Math.floor(Math.random() * 5); // 7–11 vértices
    const radii  = Array.from({ length: N }, () => baseR * (0.4 + Math.random() * 0.9));

    // Dirección y velocidad aleatorias
    const angle = Math.random() * Math.PI * 2;
    const speed = SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN);

    return {
      cx, cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      baseR, radii,
      startTime: performance.now(),
      growDur: BLOB_GROW_MIN + Math.random() * (BLOB_GROW_MAX - BLOB_GROW_MIN),
      holdDur: BLOB_HOLD_MIN + Math.random() * (BLOB_HOLD_MAX - BLOB_HOLD_MIN),
      fadeDur: BLOB_FADE_MIN + Math.random() * (BLOB_FADE_MAX - BLOB_FADE_MIN),
      hasTrail: Math.random() < TRAIL_CHANCE,
      trail: [],
      lastTrailTime: 0,
      phaseOffset: Math.random() * Math.PI * 2,
    };
  }

  // ─── Dibujar blob en posición arbitraria ────────────────────────────────────

  private drawBlobAt(
    radii: number[], cx: number, cy: number,
    scale: number, alpha: number, baseR: number
  ): void {
    const ctx = this.ctx;
    const N   = radii.length;
    const blur = Math.max(baseR * 0.22 * scale, 6);

    const pts = radii.map((r, i) => {
      const a = (i / N) * Math.PI * 2;
      return {
        x: cx + Math.cos(a) * r * scale,
        y: cy + Math.sin(a) * r * scale,
      };
    });

    ctx.save();
    ctx.globalAlpha              = alpha;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter                   = `blur(${blur.toFixed(1)}px)`;
    ctx.fillStyle                = 'white';

    ctx.beginPath();
    ctx.moveTo(
      (pts[N - 1].x + pts[0].x) / 2,
      (pts[N - 1].y + pts[0].y) / 2
    );
    for (let i = 0; i < N; i++) {
      const p = pts[i];
      const q = pts[(i + 1) % N];
      ctx.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
    }
    ctx.closePath();
    ctx.fill();

    ctx.filter = 'none';
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

  // ─── Loop principal ─────────────────────────────────────────────────────────

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    if (!this.isLoaded) return;

    const now    = performance.now();
    const dt     = this.lastFrameTime ? (now - this.lastFrameTime) / 1000 : 0.016;
    this.lastFrameTime = now;

    const canvas = this.canvasRef.nativeElement;
    const ctx    = this.ctx;
    const W = canvas.width, H = canvas.height;

    // ── Spawn blob autónomo ──
    if (now >= this.nextBlobAt) {
      this.blobs.push(this.makeBlob(Math.random() * W, Math.random() * H));
      this.nextBlobAt = now + BLOB_INT_MIN + Math.random() * (BLOB_INT_MAX - BLOB_INT_MIN);
    }

    // ── Construir máscara ──
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';

    this.blobs = this.blobs.filter(b => {
      const elapsed = now - b.startTime;
      const total   = b.growDur + b.holdDur + b.fadeDur;
      if (elapsed >= total) return false;

      // ── Movimiento: velocidad lineal + drift sinusoidal ──
      b.cx += b.vx * dt + Math.sin(now * 0.001 + b.phaseOffset) * DRIFT_AMP;
      b.cy += b.vy * dt + Math.cos(now * 0.0008 + b.phaseOffset * 1.5) * DRIFT_AMP;

      // Wrap en los bordes con margen
      const pad = b.baseR * 1.5;
      if (b.cx < -pad) b.cx = W + pad;
      if (b.cx > W + pad) b.cx = -pad;
      if (b.cy < -pad) b.cy = H + pad;
      if (b.cy > H + pad) b.cy = -pad;

      // ── Escala y alfa según fase de vida ──
      let scale: number, alpha: number;
      if (elapsed < b.growDur) {
        const t = elapsed / b.growDur;
        scale   = 1 - Math.pow(1 - t, 3);  // ease-out cúbico
        alpha   = scale * 0.92;
      } else if (elapsed < b.growDur + b.holdDur) {
        scale = 1;
        alpha = 0.92;
      } else {
        const t = (elapsed - b.growDur - b.holdDur) / b.fadeDur;
        scale   = 1;
        alpha   = (1 - t * t) * 0.92;       // ease-in cuadrático
      }

      // ── Rastro irregular (solo algunos blobs) ──
      if (b.hasTrail) {
        // Capturar posición periódicamente
        if (now - b.lastTrailTime > TRAIL_INTERVAL) {
          b.trail.push({ cx: b.cx, cy: b.cy, time: now });
          b.lastTrailTime = now;
        }
        // Eliminar puntos viejos
        b.trail = b.trail.filter(tp => now - tp.time < TRAIL_MAX_AGE);

        // Dibujar fantasmas del rastro (antes que el blob principal)
        for (const tp of b.trail) {
          const age        = (now - tp.time) / TRAIL_MAX_AGE;
          const trailAlpha = alpha * (1 - age) * 0.35;
          const trailScale = scale * (1 - age * 0.4);
          if (trailAlpha > 0.01) {
            this.drawBlobAt(b.radii, tp.cx, tp.cy, trailScale, trailAlpha, b.baseR);
          }
        }
      }

      // ── Blob principal ──
      this.drawBlobAt(b.radii, b.cx, b.cy, scale, alpha, b.baseR);
      return true;
    });

    // ── Halo suave del ratón ──
    if (this.isMouseIn && !this.disableInteraction) {
      const g = ctx.createRadialGradient(
        this.mouseX, this.mouseY, 0,
        this.mouseX, this.mouseY, MOUSE_GLOW
      );
      g.addColorStop(0,    'rgba(255,255,255,0.92)');
      g.addColorStop(0.4,  'rgba(255,255,255,0.6)');
      g.addColorStop(0.78, 'rgba(255,255,255,0.15)');
      g.addColorStop(1,    'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(this.mouseX, this.mouseY, MOUSE_GLOW, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Recortar imagen 2 a la máscara (con opacity del scroll) ──
    ctx.globalCompositeOperation = 'source-in';
    ctx.globalAlpha = this.imageOpacity;
    this.drawImageCover(this.image2);

    // ── Imagen 1 de fondo (con opacity del scroll) ──
    ctx.globalCompositeOperation = 'destination-over';
    ctx.globalAlpha = this.imageOpacity;
    this.drawImageCover(this.image1);

    // ── Reset estado ──
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };
}
