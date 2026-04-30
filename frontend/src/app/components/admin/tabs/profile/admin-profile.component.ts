import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminStateService } from '../../../../services/admin-state.service';

@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-profile.component.html',
  styleUrl: './admin-profile.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminProfileComponent {
  protected state = inject(AdminStateService);
}
