import {
  Component, ElementRef, ViewChild, AfterViewInit, OnDestroy,
  Inject, PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BackgroundThemeService } from '../../services/background-theme.service';

const PARTICLE_COUNT_DESKTOP = 150;
const PARTICLE_COUNT_MOBILE  = 60;
const CONNECT_DIST            = 160;
const MOUSE_RADIUS            = 180;
const MOBILE_BREAKPOINT_PX    = 850;

@Component({
  selector: 'app-background',
  standalone: true,
  templateUrl: './background.component.html',
  styleUrls: ['./background.component.css']
})
export class BackgroundComponent implements AfterViewInit, OnDestroy {
  @ViewChild('bgCanvas', { static: true }) private bgCanvasRef!: ElementRef<HTMLCanvasElement>;

  private bgCtx!: CanvasRenderingContext2D;

  private W = 0;
  private H = 0;
  private dpr = 1;
  private rafId = 0;

  private particles: Array<{
    x: number; y: number; vx: number; vy: number;
    r: number; phase: number;
  }> = [];

  private mouseX  = -9999;
  private mouseY  = -9999;
  private targetX = -9999;
  private targetY = -9999;
  private time = 0;

  private cachedStickyTopEl: HTMLElement | null = null;

  private isMobile = false;
  private particleCount = PARTICLE_COUNT_DESKTOP;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private theme: BackgroundThemeService
  ) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.applyDeviceProfile();
    this.bgCtx = this.bgCanvasRef.nativeElement.getContext('2d')!;

    this.resize();
    this.initParticles();

    window.addEventListener('mousemove',  this.onMouseMove);
    window.addEventListener('mouseleave', this.onMouseLeave);
    window.addEventListener('resize',     this.onResize);

    this.animate();
  }

  private applyDeviceProfile(): void {
    this.isMobile = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`).matches;
    this.particleCount = this.isMobile ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT_DESKTOP;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.isMobile ? 1.5 : 2);
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('mousemove',  this.onMouseMove);
    window.removeEventListener('mouseleave', this.onMouseLeave);
    window.removeEventListener('resize',     this.onResize);
  }

  private onMouseMove = (e: MouseEvent): void => {
    this.targetX = e.clientX;
    this.targetY = e.clientY;
  };

  private onMouseLeave = (): void => {
    this.targetX = -9999;
    this.targetY = -9999;
  };

  private onResize = (): void => {
    const wasMobile = this.isMobile;
    this.applyDeviceProfile();
    this.resize();
    if (wasMobile !== this.isMobile) this.initParticles();
  };

  private getMenuSplitY(): number {
    if (!this.cachedStickyTopEl || !document.body.contains(this.cachedStickyTopEl)) {
      this.cachedStickyTopEl = document.querySelector('.showcase-sticky-top') as HTMLElement | null;
    }
    if (!this.cachedStickyTopEl) return window.innerHeight + 1;
    const rect = this.cachedStickyTopEl.getBoundingClientRect();
    return (rect.top + rect.bottom) / 2;
  }

  private resize(): void {
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    
    const c = this.bgCanvasRef.nativeElement;
    c.width  = this.W * this.dpr;
    c.height = this.H * this.dpr;
    c.style.width  = this.W + 'px';
    c.style.height = this.H + 'px';
    
    this.bgCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private initParticles(): void {
    this.particles.length = 0;
    for (let i = 0; i < this.particleCount; i++) {
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

  private animate = (): void => {
    this.rafId = requestAnimationFrame(this.animate);
    this.drawParticles();
  };

  private drawParticles(): void {
    const ctx = this.bgCtx;
    const W   = this.W;
    const H   = this.H;

    this.time += 0.005;
    this.mouseX += (this.targetX - this.mouseX) * 0.08;
    this.mouseY += (this.targetY - this.mouseY) * 0.08;

    const themeP = this.theme.progress;
    const [bgLR, bgLG, bgLB] = this.hexToRgb(this.cssVar('--c-bg', '#f8f9fa'));

    const themedBgR = Math.round(this.lerp(bgLR, 0x24, themeP));
    const themedBgG = Math.round(this.lerp(bgLG, 0x29, themeP));
    const themedBgB = Math.round(this.lerp(bgLB, 0x2b, themeP));
    const themedBg = `rgb(${themedBgR}, ${themedBgG}, ${themedBgB})`;
    const lightBg  = `rgb(${bgLR}, ${bgLG}, ${bgLB})`;

    const splitY = Math.max(0, Math.min(H, this.getMenuSplitY()));

    ctx.fillStyle = themedBg;
    ctx.fillRect(0, 0, W, splitY);
    ctx.fillStyle = lightBg;
    ctx.fillRect(0, splitY, W, H - splitY);

    const themedBaseRgb = `${Math.round(this.lerp(100, 255, themeP))}, ${Math.round(this.lerp(110, 255, themeP))}, ${Math.round(this.lerp(120, 255, themeP))}`;
    const lightBaseRgb  = `100, 110, 120`;

    const [pr, pg, pb] = this.hexToRgb(this.cssVar('--c-primary', '#007bff'));
    const primaryRgb = `${pr}, ${pg}, ${pb}`;

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

      p.vx *= 0.96;
      p.vy *= 0.96;
      p.x  += p.vx;
      p.y  += p.vy;

      if (p.x < -20)     p.x = W + 20;
      if (p.x > W + 20)  p.x = -20;
      if (p.y < -20)     p.y = H + 20;
      if (p.y > H + 20)  p.y = -20;
    }

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
          const baseRgb = midY < splitY ? themedBaseRgb : lightBaseRgb;
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

    for (const p of this.particles) {
      const dx   = p.x - this.mouseX;
      const dy   = p.y - this.mouseY;
      const d    = Math.sqrt(dx * dx + dy * dy);
      const near = d < MOUSE_RADIUS ? (1 - d / MOUSE_RADIUS) : 0;
      const baseRgb = p.y < splitY ? themedBaseRgb : lightBaseRgb;

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
}