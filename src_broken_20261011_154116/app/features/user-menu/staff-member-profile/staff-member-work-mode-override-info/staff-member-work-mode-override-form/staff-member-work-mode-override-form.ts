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
import { catchError, finalize, map, Observable, of, tap } from 'rxjs';

import {
  Common,
  StaffMemberWorkArrangementApi,
  StaffMemberWorkModeOverrideApi,
  InstitutionLocationApi,
} from '@core/services';
import { FormDate } from '@shared/components/form-inputs/form-date/form-date';
import { FormSelect } from '@shared/components/form-inputs/form-select/form-select';
import { FormSwitch } from '@shared/components/form-inputs/form-switch/form-switch';
import { FormTextarea } from '@shared/components/form-inputs/form-textarea/form-textarea';
import {
  AttendanceConfigMutationRes,
  CreateStaffMemberWorkModeOverrideReq,
  StaffMemberWorkArrangementRow,
  StaffMemberWorkModeOverrideRow,
  InstitutionLocationRow,
  InstitutionLocationType,
  WorkMode,
} from '@shared/interfaces';
import {
  CONCRETE_WORK_MODES,
  STAFF_MEMBER_WORK_LOOKUP_PAGE_SIZE,
  isInstitutionLocationTypeCompatibleWithWorkMode,
  workModeDisallowsLocation,
  workModeRequiresExecutionLocation,
} from '@shared/utilities/common-data';
import {
  StaffMemberFilterOption,
  ensureStaffMemberOption,
  injectStaffMemberOptions,
} from '@shared/utilities/staffMember-filter-options';

import {
  StaffMemberWorkModeOverrideFormModel,
  staffMemberWorkModeOverrideSchema,
} from './staffMember-work-mode-override-form.schema';

const emptyModel: StaffMemberWorkModeOverrideFormModel = {
  staffMemberId: null,
  requestedWorkMode: null,
  staffMemberWorkArrangementId: null,
  institutionLocationId: null,
  fromDate: null,
  toDate: null,
  reason: '',
  isActive: true,
};

/**
 * `yyyy-MM-dd` for the date-only fields. Built from the local parts — the pickers hold local
 * midnight, so `toISOString()` would shift the day east of UTC.
 */
const ymd = (value: Date | null): string | null => {
  if (!value) return null;
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${value.getFullYear()}-${month}-${day}`;
};

/** Empty strings go to the API as `null`, which is what the nullable DTO fields expect. */
const nullable = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

@Component({
  selector: 'app-staffMember-work-mode-override-form',
  imports: [ButtonModule, FormDate, FormSelect, FormSwitch, FormTextarea],
  templateUrl: './staffMember-work-mode-override-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffMemberWorkModeOverrideForm {
  readonly #staffMemberWorkModeOverrideApi = inject(StaffMemberWorkModeOverrideApi);
  readonly #staffMemberWorkArrangementApi = inject(StaffMemberWorkArrangementApi);
  readonly #institutionLocationApi = inject(InstitutionLocationApi);
  readonly #commonService = inject(Common);
  readonly #dialogConfig = inject(DynamicDialogConfig);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #destroyRef = inject(DestroyRef);

  readonly #override = this.#dialogConfig.data?.override as StaffMemberWorkModeOverrideRow | undefined;
  /**
   * `StaffMember/get-all` scopes its list to the signed-in staffMember, so it may not carry whoever this
   * override actually belongs to. Falls back to their code when the name wasn't sent down either.
   */
  readonly #knownStaffMember: StaffMemberFilterOption | null = this.#override
    ? {
        staffMemberId: this.#override.staffMemberId,
        fullName:
          this.#override.staffMemberName || this.#override.staffMemberCode || this.#override.staffMemberId,
      }
    : null;

  protected readonly isEditMode = !!this.#override;
  protected readonly workModeOptions = CONCRETE_WORK_MODES;
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
  protected readonly model = signal<StaffMemberWorkModeOverrideFormModel>(
    this.#override
      ? this.#toModel(this.#override)
      : { ...emptyModel, staffMemberId: (this.#dialogConfig.data?.staffMemberId as string) || null },
  );

  /** Edit reads the record fresh, so the dialog never saves over a change made since the list loaded. */
  readonly #overrideResource = rxResource({
    params: () => (this.#override ? { id: this.#override.id } : undefined),
    stream: ({ params }) =>
      this.#staffMemberWorkModeOverrideApi.getStaffMemberWorkModeOverride(params.id).pipe(
        tap((res) => {
          if (res.isSucceeded && res.data) {
            this.model.set(this.#toModel(res.data));
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

  protected readonly isLoadingRecord = computed(() => this.#overrideResource.isLoading());

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, staffMemberWorkModeOverrideSchema);

    // An override stays with its staffMember; edit changes everything else.
    disabled(p.staffMemberId, { when: () => this.isEditMode });
  });

  /** Follows the selected staffMember, since the arrangements belong to them. */
  readonly #arrangementsResource = rxResource({
    params: () => {
      const staffMemberId = this.model().staffMemberId;
      return staffMemberId ? { staffMemberId } : undefined;
    },
    stream: ({ params }) =>
      this.#staffMemberWorkArrangementApi
        .getStaffMemberWorkArrangements({
          StaffMemberId: params.staffMemberId,
          PageSize: STAFF_MEMBER_WORK_LOOKUP_PAGE_SIZE,
        })
        .pipe(
          map((res) => (res.isSucceeded ? (res.data ?? []) : [])),
          catchError(() => of([] as StaffMemberWorkArrangementRow[])),
        ),
  });

  readonly #locationsResource = rxResource({
    stream: () =>
      this.#institutionLocationApi
        .getInstitutionLocations({ IsActive: true, PageSize: STAFF_MEMBER_WORK_LOOKUP_PAGE_SIZE })
        .pipe(
          map((res) => (res.isSucceeded ? (res.data ?? []) : [])),
          catchError(() => of([] as InstitutionLocationRow[])),
        ),
  });

  protected readonly arrangements = computed(() => this.#arrangementsResource.value() ?? []);
  protected readonly isLoadingArrangements = computed(() => this.#arrangementsResource.isLoading());
  protected readonly locations = computed(() => {
    const workMode = this.model().requestedWorkMode;
    if (workMode === null || workModeDisallowsLocation(workMode)) {
      return [];
    }

    return (this.#locationsResource.value() ?? []).filter((location) =>
      isInstitutionLocationTypeCompatibleWithWorkMode(
        workMode,
        location.locationType as InstitutionLocationType,
      ),
    );
  });
  protected readonly isLoadingLocations = computed(() => this.#locationsResource.isLoading());

  /** Office and client-site overrides have to name a location — see the schema. */
  protected readonly isLocationRequired = computed(() => {
    const workMode = this.model().requestedWorkMode;
    return workModeRequiresExecutionLocation(workMode);
  });

  onWorkModeChange(): void {
    const selectedLocationId = this.model().institutionLocationId;
    if (
      selectedLocationId !== null &&
      !this.locations().some((location) => location.id === selectedLocationId)
    ) {
      this.model.update((value) => ({ ...value, institutionLocationId: null }));
    }
  }

  #toModel(override: StaffMemberWorkModeOverrideRow): StaffMemberWorkModeOverrideFormModel {
    // `new Date('yyyy-MM-dd')` is UTC midnight, which `ymd()` reads back a day early west of UTC.
    const date = (value: string | null | undefined) => {
      if (!value) return null;
      const [year, month, day] = value.slice(0, 10).split('-').map(Number);
      return new Date(year, month - 1, day);
    };

    return {
      staffMemberId: override.staffMemberId || null,
      requestedWorkMode: override.requestedWorkMode ?? null,
      staffMemberWorkArrangementId: override.staffMemberWorkArrangementId ?? null,
      institutionLocationId: override.institutionLocationId ?? null,
      fromDate: date(override.fromDate),
      toDate: date(override.toDate),
      reason: override.reason ?? '',
      isActive: override.isActive ?? true,
    };
  }

  /** The picked arrangement belonged to the previous staffMember, so it cannot carry over. */
  onStaffMemberChange(): void {
    this.model.update((m) => ({ ...m, staffMemberWorkArrangementId: null }));
  }

  onSubmit(): void {
    if (this.isSaving() || this.isLoadingRecord()) {
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

      const request$: Observable<AttendanceConfigMutationRes> = this.#override
        ? this.#staffMemberWorkModeOverrideApi.updateStaffMemberWorkModeOverride({
            ...body,
            id: this.#override.id,
          })
        : this.#staffMemberWorkModeOverrideApi.addStaffMemberWorkModeOverride(body);

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

  #buildRequest(value: StaffMemberWorkModeOverrideFormModel): CreateStaffMemberWorkModeOverrideReq {
    return {
      // The schema has already ruled out null; the fallbacks only narrow the type.
      staffMemberId: value.staffMemberId ?? '',
      staffMemberWorkArrangementId: value.staffMemberWorkArrangementId,
      requestedWorkMode: (value.requestedWorkMode ?? WorkMode.WorkFromHome) as WorkMode,
      fromDate: ymd(value.fromDate) ?? '',
      toDate: ymd(value.toDate) ?? '',
      institutionLocationId: value.institutionLocationId,
      reason: nullable(value.reason),
      isActive: value.isActive,
    };
  }

  onCancel(): void {
    this.#dialogRef.close();
  }
}
