import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  PLATFORM_ID,
  inject
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AdminStateService, AdminTab } from '../../services/admin-state.service';
import { resolveApiAssetUrl } from '../../services/project.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminComponent implements OnInit {
  protected state = inject(AdminStateService);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.applyChartDimensions();
    this.state.init();
    this.syncActiveTabFromRoute();
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.syncActiveTabFromRoute());
  }

  private syncActiveTabFromRoute(): void {
    let r = this.route.firstChild;
    while (r?.firstChild) r = r.firstChild;
    const tab = r?.snapshot.data?.['tab'] as AdminTab | undefined;
    if (tab) this.state.setActiveTab(tab);
  }

  private applyChartDimensions(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    return this.state.setChartMobile(window.innerWidth <= 768);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.applyChartDimensions()) {
      this.state.buildCharts();
    }
  }

  imagePreviewUrl(url: string | null | undefined): string {
    return resolveApiAssetUrl(url);
  }

  onImagePreviewError(event: Event): void {
    const el = event.target as HTMLImageElement;
    if (!el) return;
    el.style.display = 'none';
    el.closest('.project-gallery-card')?.classList.add('is-broken');
  }
}
