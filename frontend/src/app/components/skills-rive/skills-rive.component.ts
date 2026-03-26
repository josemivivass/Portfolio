import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Rive } from '@rive-app/canvas';

@Component({
  selector: 'app-skills-rive',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skills-rive.component.html',
  styleUrls: ['./skills-rive.component.css']
})
export class SkillsRiveComponent implements AfterViewInit, OnDestroy {
  @ViewChild('riveCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private riveInstance: Rive | null = null;

  skillsList = [
    { name: 'Angular', level: 'Avanzado' },
    { name: 'Node.js', level: 'Intermedio' },
    { name: 'Python', level: 'Intermedio' },
    { name: 'MySQL', level: 'Avanzado' },
    { name: 'Three.js / GSAP', level: 'Básico' }
  ];

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initRive();
    }
  }

  ngOnDestroy(): void {
    if (this.riveInstance) {
      this.riveInstance.cleanup();
    }
  }

  private initRive(): void {
    const canvas = this.canvasRef.nativeElement;

    // Se asume que existe un archivo 'skill.riv' en la carpeta src/assets/
    this.riveInstance = new Rive({
      src: 'assets/skill.riv',
      canvas: canvas,
      autoplay: true,
      onLoad: () => {
        // Redimensionar el canvas para que se ajuste al contenedor
        this.riveInstance?.resizeDrawingSurfaceToCanvas();
      },
      onLoadError: () => {
        console.warn('No se encontró el archivo assets/skill.riv. Animación de Rive omitida.');
      }
    });
  }
}