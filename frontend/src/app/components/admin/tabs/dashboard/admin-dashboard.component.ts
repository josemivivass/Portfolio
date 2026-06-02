import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AdminStateService } from '../../../../services/admin-state.service';
import { MapComponent } from './map/map.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [MapComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminDashboardComponent {
  protected state = inject(AdminStateService);
}
