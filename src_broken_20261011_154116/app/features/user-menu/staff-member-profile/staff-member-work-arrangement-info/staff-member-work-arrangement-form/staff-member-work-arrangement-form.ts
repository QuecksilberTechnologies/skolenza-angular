import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { disabled, form, hidden, submit, validateStandardSchema } from '@angular/forms/signals';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { catchError, finalize, map, Observable, of, tap } from 'rxjs';

import { Common, StaffMemberWorkArrangementApi, InstitutionLocationApi } from '@core/services';
import { FormDate } from '@shared/components/form-inputs/form-date/form-date';
import { FormNumber } from '@shared/components/form-inputs/form-number/form-number';
import { FormSelect } from '@shared/components/form-inputs/form-select/form-select';
import { FormSwitch } from '@shared/components/form-inputs/form-switch/form-switch';
import {
  AttendanceConfigMutationRes,
  CreateStaffMemberWorkArrangementReq,
  StaffMemberWorkArrangementRow,
  HybridType,
  InstitutionLocationType,
  InstitutionLocationRow,
  WorkMode,
} from '@shared/interfaces';
import {
  STAFF_MEMBER_WORK_LOOKUP_PAGE_SIZE,
  HYBRID_TYPES,
  isInstitutionLocationTypeCompatibleWithWorkMode,
  workModeRequiresPrimaryLocation,
  WORK_MODES,
} from '@shared/utilities/common-data';
import {
  StaffMemberFilterOption,
  ensureStaffMemberOption,
  injectStaffMemberOptions,
} from '@shared/utilities/staffMember-filter-options';

import {
  StaffMemberWorkArrangementFormModel,
  staffMemberWorkArrangementSchema,
} from './staffMember-work-arrangement-form.schema';

const emptyModel: StaffMemberWorkArrangementFormModel = {
  staffMemberId: null,
  policyVersionId: null,
  workMode: null,
  hybridType: null,
  primaryInstitutionLocationId: null,

  minimumOfficeDaysPerWeek: null,
  minimumOfficeDaysPerMonth: null,
  maximumWFHDaysPerMonth: null,

  effectiveFrom: null,
  effectiveTo: null,
  isActive: true,
};

interface PolicyOption {
  id: number;
  policyName: string;
}

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

@Component({
  selector: 'app-staffMember-work-arrangement-form',
  imports: [ButtonModule, FormDate, FormNumber, FormSelect, FormSwitch],
  templateUrl: './staffMember-work-arrangement-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffMemberWorkArrangementForm {
  readonly #staffMemberWorkArrangementApi = inject(StaffMemberWorkArrangementApi);
  readonly #institutionLocationApi = inject(InstitutionLocationApi);
  readonly #commonService = inject(Common);
  readonly #dialogConfig = inject(DynamicDialogConfig);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #destroyRef = inject(DestroyRef);

  readonly #arrangement = this.#dialogConfig.data?.arrangement as
    | StaffMemberWorkArrangementRow
    | undefined;
  /**
   * `StaffMember/get-all` scopes its list to the signed-in staffMember, so it may not carry whoever this
   * arrangement actually belongs to. Falls back to their code when the name wasn't sent down either.
   */
  readonly #knownStaffMember: StaffMemberFilterOption | null = this.#arrangement
    ? {
        staffMemberId: this.#arrangement.staffMemberId,
        fullName:
          this.#arrangement.staffMemberName ||
          this.#arrangement.staffMemberCode ||
          this.#arrangement.staffMemberId,
      }
    : null;

  protected readonly isEditMode = !!this.#arrangement;
  protected readonly workModeOptions = WORK_MODES;
  protected readonly hybridTypeOptions = HYBRID_TYPES;
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
  protected readonly model = signal<StaffMemberWorkArrangementFormModel>(
    this.#arrangement
      ? this.#toModel(this.#arrangement)
      : { ...emptyModel, staffMemberId: (this.#dialogConfig.data?.staffMemberId as string) || null },
  );

  /** Edit reads the record fresh, so the dialog never saves over a change made since the list loaded. */
  readonly #arrangementResource = rxResource({
    params: () => (this.#arrangement ? { id: this.#arrangement.id } : undefined),
    stream: ({ params }) =>
      this.#staffMemberWorkArrangementApi.getStaffMemberWorkArrangement(params.id).pipe(
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

  protected readonly isLoadingRecord = computed(() => this.#arrangementResource.isLoading());

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, staffMemberWorkArrangementSchema);

    // An arrangement stays with its staffMember; edit changes everything else.
    disabled(p.staffMemberId, { when: () => this.isEditMode || this.staffMembers.isLoading() });
    // Policy versions depend on the start date, which is always sent explicitly.
    disabled(p.policyVersionId, { when: ({ valueOf }) => !valueOf(p.effectiveFrom) });
    // The hybrid fields leave the template outside hybrid work; hiding them skips their validation
    // too, so a stale quota can't block the save with an error nobody can see.
    const notHybrid = () => !this.isHybrid();
    hidden(p.hybridType, { when: notHybrid });
    hidden(p.minimumOfficeDaysPerWeek, { when: notHybrid });
    hidden(p.minimumOfficeDaysPerMonth, { when: notHybrid });
    hidden(p.maximumWFHDaysPerMonth, { when: notHybrid });
  });

  /** Which policy versions are selectable depends on the day the arrangement starts. */
  readonly #policyEffectiveOn = computed(() => ymd(this.model().effectiveFrom));

  readonly #policiesResource = rxResource({
    params: () => {
      const effectiveOn = this.#policyEffectiveOn();
      return effectiveOn ? { effectiveOn } : undefined;
    },
    stream: ({ params }) =>
      this.#staffMemberWorkArrangementApi
        .getAttendancePolicyOptions({ EffectiveOn: params.effectiveOn })
        .pipe(
          map((res) => {
            if (!res.isSucceeded) {
              this.#commonService.showMessage(res.message, 'error');
              return [];
            }
            return (res.data ?? []).map((option) => ({
              id: option.policyVersionId,
              policyName: option.displayName,
            }));
          }),
          catchError((err) => {
            this.#commonService.showMessage(err.message, 'error');
            return of([] as PolicyOption[]);
          }),
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

  protected readonly policies = computed(() => this.#policiesResource.value() ?? []);
  protected readonly isLoadingPolicies = computed(() => this.#policiesResource.isLoading());
  /** Only show locations the API accepts for the selected work mode. */
  protected readonly locations = computed(() => {
    const workMode = this.model().workMode;
    const locations = this.#locationsResource.value() ?? [];
    if (workMode === null) {
      return locations;
    }

    return locations.filter(
      (location) =>
        location.locationType !== undefined &&
        isInstitutionLocationTypeCompatibleWithWorkMode(
          workMode as WorkMode,
          location.locationType as InstitutionLocationType,
        ),
    );
  });
  protected readonly isLoadingLocations = computed(() => this.#locationsResource.isLoading());

  /** The hybrid quotas only mean anything for hybrid work. */
  protected readonly isHybrid = computed(() => this.model().workMode === WorkMode.Hybrid);

  /** Every office/client-site arrangement needs an authoritative primary location. */
  protected readonly isPrimaryLocationRequired = computed(() => {
    const workMode = this.model().workMode;
    return workModeRequiresPrimaryLocation(workMode);
  });

  /**
   * Add waits on the staffMember list too: its field is disabled while loading, and a disabled field
   * skips validation, so a submit then would pass `invalid()` with an empty id. Edit locks the
   * staffMember anyway, so it never waits.
   */
  protected readonly isBusy = computed(
    () =>
      this.isSaving() || this.isLoadingRecord() || (!this.isEditMode && this.staffMembers.isLoading()),
  );

  #toModel(arrangement: StaffMemberWorkArrangementRow): StaffMemberWorkArrangementFormModel {
    const date = (value: string | null | undefined) => (value ? new Date(value) : null);

    return {
      staffMemberId: arrangement.staffMemberId || null,
      policyVersionId: arrangement.policyVersionId ?? null,
      workMode: arrangement.workMode ?? null,
      hybridType: arrangement.hybridType ?? null,
      primaryInstitutionLocationId: arrangement.primaryInstitutionLocationId ?? null,

      minimumOfficeDaysPerWeek: arrangement.minimumOfficeDaysPerWeek ?? null,
      minimumOfficeDaysPerMonth: arrangement.minimumOfficeDaysPerMonth ?? null,
      maximumWFHDaysPerMonth: arrangement.maximumWFHDaysPerMonth ?? null,

      effectiveFrom: date(arrangement.effectiveFrom),
      effectiveTo: date(arrangement.effectiveTo),
      isActive: arrangement.isActive ?? true,
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

    const selectedLocationId = this.model().primaryInstitutionLocationId;
    if (
      selectedLocationId !== null &&
      !this.locations().some((location) => location.id === selectedLocationId)
    ) {
      this.#commonService.showMessage(
        'Select a primary location that matches the selected work mode.',
        'error',
      );
      return;
    }

    submit(this.f, async () => {
      const body = this.#buildRequest(this.model());
      this.isSaving.set(true);

      const request$: Observable<AttendanceConfigMutationRes> = this.#arrangement
        ? this.#staffMemberWorkArrangementApi.updateStaffMemberWorkArrangement({
            ...body,
            id: this.#arrangement.id,
          })
        : this.#staffMemberWorkArrangementApi.addStaffMemberWorkArrangement(body);

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

  #buildRequest(value: StaffMemberWorkArrangementFormModel): CreateStaffMemberWorkArrangementReq {
    const isHybrid = value.workMode === WorkMode.Hybrid;

    return {
      // The schema has already ruled out null; the fallbacks only narrow the type.
      staffMemberId: value.staffMemberId ?? '',
      policyVersionId: value.policyVersionId ?? 0,
      workMode: (value.workMode ?? WorkMode.Office) as WorkMode,
      hybridType: isHybrid ? (value.hybridType as HybridType) : null,
      primaryInstitutionLocationId: value.primaryInstitutionLocationId,

      // The quotas describe a hybrid split, so a non-hybrid arrangement sends none of them.
      minimumOfficeDaysPerWeek: isHybrid ? value.minimumOfficeDaysPerWeek : null,
      minimumOfficeDaysPerMonth: isHybrid ? value.minimumOfficeDaysPerMonth : null,
      maximumWFHDaysPerMonth: isHybrid ? value.maximumWFHDaysPerMonth : null,

      effectiveFrom: ymd(value.effectiveFrom) ?? '',
      effectiveTo: ymd(value.effectiveTo),
      isActive: value.isActive,
    };
  }

  onCancel(): void {
    this.#dialogRef.close();
  }
}
