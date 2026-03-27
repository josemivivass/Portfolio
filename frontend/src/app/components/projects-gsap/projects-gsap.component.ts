import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef, ElementRef, ViewChildren, QueryList } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ProjectService } from '../../services/project.service';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

@Component({
  selector: 'app-projects-gsap',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './projects-gsap.component.html',
  styleUrls: ['./projects-gsap.component.css']
})
export class ProjectsGsapComponent implements OnInit {
  @ViewChildren('projectCard') projectCards!: QueryList<ElementRef>;
  projects: any[] = [];
  errorMessage: string = '';

  constructor(
    private projectService: ProjectService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      gsap.registerPlugin(ScrollTrigger);
    }
  }

  ngOnInit(): void {
    this.projectService.getProjects().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.projects = data.slice(0, 3);
        } else {
          this.projects = [];
        }
        this.cdr.detectChanges();
        this.initGsapAnimations();
      },
      error: (err) => {
        console.error('Error de red al cargar proyectos:', err);
        this.errorMessage = 'Error al cargar los proyectos.';
        this.cdr.detectChanges();
      }
    });
  }

  private initGsapAnimations(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    ScrollTrigger.getAll().forEach(trigger => trigger.kill());

    setTimeout(() => {
      if (!this.projectCards || this.projectCards.length === 0) return;

      this.projectCards.forEach((card, index) => {
        const element = card.nativeElement;
        
        // Uso de gsap.from(): GSAP se encarga de ponerlo en opacity 0 y lo anima a 1
        gsap.from(element, {
          opacity: 0,
          x: index % 2 === 0 ? -100 : 100,
          duration: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: element,
            start: "top 85%",
            toggleActions: "play none none reverse"
          }
        });
      });
      ScrollTrigger.refresh();
    }, 100);
  }
}