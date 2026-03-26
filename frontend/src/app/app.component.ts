import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { RouterOutlet, RouterModule, Router, NavigationEnd } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AuthService } from './services/auth.service';
import { TrackingService } from './services/tracking.service';
import { Hero3dComponent } from './components/hero3d/hero3d.component';
import { ProjectsGsapComponent } from './components/projects-gsap/projects-gsap.component';
import { SkillsRiveComponent } from './components/skills-rive/skills-rive.component';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, 
    RouterModule, 
    CommonModule,
    Hero3dComponent,
    ProjectsGsapComponent,
    SkillsRiveComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  isLoggedIn = false;
  isHomeRoute = true;

  constructor(
    private authService: AuthService,
    private router: Router,
    private trackingService: TrackingService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.isHomeRoute = event.urlAfterRedirects === '/';
    });
  }

  ngOnInit(): void {
    this.trackingService.initTracking();
    this.authService.isLoggedIn().subscribe(status => {
      this.isLoggedIn = status;
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}