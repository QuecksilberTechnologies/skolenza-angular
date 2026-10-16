import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { form, FormField, required, submit } from '@angular/forms/signals';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DatePickerModule } from '@openng/optimus-ui/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { SelectModule } from '@openng/optimus-ui/select';

import { OneOnOne, PMS_STATUS_OPTIONS } from '@shared/interfaces';

import { PmsOneOnOneStore } from '../pms-one-on-one.store';
import { emptyMeetingForm, formToMeeting, meetingToForm } from './pms-meeting-form.model';

interface MeetingDialogData {
  meeting?: OneOnOne;
  store: InstanceType<typeof PmsOneOnOneStore>;
}

@Component({
  selector: 'app-pms-meeting-form',
  imports: [FormField, ButtonModule, DatePickerModule, InputTextModule, SelectModule],
  templateUrl: './pms-meeting-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PmsMeetingForm {
  readonly #ref = inject(DynamicDialogRef);
  readonly #config = inject<DynamicDialogConfig<MeetingDialogData>>(DynamicDialogConfig);
  readonly #data = this.#config.data!;
  readonly #editing = this.#data.meeting;

  readonly isEdit = signal(!!this.#editing);
  readonly isSaving = signal(false);
  readonly #model = signal(this.#editing ? meetingToForm(this.#editing) : emptyMeetingForm());

  readonly statusOptions = PMS_STATUS_OPTIONS;

  readonly f = form(this.#model, (p) => {
    required(p.title, { message: 'Title is required' });
    required(p.staffMemberName, { message: 'StaffMember is required' });
    required(p.scheduledAt, { message: 'Schedule date is required' });
  });

  async save(): Promise<void> {
    await submit(this.f, async () => {
      this.isSaving.set(true);
      this.#data.store.saveMeeting(formToMeeting(this.#model(), this.#editing));
      this.isSaving.set(false);
      this.#ref.close(true);
      return undefined;
    });
  }

  cancel(): void {
    this.#ref.close(false);
  }
}
