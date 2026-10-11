import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { form, validateStandardSchema } from '@angular/forms/signals';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';

import { FormTextarea } from '@shared/components/form-inputs/form-textarea/form-textarea';

import {
  StaffMemberWorkModeOverrideDecisionModel,
  staffMemberWorkModeOverrideDecisionSchema,
} from './staff-member-work-mode-override-decision-dialog.schema';

@Component({
  selector: 'app-staff-member-work-mode-override-decision-dialog',
  imports: [ButtonModule, FormTextarea],
  template: `
    <div class="flex flex-col gap-4">
      <p class="text-sm text-zinc-600 dark:text-zinc-300">
        Explain why the override for {{ staffMemberName }} is being rejected.
      </p>
      <app-form-textarea
        inputId="rejectionRemark"
        label="Rejection Reason"
        required
        placeholder="Why this override cannot be approved"
        [rows]="4"
        [maxlength]="500"
        [field]="f.remark"
      />
      <div class="flex justify-end gap-2">
        <p-button label="Cancel" severity="secondary" (onClick)="ref.close()" />
        <p-button
          label="Reject Override"
          severity="danger"
          [disabled]="f().invalid()"
          (onClick)="ref.close(model().remark.trim())"
        />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffMemberWorkModeOverrideDecisionDialog {
  readonly ref = inject(DynamicDialogRef);
  readonly staffMemberName = inject(DynamicDialogConfig).data?.staffMemberName ?? 'this staffMember';

  protected readonly model = signal<StaffMemberWorkModeOverrideDecisionModel>({ remark: '' });
  protected readonly f = form(this.model, (p) =>
    validateStandardSchema(p, staffMemberWorkModeOverrideDecisionSchema),
  );
}
