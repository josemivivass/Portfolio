import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminStateService } from '../../../../services/admin-state.service';

@Component({
  selector: 'app-admin-messages',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './admin-messages.component.html',
  styleUrl: './admin-messages.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminMessagesComponent {
  protected state = inject(AdminStateService);
}
