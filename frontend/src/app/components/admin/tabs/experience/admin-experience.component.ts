import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminStateService } from '../../../../services/admin-state.service';

@Component({
  selector: 'app-admin-experience',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './admin-experience.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminExperienceComponent {
  protected state = inject(AdminStateService);
}
