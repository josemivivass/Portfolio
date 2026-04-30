import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminStateService } from '../../../../services/admin-state.service';

@Component({
  selector: 'app-admin-logins',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './admin-logins.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminLoginsComponent {
  protected state = inject(AdminStateService);
}
