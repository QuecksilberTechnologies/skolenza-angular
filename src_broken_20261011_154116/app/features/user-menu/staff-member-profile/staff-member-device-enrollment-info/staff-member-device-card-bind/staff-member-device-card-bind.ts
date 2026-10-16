import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  type FieldTree,
  form,
  FormField,
  submit,
  validateStandardSchema,
} from '@angular/forms/signals';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { finalize } from 'rxjs';

import { Common, StaffMemberDeviceEnrollmentApi } from '@core/services';
import { StaffMemberDeviceEnrollmentRow } from '@shared/interfaces';
import { showFieldError } from '@shared/utilities/field-error';

import {
  StaffMemberDeviceCardBindModel,
  staffMemberDeviceCardBindSchema,
} from './staffMember-device-card-bind.schema';

/** One selectable card: the opaque id the bind call takes, plus the masked label to show. */
export interface BindableInstitutionCard {
  value: string;
  label: string;
}

/**
 * Cards a institution may bind. Host card stock lives behind `/api/InstitutionCardMaster/*`, which is a
 * Host-only module carrying purchase price, supplier, invoice and tax, so a institution must not read
 * it — and no institution-scoped "available cards" lookup is published yet. Until the backend supplies
 * one this list stays empty, and the page hides the action rather than opening a dialog that cannot
 * submit. See `docs/api-coverage/api-issues-for-backend.md`, Issue 13.
 */
export const AVAILABLE_CARDS: BindableInstitutionCard[] = [];

@Component({
  selector: 'app-staffMember-device-card-bind',
  imports: [FormField, ButtonModule, MessageModule, SelectModule],
  templateUrl: './staffMember-device-card-bind.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffMemberDeviceCardBind {
  readonly #staffMemberDeviceEnrollmentApi = inject(StaffMemberDeviceEnrollmentApi);
  readonly #commonService = inject(Common);
  readonly #dialogConfig = inject(DynamicDialogConfig);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #destroyRef = inject(DestroyRef);

  readonly #enrollment = this.#dialogConfig.data?.enrollment as StaffMemberDeviceEnrollmentRow;

  protected readonly deviceName = this.#enrollment?.deviceName ?? 'this device';
  protected readonly isSaving = signal(false);
  protected readonly submitted = signal(false);

  protected readonly cards = AVAILABLE_CARDS;

  protected readonly model = signal<StaffMemberDeviceCardBindModel>({ institutionCardId: null });

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, staffMemberDeviceCardBindSchema);
  });

  protected showError<T>(field: FieldTree<T>): boolean {
    return showFieldError(field, this.submitted());
  }

  onSubmit(): void {
    if (this.isSaving() || !this.#enrollment) {
      return;
    }

    this.submitted.set(true);
    this.f().markAsTouched();

    if (this.f().invalid()) {
      return;
    }

    submit(this.f, async () => {
      this.isSaving.set(true);

      this.#staffMemberDeviceEnrollmentApi
        .bindStaffMemberDeviceCard({
          enrollmentId: this.#enrollment.id,
          // The schema has already ruled out null; the fallback only narrows the type.
          institutionCardId: this.model().institutionCardId ?? '',
        })
        .pipe(
          finalize(() => this.isSaving.set(false)),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: (res) => {
            this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            if (res.isSucceeded) {
              this.#dialogRef.close(true);
            }
          },
          error: (err) => this.#commonService.showMessage(err.message, 'error'),
        });
    });
  }

  onCancel(): void {
    this.#dialogRef.close();
  }
}
