import { Component, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID, HostListener } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';

import { Hero3dComponent } from './components/hero3d/hero3d.component';
import { ProjectsGsapComponent } from './components/projects-gsap/projects-gsap.component';
import { SkillsRiveComponent } from './components/skills-rive/skills-rive.component';
import { RevealComplexComponent } from './components/reveal-complex/reveal-complex.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, 
    RouterModule, 
    CommonModule,
    Hero3dComponent,
    ProjectsGsapComponent,
    SkillsRiveComponent,
    RevealComplexComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  showIntro: boolean = true;
  isLoggedIn: boolean = false;
  isHomeRoute: boolean = false; 
  
  // Variables para la animación combinada (Intro + Main)
  introScale: number = 1;
  introOpacity: number = 1;
  introTranslateY: number = 0;
  mainTranslateY: number = 100; // Empieza oculto en la parte inferior (100vh)

  constructor(
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.isHomeRoute = window.location.pathname === '/';
      const token = localStorage.getItem('token');
      this.isLoggedIn = !!token;
    }
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (!this.showIntro || !this.isHomeRoute || !isPlatformBrowser(this.platformId)) return;

    const scrollY = window.scrollY;
    const vh = window.innerHeight;
    const progress = scrollY / vh; // Va de 0 a 1

    // Cuando el scroll completa 1 altura de pantalla, finaliza la intro
    if (progress >= 1) {
      this.showIntro = false;
      this.mainTranslateY = 0;
      setTimeout(() => window.scrollTo(0, 0), 0);
      return;
    }

    // --- CÁLCULOS DE ANIMACIÓN ---
    
    // 1. Intro: Se encoge (1 a 0), se desvanece y sube hacia arriba (0 a -50vh)
    this.introScale = Math.max(0, 1 - progress);
    this.introOpacity = Math.max(0, 1 - progress * 1.5); 
    this.introTranslateY = -(progress * 50); 

    // 2. Web Principal: Sube desde abajo (100vh a 0)
    this.mainTranslateY = 100 - (progress * 100);
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      this.isLoggedIn = false;
    }
  }
}