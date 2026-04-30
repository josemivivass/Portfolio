import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AdminStateService } from '../../../../services/admin-state.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminDashboardComponent {
  protected state = inject(AdminStateService);
}
