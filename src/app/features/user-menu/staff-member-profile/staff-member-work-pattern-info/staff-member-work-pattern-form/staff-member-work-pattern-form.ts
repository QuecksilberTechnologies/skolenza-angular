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

import {
  Common,
  StaffMemberLocationAssignmentApi,
  StaffMemberWorkArrangementApi,
  StaffMemberWorkPatternApi,
  CampusApi,
} from '@core/services';
import { FormSelect } from '@shared/components/form-inputs/form-select/form-select';
import { FormSwitch } from '@shared/components/form-inputs/form-switch/form-switch';
import {
  AttendanceConfigMutationRes,
  CreateStaffMemberWorkPatternReq,
  StaffMemberWorkArrangementRow,
  StaffMemberLocationAssignmentRow,
  StaffMemberWorkPatternRow,
  CampusRow,
  CampusType,
  WorkMode,
  WorkPatternDay,
} from '@shared/interfaces';
import {
  CONCRETE_WORK_MODES,
  dateWindowCovers,
  STAFF_MEMBER_WORK_LOOKUP_PAGE_SIZE,
  isCampusTypeCompatibleWithWorkMode,
  workModeDisallowsLocation,
  workModeRequiresExecutionLocation,
  WORK_MODES,
  WORK_PATTERN_DAYS,
} from '@shared/utilities/common-data';

import {
  StaffMemberWorkPatternFormModel,
  staffMemberWorkPatternSchema,
} from './staff-member-work-pattern-form.schema';

const emptyModel: StaffMemberWorkPatternFormModel = {
  dayOfWeek: null,
  workMode: null,
  campusId: null,
  isWorkingDay: true,
  isActive: true,
};

@Component({
  selector: 'app-staff-member-work-pattern-form',
  imports: [ButtonModule, FormSelect, FormSwitch],
  templateUrl: './staff-member-work-pattern-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffMemberWorkPatternForm {
  readonly #staffMemberWorkPatternApi = inject(StaffMemberWorkPatternApi);
  readonly #staffMemberLocationAssignmentApi = inject(StaffMemberLocationAssignmentApi);
  readonly #staffMemberWorkArrangementApi = inject(StaffMemberWorkArrangementApi);
  readonly #campusApi = inject(CampusApi);
  readonly #commonService = inject(Common);
  readonly #dialogConfig = inject(DynamicDialogConfig);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #destroyRef = inject(DestroyRef);

  readonly #pattern = this.#dialogConfig.data?.pattern as StaffMemberWorkPatternRow | undefined;
  readonly #arrangementId =
    (this.#dialogConfig.data?.staffMemberWorkArrangementId as number | null) ?? null;
  readonly #passedArrangement =
    (this.#dialogConfig.data?.arrangement as StaffMemberWorkArrangementRow | null) ?? null;
  readonly #takenDays = (this.#dialogConfig.data?.takenDays as WorkPatternDay[] | undefined) ?? [];

  /** The list only holds arrangements for a chosen staffMember, so editing from the unfiltered grid
   *  arrives without one and reads it by id. */
  readonly #arrangementResource = rxResource({
    params: () =>
      this.#passedArrangement === null && this.#arrangementId !== null
        ? { id: this.#arrangementId }
        : undefined,
    stream: ({ params }) =>
      this.#staffMemberWorkArrangementApi.getStaffMemberWorkArrangement(params.id).pipe(
        map((res) => {
          if (!res.isSucceeded) {
            this.#commonService.showMessage(res.message, 'error');
          }
          return res.isSucceeded ? res.data : null;
        }),
        catchError((err) => {
          this.#commonService.showMessage(err.message, 'error');
          return of(null);
        }),
      ),
  });
  readonly #arrangement = computed(
    () => this.#passedArrangement ?? this.#arrangementResource.value() ?? null,
  );

  protected readonly isEditMode = !!this.#pattern;
  /** Only fixed Hybrid varies by weekday; every other arrangement inherits its own mode. */
  protected readonly workModeOptions = computed(() => {
    const workMode = this.#arrangement()?.workMode;
    return workMode === WorkMode.Hybrid
      ? CONCRETE_WORK_MODES
      : WORK_MODES.filter((mode) => mode.id === workMode);
  });
  protected readonly inheritsArrangementMode = computed(
    () => this.#arrangement()?.workMode !== WorkMode.Hybrid,
  );
  /** One row per weekday per arrangement, so a day already configured is not offered again. */
  protected readonly dayOptions = WORK_PATTERN_DAYS.filter(
    (day) => !this.#takenDays.includes(day.id),
  );

  protected readonly isSaving = signal(false);
  /** Flipped by the first submit attempt, so every outstanding error surfaces at once. */
  protected readonly submitted = signal(false);

  protected readonly model = signal<StaffMemberWorkPatternFormModel>(
    this.#pattern
      ? this.#toModel(this.#pattern)
      : {
          ...emptyModel,
          workMode: this.inheritsArrangementMode()
            ? (this.#passedArrangement?.workMode ?? null)
            : null,
          campusId: this.inheritsArrangementMode()
            ? (this.#passedArrangement?.primaryCampusId ?? null)
            : null,
        },
  );

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, staffMemberWorkPatternSchema);

    // The fresh read replaces the model when it lands, so nothing typed before then would survive.
    disabled(p, { when: () => this.isLoadingPattern() });
    disabled(p.workMode, { when: () => this.inheritsArrangementMode() });
    // A weekly off has no mode or location; hiding them also skips their validation.
    const isDayOff = () => !this.isWorkingDay();
    hidden(p.workMode, { when: isDayOff });
    hidden(p.campusId, { when: isDayOff });
  });

  readonly #locationsResource = rxResource({
    stream: () =>
      this.#campusApi
        .getCampuses({ IsActive: true, PageSize: STAFF_MEMBER_WORK_LOOKUP_PAGE_SIZE })
        .pipe(
          map((res) => {
            if (!res.isSucceeded) {
              this.#commonService.showMessage(res.message, 'error');
            }
            return res.isSucceeded ? (res.data ?? []) : [];
          }),
          catchError((err) => {
            this.#commonService.showMessage(err.message, 'error');
            return of([] as CampusRow[]);
          }),
        ),
  });

  readonly #assignmentsResource = rxResource({
    params: () => {
      const staffMemberId = this.#arrangement()?.staffMemberId;
      return staffMemberId ? { staffMemberId } : undefined;
    },
    stream: ({ params }) =>
      this.#staffMemberLocationAssignmentApi
        .getStaffMemberLocationAssignments({
          StaffMemberId: params.staffMemberId,
          IsActive: true,
          PageSize: STAFF_MEMBER_WORK_LOOKUP_PAGE_SIZE,
        })
        .pipe(
          map((res) => (res.isSucceeded ? (res.data ?? []) : [])),
          catchError(() => of([] as StaffMemberLocationAssignmentRow[])),
        ),
  });

  /** Edit reads the record fresh, so the dialog never saves over a change made since the list loaded. */
  readonly #patternResource = rxResource({
    params: () => (this.#pattern ? { id: this.#pattern.id } : undefined),
    stream: ({ params }) =>
      this.#staffMemberWorkPatternApi.getStaffMemberWorkPattern(params.id).pipe(
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

  protected readonly isLoadingPattern = computed(() => this.#patternResource.isLoading());

  protected readonly locations = computed(() => {
    const workMode = this.model().workMode;
    if (workMode === null || workModeDisallowsLocation(workMode)) {
      return [];
    }

    const arrangementFrom = this.#arrangement()?.effectiveFrom;
    const arrangementTo = this.#arrangement()?.effectiveTo;
    const assignedLocationIds = new Set(
      (this.#assignmentsResource.value() ?? [])
        .filter(
          (assignment) =>
            assignment.isAttendanceAllowed &&
            (!arrangementFrom ||
              dateWindowCovers(
                assignment.effectiveFrom,
                assignment.effectiveTo,
                arrangementFrom,
                arrangementTo,
              )),
        )
        .map((assignment) => assignment.campusId),
    );

    return (this.#locationsResource.value() ?? []).filter(
      (location) =>
        assignedLocationIds.has(location.id) &&
        isCampusTypeCompatibleWithWorkMode(
          workMode,
          location.locationType as CampusType,
        ),
    );
  });
  protected readonly isLoadingLocations = computed(
    () =>
      this.#locationsResource.isLoading() ||
      this.#assignmentsResource.isLoading() ||
      this.#arrangementResource.isLoading(),
  );

  /** Office and client-site days have to name a location — see the schema. */
  /** A weekly off has no mode or location, so the template and the `hidden()` rules drop both. */
  protected readonly isWorkingDay = computed(() => this.model().isWorkingDay);

  protected readonly isLocationRequired = computed(() => {
    const { workMode } = this.model();
    return this.isWorkingDay() && workModeRequiresExecutionLocation(workMode);
  });

  onWorkModeChange(): void {
    const selectedLocationId = this.model().campusId;
    if (
      selectedLocationId !== null &&
      !this.locations().some((location) => location.id === selectedLocationId)
    ) {
      this.model.update((value) => ({ ...value, campusId: null }));
    }
  }

  protected readonly isBusy = computed(() => this.isSaving() || this.isLoadingPattern());

  #toModel(pattern: StaffMemberWorkPatternRow): StaffMemberWorkPatternFormModel {
    return {
      dayOfWeek: pattern.dayOfWeek ?? null,
      workMode: pattern.workMode ?? null,
      campusId: pattern.campusId ?? null,
      isWorkingDay: pattern.isWorkingDay ?? true,
      isActive: pattern.isActive ?? true,
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

    if (this.#arrangementId === null) {
      this.#commonService.showMessage('No work arrangement selected.', 'error');
      return;
    }

    submit(this.f, async () => {
      const body = this.#buildRequest(this.model(), this.#arrangementId as number);
      this.isSaving.set(true);

      const request$: Observable<AttendanceConfigMutationRes> = this.#pattern
        ? this.#staffMemberWorkPatternApi.updateStaffMemberWorkPattern({ ...body, id: this.#pattern.id })
        : this.#staffMemberWorkPatternApi.addStaffMemberWorkPattern(body);

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

  #buildRequest(
    value: StaffMemberWorkPatternFormModel,
    staffMemberWorkArrangementId: number,
  ): CreateStaffMemberWorkPatternReq {
    return {
      staffMemberWorkArrangementId,
      // The schema has already ruled out a null day; the fallback only narrows the type.
      dayOfWeek: (value.dayOfWeek ?? WorkPatternDay.Monday) as WorkPatternDay,
      // The backend requires a mode even for a weekly off, which never picks one.
      workMode: (value.workMode ?? WorkMode.Office) as WorkMode,
      // A non-working day is nowhere, so it carries no location.
      campusId: value.isWorkingDay ? value.campusId : null,
      isWorkingDay: value.isWorkingDay,
      isActive: value.isActive,
    };
  }

  onCancel(): void {
    this.#dialogRef.close();
  }
}
