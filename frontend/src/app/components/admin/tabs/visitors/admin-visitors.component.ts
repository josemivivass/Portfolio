import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminStateService } from '../../../../services/admin-state.service';

@Component({
  selector: 'app-admin-visitors',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './admin-visitors.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminVisitorsComponent {
  protected state = inject(AdminStateService);
}
