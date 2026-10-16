import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { disabled, form, submit, validateStandardSchema } from '@angular/forms/signals';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { MessageModule } from '@openng/optimus-ui/message';
import { catchError, finalize, map, Observable, of, tap } from 'rxjs';

import {
  Common,
  DeviceDdlOptionsApi,
  StaffMemberDeviceEnrollmentApi,
  StaffMemberLocationAssignmentApi,
  InstitutionDeviceApi,
} from '@core/services';
import { FormDate } from '@shared/components/form-inputs/form-date/form-date';
import { FormSelect } from '@shared/components/form-inputs/form-select/form-select';
import { FormSwitch } from '@shared/components/form-inputs/form-switch/form-switch';
import {
  AttendanceConfigMutationRes,
  CreateStaffMemberDeviceEnrollmentReq,
  DeviceDdlOptionValue,
  StaffMemberDeviceAccessWindow,
  StaffMemberDeviceEnrollmentRow,
  StaffMemberLocationAssignmentRow,
  InstitutionDeviceRow,
} from '@shared/interfaces';
import {
  StaffMemberFilterOption,
  ensureStaffMemberOption,
  injectStaffMemberOptions,
} from '@shared/utilities/staffMember-filter-options';

import {
  StaffMemberDeviceEnrollmentFormModel,
  staffMemberDeviceEnrollmentSchema,
} from './staffMember-device-enrollment-form.schema';

const emptyModel: StaffMemberDeviceEnrollmentFormModel = {
  staffMemberId: null,
  institutionDeviceId: null,
  accessEffectiveFromDateTime: null,
  accessEffectiveToDateTime: null,
  isActive: true,
};

/** One page big enough to hold every lookup row — these feed a dropdown, not a grid. */
const LOOKUP_PAGE_SIZE = 500;

@Component({
  selector: 'app-staffMember-device-enrollment-form',
  imports: [ButtonModule, MessageModule, FormDate, FormSelect, FormSwitch],
  templateUrl: './staffMember-device-enrollment-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffMemberDeviceEnrollmentForm {
  readonly #staffMemberDeviceEnrollmentApi = inject(StaffMemberDeviceEnrollmentApi);
  readonly #deviceDdlOptionsApi = inject(DeviceDdlOptionsApi);
  readonly #institutionDeviceApi = inject(InstitutionDeviceApi);
  readonly #staffMemberLocationAssignmentApi = inject(StaffMemberLocationAssignmentApi);
  readonly #commonService = inject(Common);
  readonly #dialogConfig = inject(DynamicDialogConfig);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #destroyRef = inject(DestroyRef);

  readonly #enrollment = this.#dialogConfig.data?.enrollment as
    | StaffMemberDeviceEnrollmentRow
    | undefined;
  /**
   * `StaffMember/get-all` scopes its list to the signed-in staffMember, so it may not carry whoever this
   * enrollment actually belongs to. Falls back to their code when the name wasn't sent down either.
   */
  readonly #knownStaffMember: StaffMemberFilterOption | null = this.#enrollment
    ? {
        staffMemberId: this.#enrollment.staffMemberId,
        fullName:
          this.#enrollment.staffMemberName ||
          this.#enrollment.staffMemberCode ||
          this.#enrollment.staffMemberId,
      }
    : null;

  protected readonly isEditMode = !!this.#enrollment;

  /**
   * The weekly access windows this enrollment already has, shown read-only.
   *
   * No control edits them - `#buildRequest` resends them untouched - so this is a view of what the
   * device is enforcing rather than an editor. The list row seeds them and the fresh read replaces
   * them, so `/update` never resends windows that changed since the list loaded. The day numbers
   * are the backend's `WorkPatternDay` enum, and `device-ddl-options/staffMember-device-access-windows`
   * is the only thing that names them, which is why the labels are fetched rather than hard-coded.
   */
  protected readonly accessWindows = signal<StaffMemberDeviceAccessWindow[]>(
    this.#enrollment?.accessWindows ?? [],
  );

  readonly #accessWindowDays = rxResource({
    // Nothing to label when the enrollment has no windows, so the read stays idle.
    params: () => (this.accessWindows().length > 0 ? true : undefined),
    stream: () =>
      this.#deviceDdlOptionsApi.getStaffMemberDeviceAccessWindows().pipe(
        map((res): DeviceDdlOptionValue[] =>
          res.isSucceeded
            ? (res.data.find((section) => section.key === 'dayOfWeek')?.options ?? [])
            : [],
        ),
        catchError(() => of([] as DeviceDdlOptionValue[])),
      ),
  });

  /** Falls back to the raw number: an unlabelled day still beats an empty cell. */
  protected dayLabel(dayOfWeek: number): string {
    const options = this.#accessWindowDays.value() ?? [];
    const match = options.find((option) => option.value === String(dayOfWeek));
    return match?.label ?? `Day ${dayOfWeek}`;
  }
  readonly #staffMemberOptions = injectStaffMemberOptions();
  protected readonly staffMembers = {
    options: computed(() =>
      ensureStaffMemberOption(this.#staffMemberOptions.options(), this.#knownStaffMember),
    ),
    isLoading: this.#staffMemberOptions.isLoading,
  };
  protected readonly isSaving = signal(false);
  /** Flipped by the first submit attempt, so every outstanding error surfaces at once. */
  protected readonly submitted = signal(false);

  /** Add pre-selects whichever staffMember the page is filtered to. */
  protected readonly model = signal<StaffMemberDeviceEnrollmentFormModel>(
    this.#enrollment
      ? this.#toModel(this.#enrollment)
      : { ...emptyModel, staffMemberId: (this.#dialogConfig.data?.staffMemberId as string) || null },
  );

  /** Edit reads the record fresh, so the dialog never saves over a change made since the list loaded. */
  readonly #enrollmentResource = rxResource({
    params: () => (this.#enrollment ? { id: this.#enrollment.id } : undefined),
    stream: ({ params }) =>
      this.#staffMemberDeviceEnrollmentApi.getStaffMemberDeviceEnrollment(params.id).pipe(
        tap((res) => {
          if (res.isSucceeded && res.data) {
            this.model.set(this.#toModel(res.data));
            this.accessWindows.set(res.data.accessWindows ?? []);
          } else if (!res.isSucceeded) {
            this.#commonService.showMessage(res.message, 'error');
          }
        }),
        // The row passed in still seeds the form, so a failed read leaves it editable.
        catchError((err) => {
          this.#commonService.showMessage(err.message, 'error');
          return of(null);
        }),
      ),
  });

  protected readonly isLoadingRecord = computed(() => this.#enrollmentResource.isLoading());

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, staffMemberDeviceEnrollmentSchema);

    // An enrollment stays with its staffMember; edit changes everything else.
    disabled(p.staffMemberId, { when: () => this.isEditMode || this.staffMembers.isLoading() });
    // Nothing to pick until the options arrive.
    disabled(p.institutionDeviceId, { when: () => this.isLoadingDevices() });
  });

  /**
   * `/InstitutionDevice/get-all` is a host-owned endpoint; a institution session may or may not be allowed to
   * read it. If it is rejected the toast says so and the dropdown stays empty rather than silently
   * offering nothing (see `docs/api-coverage/api-issues-for-backend.md`).
   */
  readonly #devicesResource = rxResource({
    stream: () =>
      this.#institutionDeviceApi.getInstitutionDevices({ IsActive: true, PageSize: LOOKUP_PAGE_SIZE }).pipe(
        map((res) => {
          if (!res.isSucceeded) {
            this.#commonService.showMessage(res.message, 'error');
          }
          return res.isSucceeded ? (res.data ?? []) : [];
        }),
        catchError((err) => {
          this.#commonService.showMessage(err.message, 'error');
          return of([] as InstitutionDeviceRow[]);
        }),
      ),
  });

  /**
   * The enrollment controller takes the device by its opaque id, so the option value is the row id
   * as a string rather than the number the device list types it as.
   */
  protected readonly devices = computed(() =>
    (this.#devicesResource.value() ?? []).map((device) => ({
      value: String(device.id),
      label: device.deviceName ?? device.deviceCode ?? String(device.id),
      deviceCode: device.deviceCode ?? '',
    })),
  );
  protected readonly isLoadingDevices = computed(() => this.#devicesResource.isLoading());

  /**
   * Saving waits on the dropdown lists too: their fields are disabled while loading, and a disabled
   * field skips validation, so a submit then would pass `invalid()` with an empty id.
   */
  protected readonly isBusy = computed(
    () =>
      this.isSaving() ||
      this.isLoadingRecord() ||
      this.isLoadingDevices() ||
      this.staffMembers.isLoading(),
  );

  /**
   * Enrolling onto a device requires the staffMember to already have an active `StaffMemberLocationAssignment`
   * for that device's own institution location (`docs/specs/device-configuration/
   * skolenza-device-angular-handoff.md` §5.1) — the backend rejects a mismatch with a generic
   * "configuration references are invalid" error, so this warns ahead of the round trip instead.
   * Follows the selected staffMember, since the assignments belong to them.
   */
  readonly #locationAssignmentsResource = rxResource({
    params: () => {
      const staffMemberId = this.model().staffMemberId;
      return staffMemberId ? { staffMemberId } : undefined;
    },
    stream: ({ params }) =>
      this.#staffMemberLocationAssignmentApi
        .getStaffMemberLocationAssignments({
          StaffMemberId: params.staffMemberId,
          IsActive: true,
          PageSize: LOOKUP_PAGE_SIZE,
        })
        .pipe(
          map((res) => (res.isSucceeded ? (res.data ?? []) : [])),
          catchError(() => of([] as StaffMemberLocationAssignmentRow[])),
        ),
  });

  readonly #assignedLocationIds = computed(
    () => new Set(this.#locationAssignmentsResource.value()?.map((row) => row.campusId)),
  );

  readonly #selectedDevice = computed(() => {
    const institutionDeviceId = this.model().institutionDeviceId;
    return (this.#devicesResource.value() ?? []).find(
      (device) => String(device.id) === institutionDeviceId,
    );
  });

  /** Only meaningful once both sides of the comparison have actually loaded. */
  protected readonly showLocationMismatchWarning = computed(() => {
    const staffMemberId = this.model().staffMemberId;
    const device = this.#selectedDevice();
    if (!staffMemberId || !device || this.#locationAssignmentsResource.isLoading()) {
      return false;
    }
    return !this.#assignedLocationIds().has(device.campusId);
  });

  protected readonly mismatchedDeviceLocationName = computed(
    () => this.#selectedDevice()?.campusName ?? "this device's location",
  );

  #toModel(enrollment: StaffMemberDeviceEnrollmentRow): StaffMemberDeviceEnrollmentFormModel {
    const date = (value: string | null | undefined) => (value ? new Date(value) : null);

    return {
      staffMemberId: enrollment.staffMemberId || null,
      // Coerced, not assumed: the option values are built with `String(device.id)` and the read
      // side's `institutionDeviceId` may come back numeric. Without this the edit dialog opens with an
      // empty device select. See `docs/api-coverage/api-issues-for-backend.md`, Issue 14.
      institutionDeviceId:
        enrollment.institutionDeviceId === null || enrollment.institutionDeviceId === undefined
          ? null
          : String(enrollment.institutionDeviceId),
      accessEffectiveFromDateTime: date(enrollment.accessEffectiveFromDateTime),
      accessEffectiveToDateTime: date(enrollment.accessEffectiveToDateTime),
      isActive: enrollment.isActive ?? true,
    };
  }

  onSubmit(): void {
    if (this.isBusy()) {
      return;
    }

    this.submitted.set(true);
    this.f().markAsTouched();

    if (this.f().invalid()) {
      return;
    }

    submit(this.f, async () => {
      const body = this.#buildRequest(this.model());
      this.isSaving.set(true);

      const request$: Observable<AttendanceConfigMutationRes> = this.#enrollment
        ? this.#staffMemberDeviceEnrollmentApi.updateStaffMemberDeviceEnrollment({
            ...body,
            id: this.#enrollment.id,
          })
        : this.#staffMemberDeviceEnrollmentApi.addStaffMemberDeviceEnrollment(body);

      request$
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

  #buildRequest(value: StaffMemberDeviceEnrollmentFormModel): CreateStaffMemberDeviceEnrollmentReq {
    return {
      // The schema has already ruled out null; the fallbacks only narrow the type.
      staffMemberId: value.staffMemberId ?? '',
      institutionDeviceId: value.institutionDeviceId ?? '',
      accessEffectiveFromDateTime: value.accessEffectiveFromDateTime?.toISOString() ?? null,
      accessEffectiveToDateTime: value.accessEffectiveToDateTime?.toISOString() ?? null,
      // No control edits the weekly windows, and `/update` replaces the record, so they are resent
      // as they came back rather than wiped. The backend requires the field on create though, where
      // there is nothing to resend, so that case sends an empty list rather than null.
      accessWindows: this.accessWindows(),
      isActive: value.isActive,
    };
  }

  onCancel(): void {
    this.#dialogRef.close();
  }
}
