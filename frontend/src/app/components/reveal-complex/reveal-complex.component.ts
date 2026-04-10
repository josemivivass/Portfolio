import {
  Component, ElementRef, ViewChild, AfterViewInit, OnDestroy,
  HostListener, Inject, PLATFORM_ID, Input
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TranslationService } from '../../services/translation.service';
import { gsap } from 'gsap';

const MATRIX_CHARS =
  'アァイィウヴエエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const FONT_SIZE    = 14;
const MOUSE_RADIUS = 150;

@Component({
  selector: 'app-reveal-complex',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reveal-complex.component.html',
  styleUrls: ['./reveal-complex.component.css']
})
export class RevealComplexComponent implements AfterViewInit, OnDestroy {
  @ViewChild('matrixCanvas', { static: true }) private matrixCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('nameLetters',  { static: true }) private nameLetters!:     ElementRef<HTMLDivElement>;

  @Input() imageOpacity  = 1;
  @Input() hoverIntensity = 1;

  readonly nameLine1 = 'José Miguel'.split('');
  readonly nameLine2 = 'Vivas Sánchez'.split('');

  // X diagonal split: 4 triangles, apex pushed 8% past center on each side
  // so adjacent edges overlap ~6px along the full diagonal → no visible seam
  readonly fragClips = [
    'polygon(-2% -2%, 102% -2%, 58% 58%)',   // top    (apex pushed down-right)
    'polygon(102% -2%, 102% 102%, 42% 58%)',  // right  (apex pushed down-left)
    'polygon(102% 102%, -2% 102%, 42% 42%)',  // bottom (apex pushed up-left)
    'polygon(-2% 102%, -2% -2%, 58% 42%)',    // left   (apex pushed up-right)
  ];

  private nameTl: gsap.core.Timeline | null = null;
  private matrixRafId: number | null = null;

  // Matrix state
  private ctx!: CanvasRenderingContext2D;
  private drops:      number[] = [];
  private offsets:    number[] = []; // horizontal offset only for the head character
  private offsetVels: number[] = [];
  // Mouse state
  private mouseX: number | null = null;
  private mouseY: number | null = null;
  private mouseVelX = 0;
  private mouseVelY = 0;
  private prevMouseX = 0;
  private prevMouseY = 0;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    public i18n: TranslationService
  ) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    setTimeout(() => {
      this.initMatrix();
      this.initNameAnimation();
    }, 0);
  }

  ngOnDestroy(): void {
    if (this.matrixRafId !== null) clearInterval(-this.matrixRafId);
    this.nameTl?.kill();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (isPlatformBrowser(this.platformId)) this.resizeMatrix();
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    this.mouseVelX = e.clientX - this.prevMouseX;
    this.mouseVelY = e.clientY - this.prevMouseY;
    this.prevMouseX = e.clientX;
    this.prevMouseY = e.clientY;
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
  }

  @HostListener('window:mouseleave')
  onMouseLeave(): void {
    this.mouseX = null;
    this.mouseY = null;
    this.mouseVelX = 0;
    this.mouseVelY = 0;
    // Snap all columns back immediately — no lingering displacement
    this.offsets.fill(0);
    this.offsetVels.fill(0);
  }

  // ── Matrix ────────────────────────────────────────────────────────────────

  private initMatrix(): void {
    const canvas = this.matrixCanvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.resizeMatrix();
    // Match original: setInterval at 33 ms
    const id = window.setInterval(() => this.drawMatrix(), 33);
    // Store as negative so ngOnDestroy can clear it via cancelAnimationFrame guard
    this.matrixRafId = -id;
  }

  private resizeMatrix(): void {
    const canvas = this.matrixCanvasRef.nativeElement;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const cols = Math.floor(canvas.width / FONT_SIZE);
    // Exact first animation: all drops start at 1
    this.drops      = Array(cols).fill(1);
    this.offsets    = Array(cols).fill(0);
    this.offsetVels = Array(cols).fill(0);
  }

  private drawMatrix(): void {
    const canvas = this.matrixCanvasRef.nativeElement;
    const ctx    = this.ctx;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${FONT_SIZE}px monospace`;

    for (let i = 0; i < this.drops.length; i++) {
      const colX = i * FONT_SIZE;   // natural column position (never changes)
      const y    = this.drops[i] * FONT_SIZE;

      // Repel only the head character — check distance from head to mouse
      if (this.mouseX !== null && this.mouseY !== null) {
        const headX = colX + this.offsets[i];
        const dx    = headX - this.mouseX;
        const dy    = y     - this.mouseY;
        const dist  = Math.sqrt(dx * dx + dy * dy);

        if (dist < MOUSE_RADIUS) {
          const angle = Math.atan2(dy, dx);
          const force = Math.pow((MOUSE_RADIUS - dist) / MOUSE_RADIUS, 2) * 2;
          this.offsetVels[i] += Math.cos(angle) * force * 25 + this.mouseVelX * force * 0.2;
          this.offsetVels[i] += (Math.random() - 0.5) * force * 10;
        }
      }

      // Apply offset velocity + friction + spring back to column
      this.offsets[i]    += this.offsetVels[i];
      this.offsetVels[i] *= 0.95;
      this.offsets[i]    += (0 - this.offsets[i]) * 0.05;

      // Draw head at offset position — trail pixels stay in canvas (original behavior)
      ctx.fillStyle = '#0f0';
      const text = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
      ctx.fillText(text, colX + this.offsets[i], y);

      // Reset — exactly as first animation
      if (y > canvas.height && Math.random() > 0.975) {
        this.drops[i]      = 0;
        this.offsets[i]    = 0;
        this.offsetVels[i] = 0;
      }
      this.drops[i] += 1;
    }
  }

  // ── Name animation ────────────────────────────────────────────────────────

  private initNameAnimation(): void {
    const container = this.nameLetters.nativeElement;
    const frags = Array.from(container.querySelectorAll<HTMLSpanElement>('.frag-mover'));

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

    container.addEventListener('mouseenter', () => this.nameTl?.timeScale(0.15));
    container.addEventListener('mouseleave', () => this.nameTl?.timeScale(1));
  }

  private getRandom(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }
}
