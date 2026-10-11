import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { form, FormField, minLength, required, submit } from '@angular/forms/signals';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { SelectModule } from '@openng/optimus-ui/select';

import { Feedback, FeedbackType, FeedbackVisibility } from '@shared/interfaces';

import { PmsFeedbackStore } from '../pms-feedback.store';

interface FeedbackDialogData {
  store: InstanceType<typeof PmsFeedbackStore>;
  currentUserId: string;
  currentUserName: string;
}

interface FeedbackFormModel {
  toName: string;
  type: FeedbackType;
  visibility: FeedbackVisibility;
  message: string;
}

@Component({
  selector: 'app-pms-feedback-form',
  imports: [FormField, ButtonModule, InputTextModule, SelectModule],
  templateUrl: './pms-feedback-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PmsFeedbackForm {
  readonly #ref = inject(DynamicDialogRef);
  readonly #config = inject<DynamicDialogConfig<FeedbackDialogData>>(DynamicDialogConfig);
  readonly #data = this.#config.data!;

  readonly isSaving = signal(false);
  readonly #model = signal<FeedbackFormModel>({
    toName: '',
    type: 'Appreciation',
    visibility: 'Public',
    message: '',
  });

  readonly typeOptions: FeedbackType[] = ['Appreciation', 'Suggestion'];
  readonly visibilityOptions: FeedbackVisibility[] = ['Public', 'Private'];

  readonly f = form(this.#model, (p) => {
    required(p.toName, { message: 'Recipient is required' });
    required(p.message, { message: 'Message is required' });
    minLength(p.message, 5, { message: 'Message must be at least 5 characters' });
  });

  async save(): Promise<void> {
    await submit(this.f, async () => {
      this.isSaving.set(true);
      const m = this.#model();
      const feedback: Feedback = {
        id: `f-${Date.now()}`,
        fromId: this.#data.currentUserId,
        fromName: this.#data.currentUserName,
        toId: `e-${m.toName.toLowerCase().replace(/\s+/g, '-')}`,
        toName: m.toName.trim(),
        type: m.type,
        visibility: m.visibility,
        message: m.message.trim(),
        createdAt: new Date().toISOString(),
      };
      this.#data.store.addFeedback(feedback);
      this.isSaving.set(false);
      this.#ref.close(true);
      return undefined;
    });
  }

  cancel(): void {
    this.#ref.close(false);
  }
}
