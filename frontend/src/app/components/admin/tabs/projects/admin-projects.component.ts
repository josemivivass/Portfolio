import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminStateService } from '../../../../services/admin-state.service';

@Component({
  selector: 'app-admin-projects',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './admin-projects.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminProjectsComponent {
  protected state = inject(AdminStateService);
}
