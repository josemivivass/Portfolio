import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Inject, PLATFORM_ID, HostListener } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as THREE from 'three';

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
  
  // Mallas
  private cube!: THREE.Mesh;
  private sphere!: THREE.Mesh;
  
  private animationId: number = 0;

  // Estado del DOM
  private scrollY: number = 0;
  private viewHeightPx: number = 1;
  
  // Ingeniería de movimiento
  private readonly baseSpeed: number = 0.45; 
  private cubeVelocityX: number = 0; 
  private cubeVelocityY: number = 0; 
  private sphereVelocityX: number = 0; 
  private sphereVelocityY: number = 0; 

  // Geometría y límites
  private visibleWidth: number = 0; 
  private visibleHeight: number = 0; 
  private worldTop: number = 0;
  private worldBottom: number = 0;
  private readonly cubeSize: number = 2.5;
  private readonly sphereRadius: number = 1.5;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initThreeJs();
      
      // Intentos de recalcular límites cuando el DOM esté listo (debido a carga asíncrona de proyectos)
      setTimeout(() => this.calculateWorldBoundaries(), 500);
      setTimeout(() => this.calculateWorldBoundaries(), 2000); 
      
      this.animate();
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      cancelAnimationFrame(this.animationId);
      if (this.renderer) {
        this.renderer.dispose();
      }
    }
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.scrollY = window.scrollY;
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (isPlatformBrowser(this.platformId) && this.camera && this.renderer) {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);

      this.calculateWorldBoundaries();
    }
  }

  private calculateWorldBoundaries(): void {
    this.viewHeightPx = window.innerHeight;
    // Altura total del documento real
    const docHeightPx = Math.max(document.documentElement.scrollHeight, this.viewHeightPx);

    const distance = 15; // Z de la cámara
    const vFOV = THREE.MathUtils.degToRad(this.camera.fov);
    
    // Altura/Ancho que ve la cámara a Z=0
    this.visibleHeight = 2 * Math.tan(vFOV / 2) * distance;
    this.visibleWidth = this.visibleHeight * this.camera.aspect;

    // Proporción para mapear pixeles a unidades 3D
    const ratio = docHeightPx / this.viewHeightPx;
    const documentHeight3D = this.visibleHeight * ratio;

    // Definir límites absolutos en el eje Y
    this.worldTop = this.visibleHeight / 2; // Cero de la web mapeado arriba
    this.worldBottom = this.worldTop - documentHeight3D; // Suelo absoluto mapeado abajo
  }

  private getRandomVelocity(startRight: boolean): { x: number, y: number } {
    // Ángulo aleatorio entre 30 y 60 grados (π/6 a π/3 radianes)
    const minAngle = Math.PI / 6;
    const maxAngle = Math.PI / 3;
    const angle = Math.random() * (maxAngle - minAngle) + minAngle;

    let vx = this.baseSpeed * Math.cos(angle);
    let vy = -Math.abs(this.baseSpeed * Math.sin(angle)); // Y negativo = hacia abajo inicialmente

    if (startRight) {
      vx = -Math.abs(vx); // Iniciar moviéndose hacia la izquierda
    } else {
      vx = Math.abs(vx); // Iniciar moviéndose hacia la derecha
    }

    return { x: vx, y: vy };
  }

  private initThreeJs(): void {
    const canvas = this.canvasRef.nativeElement;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#f4f7f6'); 

    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 15); 
    this.camera.lookAt(0, 0, 0); 

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.calculateWorldBoundaries();

    // 1. Configurar el Cubo (Esquina Superior Izquierda)
    const cubeGeo = new THREE.BoxGeometry(this.cubeSize, this.cubeSize, this.cubeSize);
    const cubeMat = new THREE.MeshNormalMaterial({ wireframe: false });
    this.cube = new THREE.Mesh(cubeGeo, cubeMat);
    
    const cubeInitialX = -(this.visibleWidth / 2) + (this.cubeSize / 2);
    const cubeInitialY = this.worldTop - (this.cubeSize / 2);
    this.cube.position.set(cubeInitialX, cubeInitialY, 0);

    const cubeVel = this.getRandomVelocity(false); // Falso = Empieza en la izquierda
    this.cubeVelocityX = cubeVel.x;
    this.cubeVelocityY = cubeVel.y;
    this.scene.add(this.cube);

    // 2. Configurar la Esfera (Esquina Superior Derecha)
    const sphereGeo = new THREE.SphereGeometry(this.sphereRadius, 32, 16);
    // CAMBIO: wireframe puesto en false para que sea sólida
    const sphereMat = new THREE.MeshNormalMaterial({ wireframe: false });
    this.sphere = new THREE.Mesh(sphereGeo, sphereMat);
    
    const sphereInitialX = (this.visibleWidth / 2) - this.sphereRadius;
    const sphereInitialY = this.worldTop - this.sphereRadius;
    this.sphere.position.set(sphereInitialX, sphereInitialY, 0);

    const sphereVel = this.getRandomVelocity(true); // Verdadero = Empieza en la derecha
    this.sphereVelocityX = sphereVel.x;
    this.sphereVelocityY = sphereVel.y;
    this.scene.add(this.sphere);
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    if (this.cube && this.sphere) {
      // Rotaciones estéticas
      this.cube.rotation.x += 0.015;
      this.cube.rotation.y += 0.015;
      this.sphere.rotation.x += 0.01;
      this.sphere.rotation.y += 0.01;

      // Aplicar movimiento X/Y autónomo
      this.cube.position.x += this.cubeVelocityX;
      this.cube.position.y += this.cubeVelocityY;
      this.sphere.position.x += this.sphereVelocityX;
      this.sphere.position.y += this.sphereVelocityY;

      // Límites físicos generales (Ancho de pantalla)
      const worldRight = this.visibleWidth / 2;
      const worldLeft = -this.visibleWidth / 2;

      // --- Rebote del Cubo ---
      const cubeHalf = this.cubeSize / 2;
      // Colisión Horizontal (Paredes)
      if (this.cube.position.x >= worldRight - cubeHalf) {
        this.cube.position.x = worldRight - cubeHalf;
        this.cubeVelocityX *= -1; 
      } else if (this.cube.position.x <= worldLeft + cubeHalf) {
        this.cube.position.x = worldLeft + cubeHalf;
        this.cubeVelocityX *= -1; 
      }

      // Colisión Vertical (Techo/Suelo absoluto)
      if (this.cube.position.y >= this.worldTop - cubeHalf) {
        this.cube.position.y = this.worldTop - cubeHalf;
        this.cubeVelocityY *= -1; 
      } else if (this.cube.position.y <= this.worldBottom + cubeHalf) {
        this.cube.position.y = this.worldBottom + cubeHalf;
        this.cubeVelocityY *= -1; 
      }

      // --- Rebote de la Esfera ---
      const radius = this.sphereRadius;
      // Colisión Horizontal (Paredes)
      if (this.sphere.position.x >= worldRight - radius) {
        this.sphere.position.x = worldRight - radius;
        this.sphereVelocityX *= -1; 
      } else if (this.sphere.position.x <= worldLeft + radius) {
        this.sphere.position.x = worldLeft + radius;
        this.sphereVelocityX *= -1; 
      }

      // Colisión Vertical (Techo/Suelo absoluto)
      if (this.sphere.position.y >= this.worldTop - radius) {
        this.sphere.position.y = this.worldTop - radius;
        this.sphereVelocityY *= -1; 
      } else if (this.sphere.position.y <= this.worldBottom + radius) {
        this.sphere.position.y = this.worldBottom + radius;
        this.sphereVelocityY *= -1; 
      }

      // La cámara persigue el scroll para explorar el mundo 3D completo
      const scrollRatio = this.scrollY / this.viewHeightPx;
      this.camera.position.y = -(scrollRatio * this.visibleHeight);
    }

    this.renderer.render(this.scene, this.camera);
  };
}