import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminStateService } from '../../../../services/admin-state.service';

@Component({
  selector: 'app-admin-education',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-education.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminEducationComponent {
  protected state = inject(AdminStateService);
}