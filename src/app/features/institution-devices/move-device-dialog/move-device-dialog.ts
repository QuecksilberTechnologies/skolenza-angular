import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, submit, validateStandardSchema } from '@angular/forms/signals';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { catchError, finalize, map, of } from 'rxjs';

import { Common, InstitutionDeviceApi, CampusApi } from '@core/services';
import { FormActionBar } from '@shared/components/form-action-bar/form-action-bar';
import { FormSelect } from '@shared/components/form-inputs/form-select/form-select';
import { InstitutionDeviceRow, CampusRow } from '@shared/interfaces';

import { MoveDeviceModel, moveDeviceSchema } from './move-device-dialog.schema';

/** One page big enough to hold every location — these feed a dropdown, not a grid. */
const LOOKUP_PAGE_SIZE = 500;

/**
 * Moves an assigned device to another of the institution's locations.
 *
 * Only the Institution location changes: the Host inventory's `DeviceMaster` assignment is untouched,
 * and the backend does **not** move, disable or revalidate the staffMember enrollments that already
 * point at this device - which is why the success path says so out loud rather than leaving the
 * administrator to find out.
 */
@Component({
  selector: 'app-move-device-dialog',
  imports: [FormActionBar, FormSelect],
  templateUrl: './move-device-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoveDeviceDialog {
  readonly #institutionDeviceApi = inject(InstitutionDeviceApi);
  readonly #campusApi = inject(CampusApi);
  readonly #commonService = inject(Common);
  readonly #dialogConfig = inject(DynamicDialogConfig);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #destroyRef = inject(DestroyRef);

  readonly #device = this.#dialogConfig.data?.device as InstitutionDeviceRow | undefined;
  readonly #institutionId = (this.#dialogConfig.data?.institutionId as string | null) ?? null;

  protected readonly deviceName = this.#device?.deviceName || 'this device';
  protected readonly currentLocationName = this.#device?.campusName || null;
  protected readonly isSaving = signal(false);
  protected readonly submitted = signal(false);

  readonly #locations = rxResource({
    stream: () =>
      this.#campusApi
        .getCampuses({ IsActive: true, PageNumber: 1, PageSize: LOOKUP_PAGE_SIZE })
        .pipe(
          map((res): CampusRow[] => (res.isSucceeded ? (res.data ?? []) : [])),
          catchError(() => of([] as CampusRow[])),
        ),
  });

  /** The location it already sits at is not somewhere to move it to. */
  protected readonly locations = computed(() =>
    (this.#locations.value() ?? []).filter(
      (location) => location.id !== this.#device?.campusId,
    ),
  );
  protected readonly isLoadingLocations = computed(() => this.#locations.isLoading());

  protected readonly model = signal<MoveDeviceModel>({ campusId: null });

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, moveDeviceSchema);
  });

  onSubmit(): void {
    if (this.isSaving() || !this.#device) {
      return;
    }

    // The list resolves the institution from an awaited session read, so a dialog opened early - or a
    // session with no institution at all - would otherwise submit into silence.
    if (!this.#institutionId) {
      this.#commonService.showMessage(
        'Your session has no institution, so the device cannot be moved. Reload and try again.',
        'error',
      );
      return;
    }

    this.submitted.set(true);
    this.f().markAsTouched();

    if (this.f().invalid()) {
      return;
    }

    submit(this.f, async () => {
      this.isSaving.set(true);

      this.#institutionDeviceApi
        .updateInstitutionDeviceLocation({
          institutionId: this.#institutionId!,
          institutionDeviceId: this.#device!.id,
          // The schema has already ruled out null; the fallback only narrows the type.
          campusId: this.model().campusId ?? 0,
        })
        .pipe(
          finalize(() => this.isSaving.set(false)),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: (res) => {
            if (!res.isSucceeded) {
              this.#commonService.showMessage(res.message, 'error');
              return;
            }

            this.#commonService.showMessage(
              'Device moved. Existing staffMember enrollments were not moved with it, so review them before the device is used.',
              'success',
            );
            this.#dialogRef.close(true);
          },
          error: (err) => this.#commonService.showMessage(err.message, 'error'),
        });
    });
  }

  onCancel(): void {
    this.#dialogRef.close();
  }
}
