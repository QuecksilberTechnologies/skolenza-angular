import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { disabled, form, submit, validate, validateStandardSchema } from '@angular/forms/signals';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { finalize } from 'rxjs';

import { Common, StaffAcademicStructureApi } from '@core/services';
import {
  FormCheckbox,
  FormDate,
  FormNumber,
  FormSelect,
  FormText,
  FormTextarea,
} from '@shared/components';
import { AcademicMaster, AcademicMasterType, SaveAcademicMaster } from '@shared/interfaces';
import { fromDateKey, localDateKey, toDateKey } from '@shared/utilities/date-key';
import { buildDependencyOptions } from '@shared/utilities/dependency-options';

import { AcademicMasterFormModel, academicMasterSchema } from './academic-master-dialog.schema';

export interface AcademicMasterDialogData {
  type: AcademicMasterType;
  master?: AcademicMaster;
  sessions: AcademicMaster[];
  programmes: AcademicMaster[];
  groups: AcademicMaster[];
  subjects: AcademicMaster[];
}

const fromApiDate = (value?: string): Date | null => (value ? fromDateKey(toDateKey(value)) : null);
const orUndefined = <T>(value: T | null): T | undefined => value ?? undefined;

/** Example values shown as input placeholders, per master type. */
const PLACEHOLDERS: Record<
  AcademicMasterType,
  { code: string; name: string; description: string }
> = {
  [AcademicMasterType.Session]: {
    code: 'e.g. AY-2026-27',
    name: 'e.g. Academic Year 2026-27',
    description: 'Describe the period this session covers',
  },
  [AcademicMasterType.Programme]: {
    code: 'e.g. PRIMARY',
    name: 'e.g. Primary School',
    description: 'Describe the grades this programme covers',
  },
  [AcademicMasterType.Group]: {
    code: 'e.g. GRADE-01',
    name: 'e.g. Grade 1',
    description: 'Describe this learning group',
  },
  [AcademicMasterType.Section]: {
    code: 'e.g. GRADE-01-A',
    name: 'e.g. Grade 1 - Section A',
    description: 'Describe this section',
  },
  [AcademicMasterType.Subject]: {
    code: 'e.g. MATH',
    name: 'e.g. Mathematics',
    description: 'Describe what this subject covers',
  },
  [AcademicMasterType.CourseOffering]: {
    code: 'e.g. MATH-GRADE-01',
    name: 'e.g. Mathematics - Grade 1',
    description: 'Describe this course offering',
  },
};

/** Add or edit any academic master type. Closes with `true` after a successful save. */
@Component({
  selector: 'app-academic-master-dialog',
  imports: [ButtonModule, FormCheckbox, FormDate, FormNumber, FormSelect, FormText, FormTextarea],
  templateUrl: './academic-master-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcademicMasterDialog {
  readonly #api = inject(StaffAcademicStructureApi);
  readonly #common = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  protected readonly data: AcademicMasterDialogData = inject(DynamicDialogConfig).data;
  readonly #master = this.data.master;

  protected readonly types = AcademicMasterType;
  protected readonly type = this.data.type;
  protected readonly placeholders = PLACEHOLDERS[this.type];
  protected readonly isSaving = signal(false);
  /** Flipped by the first submit attempt, so every outstanding error surfaces at once. */
  protected readonly submitted = signal(false);

  protected readonly model = signal<AcademicMasterFormModel>({
    code: this.#master?.code ?? '',
    name: this.#master?.name ?? '',
    description: this.#master?.description ?? '',
    isActive: this.#master?.isActive ?? true,
    startDate: fromApiDate(this.#master?.startDate),
    endDate: fromApiDate(this.#master?.endDate),
    level: this.#master?.level ?? '',
    academicSessionId: this.#master?.academicSessionId ?? null,
    academicProgrammeId: this.#master?.academicProgrammeId ?? null,
    academicGroupId: this.#master?.academicGroupId ?? null,
    capacity: this.#master?.capacity ?? null,
    subjectId: this.#master?.subjectId ?? null,
    curriculumVersion: this.#master?.curriculumVersion ?? '',
  });

  // Active records, plus the saved one if it has since been deactivated (shown, locked).
  protected readonly sessionOptions = buildDependencyOptions(
    this.data.sessions,
    new Set(this.#master?.academicSessionId ? [this.#master?.academicSessionId] : []),
  );
  protected readonly programmeOptions = buildDependencyOptions(
    this.data.programmes,
    new Set(this.#master?.academicProgrammeId ? [this.#master?.academicProgrammeId] : []),
  );
  protected readonly groupOptions = buildDependencyOptions(
    this.data.groups,
    new Set(this.#master?.academicGroupId ? [this.#master?.academicGroupId] : []),
  );
  protected readonly subjectOptions = buildDependencyOptions(
    this.data.subjects,
    new Set(this.#master?.subjectId ? [this.#master?.subjectId] : []),
  );

  /** A course offering's group must belong to its session. */
  protected readonly offeringGroups = computed(() => {
    const sessionId = this.model().academicSessionId;
    return sessionId
      ? this.groupOptions.filter((item) => item.academicSessionId === sessionId)
      : [];
  });

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, academicMasterSchema);

    if (this.type === AcademicMasterType.Session) {
      validate(p.startDate, ({ value }) =>
        value() ? undefined : { kind: 'required', message: 'Start date is required' },
      );
      validate(p.endDate, ({ value, valueOf }) => {
        const end = value();
        const start = valueOf(p.startDate);
        if (!end) return { kind: 'required', message: 'End date is required' };
        return start && end < start
          ? { kind: 'dateOrder', message: 'End date must be on or after the start date' }
          : undefined;
      });
    }

    if (this.type === AcademicMasterType.CourseOffering) {
      disabled(p.academicGroupId, {
        when: ({ valueOf }) => valueOf(p.academicSessionId) === null,
      });
      // Changing the session can strand a group from the previous one.
      validate(p.academicGroupId, ({ value }) => {
        const id = value();
        return id !== null && !this.offeringGroups().some((group) => group.id === id)
          ? { kind: 'groupSession', message: 'Choose a group from the selected session' }
          : undefined;
      });
    }
  });

  protected save(): void {
    this.submitted.set(true);
    this.f().markAsTouched();
    if (this.f().invalid()) return;

    submit(this.f, async () => {
      this.isSaving.set(true);
      this.#api
        .saveMaster(this.type, this.#buildRequest(this.model()))
        .pipe(
          finalize(() => this.isSaving.set(false)),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: (response) => {
            this.#common.showMessage(response.message, response.isSucceeded ? 'success' : 'error');
            if (response.isSucceeded) this.#dialogRef.close(true);
          },
          error: (error) => this.#common.showMessage(error.message, 'error'),
        });
    });
  }

  protected cancel(): void {
    this.#dialogRef.close();
  }

  /**
   * An edit starts from the saved record so fields this dialog does not show survive. A create
   * carries no `id` key at all: the API reads a zero or present id as an update.
   */
  #buildRequest(value: AcademicMasterFormModel): SaveAcademicMaster {
    return {
      ...(this.#master ?? { type: 1 }),
      code: value.code.trim(),
      name: value.name.trim(),
      description: value.description.trim(),
      isActive: value.isActive,
      startDate: value.startDate ? localDateKey(value.startDate) : undefined,
      endDate: value.endDate ? localDateKey(value.endDate) : undefined,
      level: value.level.trim() || undefined,
      academicSessionId: orUndefined(value.academicSessionId),
      academicProgrammeId: orUndefined(value.academicProgrammeId),
      academicGroupId: orUndefined(value.academicGroupId),
      capacity: orUndefined(value.capacity),
      subjectId: orUndefined(value.subjectId),
      curriculumVersion: value.curriculumVersion.trim() || undefined,
    };
  }
}
