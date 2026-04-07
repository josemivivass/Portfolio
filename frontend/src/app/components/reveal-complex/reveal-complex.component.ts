import {
  Component, ElementRef, ViewChild, AfterViewInit, OnDestroy,
  HostListener, Inject, PLATFORM_ID, ChangeDetectorRef, Input
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

interface Blob {
  cx: number;
  cy: number;
  baseR: number;
  radii: number[];   // radio por cada vértice angular — define la forma irregular
  startTime: number;
  growDur: number;
  holdDur: number;
  fadeDur: number;
}

const BLOB_INT_MIN  = 650;
const BLOB_INT_MAX  = 1500;
const BLOB_GROW_MIN = 400;
const BLOB_GROW_MAX = 800;
const BLOB_HOLD_MIN = 500;
const BLOB_HOLD_MAX = 1600;
const BLOB_FADE_MIN = 500;
const BLOB_FADE_MAX = 1000;
const BLOB_R_MIN    = 60;
const BLOB_R_MAX    = 150;
const MOUSE_GLOW    = 155;

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
    // Cada radio varía entre 40% y 130% del radio base → formas muy irregulares
    const radii  = Array.from({ length: N }, () => baseR * (0.4 + Math.random() * 0.9));
    return {
      cx, cy, baseR, radii,
      startTime: performance.now(),
      growDur: BLOB_GROW_MIN + Math.random() * (BLOB_GROW_MAX - BLOB_GROW_MIN),
      holdDur: BLOB_HOLD_MIN + Math.random() * (BLOB_HOLD_MAX - BLOB_HOLD_MIN),
      fadeDur: BLOB_FADE_MIN + Math.random() * (BLOB_FADE_MAX - BLOB_FADE_MIN),
    };
  }

  // ─── Dibujar blob irregular con blur ────────────────────────────────────────
  //
  // Construye un path de bezier cuadráticas a través de N vértices a radios
  // distintos. El relleno blanco + blur del canvas crea bordes suaves orgánicos.

  private drawBlob(blob: Blob, scale: number, alpha: number): void {
    const ctx  = this.ctx;
    const N    = blob.radii.length;
    const blur = Math.max(blob.baseR * 0.22 * scale, 6);

    const pts = blob.radii.map((r, i) => {
      const angle = (i / N) * Math.PI * 2;
      return {
        x: blob.cx + Math.cos(angle) * r * scale,
        y: blob.cy + Math.sin(angle) * r * scale,
      };
    });

    ctx.save();
    ctx.globalAlpha              = alpha;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter                   = `blur(${blur.toFixed(1)}px)`;
    ctx.fillStyle                = 'white';

    // Path suave: quadraticCurveTo hacia el punto medio entre vértices consecutivos
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

  // ─── Loop ───────────────────────────────────────────────────────────────────

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    if (!this.isLoaded) return;

    const now    = performance.now();
    const canvas = this.canvasRef.nativeElement;
    const ctx    = this.ctx;
    const W = canvas.width, H = canvas.height;

    // Spawn blob autónomo
    if (now >= this.nextBlobAt) {
      this.blobs.push(this.makeBlob(Math.random() * W, Math.random() * H));
      this.nextBlobAt = now + BLOB_INT_MIN + Math.random() * (BLOB_INT_MAX - BLOB_INT_MIN);
    }

    // Construir máscara: blobs + halo del ratón
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';

    // Blobs autónomos con ciclo crecer → aguantar → desvanecer
    this.blobs = this.blobs.filter(b => {
      const elapsed = now - b.startTime;
      const total   = b.growDur + b.holdDur + b.fadeDur;
      if (elapsed >= total) return false;

      let scale: number, alpha: number;
      if (elapsed < b.growDur) {
        const t = elapsed / b.growDur;
        scale   = 1 - Math.pow(1 - t, 3); // ease-out cúbico
        alpha   = scale * 0.92;
      } else if (elapsed < b.growDur + b.holdDur) {
        scale = 1;
        alpha = 0.92;
      } else {
        const t = (elapsed - b.growDur - b.holdDur) / b.fadeDur;
        scale   = 1;
        alpha   = (1 - t * t) * 0.92; // ease-in cuadrático
      }

      this.drawBlob(b, scale, alpha);
      return true;
    });

    // Halo suave del ratón (desaparece al salir)
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

    // Recortar imagen 2 a la máscara del frame
    ctx.globalCompositeOperation = 'source-in';
    this.drawImageCover(this.image2);

    // Imagen 1 de fondo
    ctx.globalCompositeOperation = 'destination-over';
    this.drawImageCover(this.image1);

    ctx.globalCompositeOperation = 'source-over';
  };
}
