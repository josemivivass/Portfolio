import { Component, OnInit, Inject, PLATFORM_ID, HostListener } from '@angular/core';
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
  
  introScale: number = 1;
  introTranslateY: number = 0;
  introOpacity: number = 1;
  mainTranslateY: number = 100;
  overlayOpacity: number = 0;
  disableReveal: boolean = false;

  constructor(
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

    this.disableReveal = scrollY > 250;

    const phase1 = Math.min(scrollY / vh, 1);
    const phase2 = Math.max(0, Math.min((scrollY - vh) / vh, 1));

    if (scrollY >= 2 * vh) {
      this.showIntro = false;
      this.mainTranslateY = 0;
      
      // Liberar el scroll y forzar a GSAP a recalcular sin crashear Angular
      setTimeout(() => {
        window.scrollTo(0, 0);
        window.dispatchEvent(new Event('resize')); 
      }, 10);
      
      return;
    }

    this.introScale = 1 - (0.55 * phase1);
    this.overlayOpacity = Math.min(phase1 * 1.5, 1); 
    
    this.introTranslateY = -(phase2 * 100);
    this.introOpacity = 1; 
    
    this.mainTranslateY = 100 - (phase2 * 100);
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      this.isLoggedIn = false;
    }
  }
}