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
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { catchError, finalize, map, Observable, of, tap } from 'rxjs';

import { Common, StaffMemberLocationAssignmentApi, CampusApi } from '@core/services';
import { FormActionBar } from '@shared/components/form-action-bar/form-action-bar';
import { FormDate } from '@shared/components/form-inputs/form-date/form-date';
import { FormSelect } from '@shared/components/form-inputs/form-select/form-select';
import { FormSwitch } from '@shared/components/form-inputs/form-switch/form-switch';
import {
  AttendanceConfigMutationRes,
  CreateStaffMemberLocationAssignmentReq,
  StaffMemberLocationAssignmentRow,
  CampusRow,
} from '@shared/interfaces';
import { localDateKey } from '@shared/utilities/date-key';
import {
  StaffMemberFilterOption,
  ensureStaffMemberOption,
  injectStaffMemberOptions,
} from '@shared/utilities/staff-member-filter-options';

import {
  StaffMemberLocationAssignmentFormModel,
  staffMemberLocationAssignmentSchema,
} from './staff-member-location-assignment-form.schema';

const emptyModel: StaffMemberLocationAssignmentFormModel = {
  staffMemberId: null,
  campusId: null,
  isPrimary: false,
  isAttendanceAllowed: true,
  effectiveFrom: null,
  effectiveTo: null,
  isActive: true,
};

/** One page big enough to hold every lookup row — these feed a dropdown, not a grid. */
const LOOKUP_PAGE_SIZE = 500;

@Component({
  selector: 'app-staff-member-location-assignment-form',
  imports: [FormActionBar, FormDate, FormSelect, FormSwitch],
  templateUrl: './staff-member-location-assignment-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffMemberLocationAssignmentForm {
  readonly #staffMemberLocationAssignmentApi = inject(StaffMemberLocationAssignmentApi);
  readonly #campusApi = inject(CampusApi);
  readonly #commonService = inject(Common);
  readonly #dialogConfig = inject(DynamicDialogConfig);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #destroyRef = inject(DestroyRef);

  readonly #assignment = this.#dialogConfig.data?.assignment as
    | StaffMemberLocationAssignmentRow
    | undefined;
  /**
   * `StaffMember/get-all` scopes its list to the signed-in staffMember, so it may not carry whoever this
   * assignment actually belongs to. Falls back to their code when the name wasn't sent down either.
   */
  readonly #knownStaffMember: StaffMemberFilterOption | null = this.#assignment
    ? {
        staffMemberId: this.#assignment.staffMemberId,
        fullName:
          this.#assignment.staffMemberName ||
          this.#assignment.staffMemberCode ||
          this.#assignment.staffMemberId,
      }
    : null;

  protected readonly isEditMode = !!this.#assignment;
  protected readonly isSaving = signal(false);
  /** Flipped by the first submit attempt, so every outstanding error surfaces at once. */
  protected readonly submitted = signal(false);

  /** Add pre-selects whichever staffMember the page is filtered to. */
  protected readonly model = signal<StaffMemberLocationAssignmentFormModel>(
    this.#assignment
      ? this.#toModel(this.#assignment)
      : { ...emptyModel, staffMemberId: (this.#dialogConfig.data?.staffMemberId as string) || null },
  );

  readonly #staffMemberOptions = injectStaffMemberOptions();
  protected readonly staffMembers = {
    options: computed(() =>
      ensureStaffMemberOption(this.#staffMemberOptions.options(), this.#knownStaffMember),
    ),
    isLoading: this.#staffMemberOptions.isLoading,
  };

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, staffMemberLocationAssignmentSchema);

    // An assignment stays with its staffMember; edit changes everything else.
    disabled(p.staffMemberId, { when: () => this.isEditMode || this.staffMembers.isLoading() });
  });

  readonly #locationsResource = rxResource({
    stream: () =>
      this.#campusApi
        .getCampuses({ IsActive: true, PageSize: LOOKUP_PAGE_SIZE })
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

  /** Edit reads the record fresh, so the dialog never saves over a change made since the list loaded. */
  readonly #assignmentResource = rxResource({
    params: () => (this.#assignment ? { id: this.#assignment.id } : undefined),
    stream: ({ params }) =>
      this.#staffMemberLocationAssignmentApi.getStaffMemberLocationAssignment(params.id).pipe(
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

  protected readonly isLoadingAssignment = computed(() => this.#assignmentResource.isLoading());

  protected readonly locations = computed(() => this.#locationsResource.value() ?? []);
  protected readonly isLoadingLocations = computed(() => this.#locationsResource.isLoading());

  /**
   * Add waits on the staffMember list too: its field is disabled while loading, and a disabled field
   * skips validation, so a submit then would pass `invalid()` with an empty id. Edit locks the
   * staffMember anyway, so it never waits.
   */
  protected readonly isBusy = computed(
    () =>
      this.isSaving() ||
      this.isLoadingAssignment() ||
      (!this.isEditMode && this.staffMembers.isLoading()),
  );

  #toModel(assignment: StaffMemberLocationAssignmentRow): StaffMemberLocationAssignmentFormModel {
    const toDate = (value: string | null | undefined) => (value ? new Date(value) : null);

    return {
      staffMemberId: assignment.staffMemberId || null,
      campusId: assignment.campusId ?? null,
      isPrimary: assignment.isPrimary ?? false,
      isAttendanceAllowed: assignment.isAttendanceAllowed ?? false,
      effectiveFrom: toDate(assignment.effectiveFrom),
      effectiveTo: toDate(assignment.effectiveTo),
      isActive: assignment.isActive ?? true,
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

      const request$: Observable<AttendanceConfigMutationRes> = this.#assignment
        ? this.#staffMemberLocationAssignmentApi.updateStaffMemberLocationAssignment({
            ...body,
            id: this.#assignment.id,
          })
        : this.#staffMemberLocationAssignmentApi.addStaffMemberLocationAssignment(body);

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

  #buildRequest(value: StaffMemberLocationAssignmentFormModel): CreateStaffMemberLocationAssignmentReq {
    return {
      // The schema has already ruled out null; the fallbacks only narrow the type.
      staffMemberId: value.staffMemberId ?? '',
      campusId: value.campusId ?? 0,
      isPrimary: value.isPrimary,
      isAttendanceAllowed: value.isAttendanceAllowed,
      effectiveFrom: value.effectiveFrom ? localDateKey(value.effectiveFrom) : '',
      effectiveTo: value.effectiveTo ? localDateKey(value.effectiveTo) : null,
      isActive: value.isActive,
    };
  }

  onCancel(): void {
    this.#dialogRef.close();
  }
}
