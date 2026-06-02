import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminStateService } from '../../../../services/admin-state.service';
import { CleanHtmlPipe } from '../../../../pipes/clean-html.pipe';

@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [FormsModule, CleanHtmlPipe],
  templateUrl: './admin-profile.component.html',
  styleUrl: './admin-profile.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminProfileComponent {
  protected state = inject(AdminStateService);
}
