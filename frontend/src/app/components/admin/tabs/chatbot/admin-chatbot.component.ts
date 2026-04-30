import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminStateService } from '../../../../services/admin-state.service';

@Component({
  selector: 'app-admin-chatbot',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './admin-chatbot.component.html',
  styleUrl: './admin-chatbot.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminChatbotComponent {
  protected state = inject(AdminStateService);
}
