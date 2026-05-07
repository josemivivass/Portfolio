import {
  Component, ElementRef, ViewChild, AfterViewInit, OnDestroy,
  Inject, PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BackgroundThemeService } from '../../services/background-theme.service';

const PARTICLE_COUNT = 150;
const CONNECT_DIST   = 160;
const MOUSE_RADIUS   = 180;

const SPHERE_N         = 400;
const SPHERE_DEFAULT_R = 240;

@Component({
  selector: 'app-background',
  standalone: true,
  templateUrl: './background.component.html',
  styleUrls: ['./background.component.css']
})
export class BackgroundComponent implements AfterViewInit, OnDestroy {
  @ViewChild('bgCanvas',     { static: true }) private bgCanvasRef!:     ElementRef<HTMLCanvasElement>;
  @ViewChild('sphereCanvas', { static: true }) private sphereCanvasRef!: ElementRef<HTMLCanvasElement>;

  private bgCtx!:     CanvasRenderingContext2D;
  private sphereCtx!: CanvasRenderingContext2D;

  private W = 0;
  private H = 0;
  private dpr = 1;
  private rafId = 0;

  // ─── Red de partículas ───────────────────────────────────────────────
  private particles: Array<{
    x: number; y: number; vx: number; vy: number;
    r: number; phase: number;
  }> = [];

  private mouseX  = -9999;
  private mouseY  = -9999;
  private targetX = -9999;
  private targetY = -9999;
  private time = 0;

  // ─── Esfera 3D ───────────────────────────────────────────────────────
  private spherePoints: Array<{ x: number; y: number; z: number }> = [];
  private sphereEdges:  Array<{ a: number; b: number }> = [];
  private sphereR = SPHERE_DEFAULT_R;

  private rotX  = 0;
  private rotY  = 0;
  private vRotX = 0.001;
  private vRotY = 0.001;
  private tRotX = 0.001;
  private tRotY = 0.001;

  // Centro de la esfera en pantalla — tomado de la posición del .hero-avatar
  private sphereCenterX = 0;
  private sphereCenterY = 0;
  private hasAvatar = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private theme: BackgroundThemeService
  ) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.dpr       = Math.min(window.devicePixelRatio || 1, 2);
    this.bgCtx     = this.bgCanvasRef.nativeElement.getContext('2d')!;
    this.sphereCtx = this.sphereCanvasRef.nativeElement.getContext('2d', { alpha: true })!;

    this.resize();
    this.initParticles();
    this.generateSphere();

    window.addEventListener('mousemove',  this.onMouseMove);
    window.addEventListener('mouseleave', this.onMouseLeave);
    window.addEventListener('resize',     this.onResize);

    this.animate();
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('mousemove',  this.onMouseMove);
    window.removeEventListener('mouseleave', this.onMouseLeave);
    window.removeEventListener('resize',     this.onResize);
  }

  // ─── Handlers ────────────────────────────────────────────────────────

  private onMouseMove = (e: MouseEvent): void => {
    this.targetX = e.clientX;
    this.targetY = e.clientY;
    if (this.W > 0 && this.H > 0) {
      const xPct = (e.clientX / this.W) - 0.5;
      const yPct = (e.clientY / this.H) - 0.5;
      this.tRotY = xPct * 0.015;
      this.tRotX = yPct * 0.015;
    }
  };

  private onMouseLeave = (): void => {
    this.targetX = -9999;
    this.targetY = -9999;
    this.tRotX = 0.001;
    this.tRotY = 0.001;
  };

  private onResize = (): void => this.resize();

  private resize(): void {
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    for (const c of [this.bgCanvasRef.nativeElement, this.sphereCanvasRef.nativeElement]) {
      c.width  = this.W * this.dpr;
      c.height = this.H * this.dpr;
      c.style.width  = this.W + 'px';
      c.style.height = this.H + 'px';
    }
    this.bgCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.sphereCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  // ─── Inicialización ──────────────────────────────────────────────────

  private initParticles(): void {
    this.particles.length = 0;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particles.push({
        x: Math.random() * this.W,
        y: Math.random() * this.H,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: 1.2 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  private generateSphere(): void {
    this.spherePoints.length = 0;
    this.sphereEdges.length  = 0;

    const phi = Math.PI * (3 - Math.sqrt(5));
    const N   = SPHERE_N;
    const R   = this.sphereR;

    for (let i = 0; i < N; i++) {
      const y         = 1 - (i / (N - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta     = phi * i;
      this.spherePoints.push({
        x: Math.cos(theta) * radiusAtY * R,
        y: y * R,
        z: Math.sin(theta) * radiusAtY * R
      });
    }

    const threshold = R * 0.26;
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = this.spherePoints[i].x - this.spherePoints[j].x;
        const dy = this.spherePoints[i].y - this.spherePoints[j].y;
        const dz = this.spherePoints[i].z - this.spherePoints[j].z;
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) < threshold) {
          this.sphereEdges.push({ a: i, b: j });
        }
      }
    }
  }

  // ─── Helpers de color ────────────────────────────────────────────────

  private cssVar(name: string, fallback: string): string {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  private hexToRgb(hex: string): [number, number, number] {
    let h = hex.replace(/^#/, '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const i = parseInt(h, 16);
    return [(i >> 16) & 255, (i >> 8) & 255, i & 255];
  }

  private lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

  // ─── Posición de la esfera = centro del .hero-avatar ─────────────────

  private updateAvatarPosition(): void {
    const avatar = document.querySelector('.hero-avatar') as HTMLElement | null;
    if (!avatar) { this.hasAvatar = false; return; }
    const rect = avatar.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) { this.hasAvatar = false; return; }

    this.sphereCenterX = rect.left + rect.width  / 2;
    this.sphereCenterY = rect.top  + rect.height / 2;
    this.hasAvatar = true;

    // La esfera tiene el mismo diámetro que la foto: R = ancho del avatar / 2.
    const desiredR = rect.width / 2;
    if (Math.abs(desiredR - this.sphereR) > 1) {
      this.sphereR = desiredR;
      this.generateSphere();
    }
  }

  // ─── Loop principal ──────────────────────────────────────────────────

  private animate = (): void => {
    this.rafId = requestAnimationFrame(this.animate);
    this.updateAvatarPosition();
    this.drawParticles();
    this.drawSphere();
  };

  private drawParticles(): void {
    const ctx = this.bgCtx;
    const W   = this.W;
    const H   = this.H;

    this.time += 0.005;
    this.mouseX += (this.targetX - this.mouseX) * 0.08;
    this.mouseY += (this.targetY - this.mouseY) * 0.08;

    // ── Fondo: lerp entre tema claro (--c-bg) y oscuro (#24292b).
    // Equivale al `scene.background` que tenía el componente Three.js antiguo.
    const themeP = this.theme.progress;
    const [bgLR, bgLG, bgLB] = this.hexToRgb(this.cssVar('--c-bg', '#f8f9fa'));
    const bgR = Math.round(this.lerp(bgLR, 0x24, themeP));
    const bgG = Math.round(this.lerp(bgLG, 0x29, themeP));
    const bgB = Math.round(this.lerp(bgLB, 0x2b, themeP));
    ctx.fillStyle = `rgb(${bgR}, ${bgG}, ${bgB})`;
    ctx.fillRect(0, 0, W, H);

    // ── Color base de partículas/líneas: gris en claro → blanco en oscuro
    const baseR = Math.round(this.lerp(100, 255, themeP));
    const baseG = Math.round(this.lerp(110, 255, themeP));
    const baseB = Math.round(this.lerp(120, 255, themeP));
    const baseRgb = `${baseR}, ${baseG}, ${baseB}`;

    // ── Acento: azul de marca (constante, no depende del tema)
    const [pr, pg, pb] = this.hexToRgb(this.cssVar('--c-primary', '#007bff'));
    const primaryRgb = `${pr}, ${pg}, ${pb}`;

    // ── Repulsión por la esfera: usa el centro del avatar y un radio
    // proporcional al de la esfera para que escale en móvil.
    const sphereVisible = this.hasAvatar;
    const sphereScreenX = this.sphereCenterX;
    const sphereScreenY = this.sphereCenterY;
    const sphereRepulsion = this.sphereR + 20;

    // ── Actualizar partículas
    for (const p of this.particles) {
      p.vx += Math.sin(this.time + p.phase) * 0.0015;
      p.vy += Math.cos(this.time * 0.8 + p.phase * 1.6) * 0.0015;

      const dxM = p.x - this.mouseX;
      const dyM = p.y - this.mouseY;
      const dM  = Math.sqrt(dxM * dxM + dyM * dyM);
      if (dM < MOUSE_RADIUS && dM > 0.5) {
        const f = (1 - dM / MOUSE_RADIUS) * 0.8;
        p.vx += (dxM / dM) * f;
        p.vy += (dyM / dM) * f;
      }

      if (sphereVisible) {
        const dxS = p.x - sphereScreenX;
        const dyS = p.y - sphereScreenY;
        const dS  = Math.sqrt(dxS * dxS + dyS * dyS);
        if (dS < sphereRepulsion && dS > 0) {
          const f = Math.pow((sphereRepulsion - dS) / sphereRepulsion, 2) * 1.2;
          p.vx += (dxS / dS) * f;
          p.vy += (dyS / dS) * f;
        }
      }

      p.vx *= 0.96;
      p.vy *= 0.96;
      p.x  += p.vx;
      p.y  += p.vy;

      if (p.x < -20)     p.x = W + 20;
      if (p.x > W + 20)  p.x = -20;
      if (p.y < -20)     p.y = H + 20;
      if (p.y > H + 20)  p.y = -20;
    }

    // ── Conexiones
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      for (let j = i + 1; j < this.particles.length; j++) {
        const q = this.particles[j];
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < CONNECT_DIST) {
          const a = (1 - d / CONNECT_DIST) * 0.18;
          const midX = (p.x + q.x) / 2;
          const midY = (p.y + q.y) / 2;
          const mdx  = midX - this.mouseX;
          const mdy  = midY - this.mouseY;
          const md   = Math.sqrt(mdx * mdx + mdy * mdy);
          if (md < MOUSE_RADIUS) {
            const t = 1 - md / MOUSE_RADIUS;
            ctx.strokeStyle = `rgba(${primaryRgb}, ${a + t * 0.35})`;
            ctx.lineWidth   = 0.6 + t * 0.8;
          } else {
            ctx.strokeStyle = `rgba(${baseRgb}, ${a})`;
            ctx.lineWidth   = 0.6;
          }
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
    }

    // ── Puntos
    for (const p of this.particles) {
      const dx   = p.x - this.mouseX;
      const dy   = p.y - this.mouseY;
      const d    = Math.sqrt(dx * dx + dy * dy);
      const near = d < MOUSE_RADIUS ? (1 - d / MOUSE_RADIUS) : 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + near * 1.2, 0, Math.PI * 2);
      if (near > 0.05) {
        ctx.fillStyle = `rgba(${primaryRgb}, ${0.55 + near * 0.4})`;
      } else {
        ctx.fillStyle = `rgba(${baseRgb}, 0.45)`;
      }
      ctx.fill();
    }
  }

  private drawSphere(): void {
    const ctx = this.sphereCtx;
    ctx.clearRect(0, 0, this.W, this.H);
    if (!this.hasAvatar) return;

    this.vRotX += (this.tRotX - this.vRotX) * 0.05;
    this.vRotY += (this.tRotY - this.vRotY) * 0.05;
    this.rotX  += this.vRotX;
    this.rotY  += this.vRotY;

    const cx = Math.cos(this.rotX), sx = Math.sin(this.rotX);
    const cy = Math.cos(this.rotY), sy = Math.sin(this.rotY);

    const R       = this.sphereR;
    const cxScr   = this.sphereCenterX;
    const cyScr   = this.sphereCenterY;
    const N       = this.spherePoints.length;
    const zOffset = 1000;

    const projected: Array<{ x: number; y: number; z: number; scale: number }> = new Array(N);
    for (let i = 0; i < N; i++) {
      const p  = this.spherePoints[i];
      const x1 = p.x * cy - p.z * sy;
      const z1 = p.x * sy + p.z * cy;
      const y2 = p.y * cx - z1 * sx;
      const z2 = p.y * sx + z1 * cx;
      const scale = zOffset / (zOffset + z2);
      projected[i] = {
        x: cxScr + x1 * scale,
        y: cyScr + y2 * scale,
        z: z2,
        scale
      };
    }

    const sphereRgb = '255, 255, 255';

    // Solo se dibuja la mitad delantera de la esfera (z < 0). La mitad
    // trasera queda oculta tras la foto: como la esfera comparte diámetro
    // con el avatar y la cámara está delante, los puntos traseros caen
    // siempre dentro de la silueta de la foto y no deben pintarse encima.
    ctx.lineWidth = 0.3;
    for (const e of this.sphereEdges) {
      const p1 = projected[e.a];
      const p2 = projected[e.b];
      const avgZ  = (p1.z + p2.z) / 2;
      if (avgZ > 0) continue;
      const zRatio = (avgZ + R) / (R * 2);
      const alpha = Math.max(0.02, (1 - zRatio) * 0.6);
      ctx.strokeStyle = `rgba(${sphereRgb}, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    for (const p of projected) {
      if (p.z > 0) continue;
      const zRatio = (p.z + R) / (R * 2);
      const alpha   = Math.max(0.1, 1 - zRatio);
      const dotSize = Math.max(0.3, 1.2 * p.scale);
      ctx.fillStyle = `rgba(${sphereRgb}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, dotSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
