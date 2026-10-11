import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from '@openng/optimus-ui/button';
import { TextareaModule } from '@openng/optimus-ui/textarea';

@Component({
  selector: 'app-ticket-reply-input',
  imports: [ButtonModule, TextareaModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ticket-reply-input.html',
})
export class TicketReplyInput {
  protected readonly isInternalNote = signal(false);
  protected readonly message = signal('');

  protected toggleInternalNote(): void {
    this.isInternalNote.update((v) => !v);
  }

  protected discard(): void {
    this.message.set('');
    this.isInternalNote.set(false);
  }
}
