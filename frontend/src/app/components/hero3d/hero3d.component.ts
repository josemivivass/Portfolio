import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as THREE from 'three';
import { BackgroundThemeService } from '../../services/background-theme.service';

const PARTICLE_COUNT    = 160;
const CONNECTION_DIST   = 5.5;   // unidades Three.js
const MOUSE_RADIUS      = 6;     // radio de influencia del ratón
const MOUSE_STRENGTH    = 0.07;  // fuerza de repulsión
const DAMPING           = 0.97;  // amortiguación
const DRIFT             = 0.0003; // fuerza del movimiento autónomo sinusoidal
const MAX_LINE_VERTICES = 8000;  // máximo de vértices de línea por frame
const CAM_Z             = 30;    // distancia de la cámara

@Component({
  selector: 'app-hero3d',
  standalone: true,
  templateUrl: './hero3d.component.html',
  styleUrls: ['./hero3d.component.css']
})
export class Hero3dComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas3d', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private animationId = 0;

  // Geometría de partículas (BufferGeometry compartido)
  private particleGeo!: THREE.BufferGeometry;
  private positions!: Float32Array;
  private velocities: { vx: number; vy: number }[] = [];

  // Geometría de líneas
  private lineGeo!: THREE.BufferGeometry;
  private linePositions!: Float32Array;

  // Ratón (normalizado −1..1, suavizado)
  private mouseNX = 0;
  private mouseNY = 0;
  private targetNX = 0;
  private targetNY = 0;

  // Movimiento autónomo
  private time = 0;
  private phases: number[] = [];

  // Bounds visibles en mundo 3D
  private halfW = 0;
  private halfH = 0;

  // Materiales para poder interpolar su color con el progreso del tema
  private particleMat!: THREE.PointsMaterial;
  private lineMat!: THREE.LineBasicMaterial;

  // Colores para el tema claro / oscuro (se fijan en init)
  private readonly lightBg       = new THREE.Color();
  private readonly darkBg        = new THREE.Color('#24292b');
  private readonly lightParticle = new THREE.Color();
  private readonly darkParticle  = new THREE.Color('#ffffff');

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private theme: BackgroundThemeService
  ) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.init();
    this.animate();
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('resize',    this.onResize);
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('resize',    this.onResize);
    this.renderer?.dispose();
  }

  // ─── Handlers ──────────────────────────────────────────────────────────────

  private onMouseMove = (e: MouseEvent): void => {
    this.targetNX =  (e.clientX / window.innerWidth)  * 2 - 1;
    this.targetNY = -(e.clientY / window.innerHeight) * 2 + 1;
  };

  private onResize = (): void => {
    if (!this.renderer || !this.camera) return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    this.camera.aspect = W / H;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(W, H);
    this.calcBounds();
  };

  // ─── Inicialización ─────────────────────────────────────────────────────────

  private cssColor(prop: string, fallback: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(prop).trim() || fallback;
  }

  private init(): void {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const canvas = this.canvasRef.nativeElement;

    this.scene = new THREE.Scene();
    this.lightBg.set(this.cssColor('--c-bg', '#f4f7f5'));
    this.scene.background = this.lightBg.clone();

    this.camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 500);
    this.camera.position.set(0, 0, CAM_Z);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(W, H);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.calcBounds();
    this.buildParticles();
    this.buildLines();
  }

  private calcBounds(): void {
    const vFOV = THREE.MathUtils.degToRad(this.camera.fov);
    const h    = 2 * Math.tan(vFOV / 2) * CAM_Z;
    this.halfH = h / 2;
    this.halfW = (h * this.camera.aspect) / 2;
  }

  private buildParticles(): void {
    this.positions = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.positions[i * 3]     = (Math.random() - 0.5) * this.halfW * 1.8;
      this.positions[i * 3 + 1] = (Math.random() - 0.5) * this.halfH * 1.8;
      this.positions[i * 3 + 2] = (Math.random() - 0.5) * 8;

      const speed = 0.003 + Math.random() * 0.005;
      const angle = Math.random() * Math.PI * 2;
      this.velocities.push({ vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed });
      this.phases.push(Math.random() * Math.PI * 2);
    }

    this.particleGeo = new THREE.BufferGeometry();
    this.particleGeo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    this.lightParticle.set(this.cssColor('--c-text-heading', '#2c3e3a'));
    this.particleMat = new THREE.PointsMaterial({
      color:           this.lightParticle.clone(),
      size:            0.28,
      sizeAttenuation: true,
      transparent:     true,
      opacity:         0.85,
    });

    this.scene.add(new THREE.Points(this.particleGeo, this.particleMat));
  }

  private buildLines(): void {
    this.linePositions = new Float32Array(MAX_LINE_VERTICES * 3);
    this.lineGeo = new THREE.BufferGeometry();
    this.lineGeo.setAttribute('position', new THREE.BufferAttribute(this.linePositions, 3));
    this.lineGeo.setDrawRange(0, 0);

    this.lineMat = new THREE.LineBasicMaterial({
      color:       this.lightParticle.clone(),
      transparent: true,
      opacity:     0.18,
    });

    this.scene.add(new THREE.LineSegments(this.lineGeo, this.lineMat));
  }

  // ─── Loop ───────────────────────────────────────────────────────────────────

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    // Suavizar ratón
    this.mouseNX += (this.targetNX - this.mouseNX) * 0.06;
    this.mouseNY += (this.targetNY - this.mouseNY) * 0.06;

    // Posición del ratón en coordenadas de mundo (plano z=0)
    const mwx = this.mouseNX * this.halfW;
    const mwy = this.mouseNY * this.halfH;

    // Parallax suave de la cámara siguiendo el ratón
    this.camera.position.x += (this.mouseNX * 1.8 - this.camera.position.x) * 0.025;
    this.camera.position.y += (this.mouseNY * 0.9 - this.camera.position.y) * 0.025;
    this.camera.lookAt(0, 0, 0);

    // Avanzar tiempo para el drift autónomo
    this.time += 0.0015;

    // Actualizar partículas
    const distSqThresh = CONNECTION_DIST * CONNECTION_DIST;
    let lineVtx = 0;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const xi  = i * 3;
      let x     = this.positions[xi];
      let y     = this.positions[xi + 1];
      const z   = this.positions[xi + 2];
      const vel = this.velocities[i];
      const ph  = this.phases[i];

      // Drift sinusoidal autónomo — cada partícula tiene su propia fase
      vel.vx += Math.sin(this.time * 0.8 + ph)        * DRIFT;
      vel.vy += Math.cos(this.time * 0.6 + ph * 1.61) * DRIFT;

      // Fuerza del ratón (repulsión)
      const dx   = x - mwx;
      const dy   = y - mwy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MOUSE_RADIUS && dist > 0.01) {
        const force = (1 - dist / MOUSE_RADIUS) * MOUSE_STRENGTH;
        vel.vx += (dx / dist) * force;
        vel.vy += (dy / dist) * force;
      }

      // Amortiguación + movimiento
      vel.vx *= DAMPING;
      vel.vy *= DAMPING;
      x += vel.vx;
      y += vel.vy;

      // Wrap — reaparecen por el lado opuesto
      if (x >  this.halfW) x = -this.halfW;
      if (x < -this.halfW) x =  this.halfW;
      if (y >  this.halfH) y = -this.halfH;
      if (y < -this.halfH) y =  this.halfH;

      this.positions[xi]     = x;
      this.positions[xi + 1] = y;
      // z fijo por partícula (profundidad estática)

      // Conexiones con partículas anteriores
      for (let j = 0; j < i; j++) {
        if (lineVtx >= MAX_LINE_VERTICES - 2) break;
        const xj = j * 3;
        const ddx = x - this.positions[xj];
        const ddy = y - this.positions[xj + 1];
        const ddz = z - this.positions[xj + 2];
        if (ddx * ddx + ddy * ddy + ddz * ddz < distSqThresh) {
          this.linePositions[lineVtx * 3]     = x;
          this.linePositions[lineVtx * 3 + 1] = y;
          this.linePositions[lineVtx * 3 + 2] = z;
          lineVtx++;
          this.linePositions[lineVtx * 3]     = this.positions[xj];
          this.linePositions[lineVtx * 3 + 1] = this.positions[xj + 1];
          this.linePositions[lineVtx * 3 + 2] = this.positions[xj + 2];
          lineVtx++;
        }
      }
    }

    this.particleGeo.attributes['position'].needsUpdate = true;
    this.lineGeo.setDrawRange(0, lineVtx);
    this.lineGeo.attributes['position'].needsUpdate = true;

    // Interpolar colores (fondo + puntos + líneas) según el progreso del tema.
    // Las posiciones no se tocan, solo el color: la animación continúa sin cortes.
    const p = this.theme.progress;
    (this.scene.background as THREE.Color).lerpColors(this.lightBg, this.darkBg, p);
    this.particleMat.color.lerpColors(this.lightParticle, this.darkParticle, p);
    this.lineMat.color.lerpColors(this.lightParticle, this.darkParticle, p);
    // En oscuro, aumentamos ligeramente la opacidad de las líneas para que
    // se lean bien sobre el gris.
    this.lineMat.opacity = 0.18 + 0.14 * p;

    this.renderer.render(this.scene, this.camera);
  };
}
