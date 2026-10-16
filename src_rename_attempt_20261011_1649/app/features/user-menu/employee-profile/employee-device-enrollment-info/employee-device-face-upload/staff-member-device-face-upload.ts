import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { MessageModule } from '@openng/optimus-ui/message';
import { finalize } from 'rxjs';

import { Common, StaffMemberDeviceEnrollmentApi } from '@core/services';
import { StaffMemberDeviceEnrollmentRow } from '@shared/interfaces';

/** The API's own limits: one JPEG or PNG, at most 2 MB. */
const ACCEPTED_TYPES = ['image/jpeg', 'image/png'];
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Queues a face image for an enrollment that already exists.
 *
 * Not a Signal Form: the only field is a file, which a zod schema cannot usefully validate and
 * which never round-trips - the API stores biometric data and publishes no read for it, so the
 * preview here is the local `File`, never anything fetched back.
 */
@Component({
  selector: 'app-staffMember-device-face-upload',
  imports: [ButtonModule, MessageModule],
  templateUrl: './staffMember-device-face-upload.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffMemberDeviceFaceUpload {
  readonly #staffMemberDeviceEnrollmentApi = inject(StaffMemberDeviceEnrollmentApi);
  readonly #commonService = inject(Common);
  readonly #dialogConfig = inject(DynamicDialogConfig);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #destroyRef = inject(DestroyRef);

  readonly #enrollment = this.#dialogConfig.data?.enrollment as StaffMemberDeviceEnrollmentRow;

  protected readonly deviceName = this.#enrollment?.deviceName ?? 'this device';
  protected readonly isSaving = signal(false);
  protected readonly file = signal<File | null>(null);
  protected readonly error = signal<string | null>(null);
  /** Object URL for the chosen file, revoked whenever the choice changes or the dialog closes. */
  protected readonly previewUrl = signal<string | null>(null);

  protected readonly fileName = computed(() => this.file()?.name ?? '');
  protected readonly canSubmit = computed(() => !!this.file() && !this.isSaving());

  constructor() {
    this.#destroyRef.onDestroy(() => this.#revokePreview());
  }

  #revokePreview(): void {
    const url = this.previewUrl();
    if (url && typeof URL !== 'undefined') {
      URL.revokeObjectURL(url);
    }
    this.previewUrl.set(null);
  }

  protected onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const chosen = input.files?.[0] ?? null;

    this.#revokePreview();
    this.file.set(null);
    this.error.set(null);

    if (!chosen) return;

    if (!ACCEPTED_TYPES.includes(chosen.type)) {
      this.error.set('Choose a JPEG or PNG image.');
      // Clear the control too, or the rejected name keeps showing beside a message that says no.
      input.value = '';
      return;
    }

    if (chosen.size > MAX_BYTES) {
      this.error.set('The image must be 2 MB or smaller.');
      input.value = '';
      return;
    }

    this.file.set(chosen);
    if (typeof URL !== 'undefined') {
      this.previewUrl.set(URL.createObjectURL(chosen));
    }
  }

  onSubmit(): void {
    const chosen = this.file();
    if (!chosen || this.isSaving() || !this.#enrollment) {
      return;
    }

    const body = new FormData();
    body.append('enrollmentId', this.#enrollment.id);
    body.append('faceImage', chosen, chosen.name);

    this.isSaving.set(true);

    this.#staffMemberDeviceEnrollmentApi
      .upsertStaffMemberDeviceFace(body)
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
  }

  onCancel(): void {
    this.#dialogRef.close();
  }
}
