import { Component, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID, HostListener, NgZone } from '@angular/core';
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
  showPreloader: boolean = true;
  preloaderClosing: boolean = false;
  showIntro: boolean = true;
  renderProjects: boolean = false; 
  
  isLoggedIn: boolean = false;
  isHomeRoute: boolean = true; 

  introScale: number = 1;
  introTranslateY: number = 0;
  introOpacity: number = 1;
  mainTranslateY: number = 100;
  overlayOpacity: number = 0;
  disableReveal: boolean = false;

  constructor(
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
      }
      window.scrollTo(0, 0);

      this.isHomeRoute = window.location.pathname === '/';
      const token = localStorage.getItem('token');
      this.isLoggedIn = !!token;

      if (!this.isHomeRoute) {
        this.showPreloader = false;
        this.showIntro = false;
        this.mainTranslateY = 0;
        this.renderProjects = true;
      } else {
        // Ejecución de la detección de cambios DE FORMA INTERNA al asincronismo
        setTimeout(() => {
          this.ngZone.run(() => {
            this.preloaderClosing = true; 
            this.cdr.detectChanges(); 
            
            setTimeout(() => {
              this.ngZone.run(() => {
                this.showPreloader = false; 
                this.cdr.detectChanges(); 
              });
            }, 800); 
          });
        }, 2000); 
      }
    }
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (!this.showIntro || !this.isHomeRoute || this.showPreloader || !isPlatformBrowser(this.platformId)) return;

    const scrollY = window.scrollY;
    const vh = window.innerHeight;

    this.disableReveal = scrollY > 250;

    const phase1 = Math.min(scrollY / vh, 1);
    const phase2 = Math.max(0, Math.min((scrollY - vh) / vh, 1));

    if (scrollY >= 2 * vh) {
      this.showIntro = false;
      this.mainTranslateY = 0;
      
      this.cdr.detectChanges(); 
      
      setTimeout(() => {
        window.scrollTo(0, 0);
        
        this.renderProjects = true;
        this.cdr.detectChanges();
        
        window.dispatchEvent(new Event('resize')); 
      }, 50);
      
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