import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminStateService } from '../../../../services/admin-state.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './admin-users.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminUsersComponent {
  protected state = inject(AdminStateService);
}
