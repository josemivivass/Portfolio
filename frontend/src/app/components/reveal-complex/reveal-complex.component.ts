import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, HostListener, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

interface Particle {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  fadeSpeed: number;
}

interface TrailPoint {
  x: number;
  y: number;
  opacity: number;
}

@Component({
  selector: 'app-reveal-complex',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reveal-complex.component.html',
  styleUrls: ['./reveal-complex.component.css']
})
export class RevealComplexComponent implements AfterViewInit, OnDestroy {
  @ViewChild('trailCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private animationId: number = 0;
  private particles: Particle[] = [];
  private trailPoints: TrailPoint[] = [];
  private mouseX: number = 0;
  private mouseY: number = 0;
  private isMouseIn: boolean = false;
  private image1: HTMLImageElement = new Image();
  private image2: HTMLImageElement = new Image();
  
  isLoaded: boolean = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {}

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initCanvas();
      this.loadImages();
      this.animate();
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      cancelAnimationFrame(this.animationId);
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.resizeCanvas();
    }
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    this.mouseX = event.clientX - rect.left;
    this.mouseY = event.clientY - rect.top;
    this.isMouseIn = true;

    this.trailPoints.push({ x: this.mouseX, y: this.mouseY, opacity: 1 });
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.isMouseIn = false;
  }

  private initCanvas(): void {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.resizeCanvas();
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  private loadImages(): void {
    let imagesLoaded = 0;
    const checkLoaded = () => {
      imagesLoaded++;
      if (imagesLoaded === 2) {
        this.isLoaded = true;
        this.cdr.detectChanges();
      }
    };

    this.image1.src = '/images/fondo1.png';
    this.image2.src = '/images/fondo2.png';

    this.image1.onload = checkLoaded;
    this.image2.onload = checkLoaded;
  }

  private createParticles(num: number): void {
    const canvas = this.canvasRef.nativeElement;
    for (let i = 0; i < num; i++) {
      this.particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 80 + 30,
        opacity: Math.random() * 0.5 + 0.3,
        fadeSpeed: Math.random() * 0.005 + 0.001
      });
    }
  }

  private updateParticles(): void {
    this.particles = this.particles.filter(p => p.opacity > 0);
    
    if (this.particles.length < 5) {
      this.createParticles(1);
    }

    this.particles.forEach(p => p.opacity -= p.fadeSpeed);
  }

  private updateTrailPoints(): void {
    this.trailPoints = this.trailPoints.filter(p => p.opacity > 0);
    this.trailPoints.forEach(p => p.opacity -= 0.015);
  }

  private drawSpotlight(x: number, y: number, radius: number, opacity: number): void {
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    const grad = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, 'white');
    grad.addColorStop(1, 'transparent');
    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  private drawImageCover(img: HTMLImageElement): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = this.ctx;
    const canvasRatio = canvas.width / canvas.height;
    const imgRatio = img.width / img.height;
    let renderWidth, renderHeight, x, y;

    if (imgRatio > canvasRatio) {
      renderHeight = canvas.height;
      renderWidth = img.width * (canvas.height / img.height);
      x = (canvas.width - renderWidth) / 2;
      y = 0;
    } else {
      renderWidth = canvas.width;
      renderHeight = img.height * (canvas.width / img.width);
      x = 0;
      y = (canvas.height - renderHeight) / 2;
    }
    ctx.drawImage(img, x, y, renderWidth, renderHeight);
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    if (!this.isLoaded) return;

    const canvas = this.canvasRef.nativeElement;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = 'source-over';
    this.updateTrailPoints();
    this.trailPoints.forEach(p => this.drawSpotlight(p.x, p.y, 40, p.opacity));

    if (this.isMouseIn) {
      this.drawSpotlight(this.mouseX, this.mouseY, 200, 1);
    }

    this.updateParticles();
    this.particles.forEach(p => this.drawSpotlight(p.x, p.y, p.radius, p.opacity));

    ctx.globalCompositeOperation = 'source-in';
    this.drawImageCover(this.image2);

    ctx.globalCompositeOperation = 'destination-over';
    this.drawImageCover(this.image1);
  };
}