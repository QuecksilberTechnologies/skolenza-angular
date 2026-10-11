import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { type FieldTree, form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';
import { TableModule } from '@openng/optimus-ui/table';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';

import { Common } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { ToggleField } from '@shared/components/toggle-field/toggle-field';
import { StaffMemberCodePattern, StaffMemberCodePatternPreviewRow } from '@shared/interfaces';
import { showFieldError } from '@shared/utilities/field-error';

import {
  CODE_SEPARATORS,
  StaffMemberCodePatternModel,
  staffMemberCodePatternSchema,
  RUNNING_NUMBER_LENGTHS,
} from './staff-member-code-configuration.schema';
import { StaffMemberCodeConfigurationStore } from './staff-member-code-configuration.store';

/** A bare `_` is nearly invisible in a closed select, so each separator is named. */
const SEPARATOR_LABELS: Record<(typeof CODE_SEPARATORS)[number], string> = {
  '-': '- hyphen',
  _: '_ underscore',
  '/': '/ slash',
};

const DEFAULT_PATTERN: StaffMemberCodePatternModel = {
  prefix: 'EMP',
  separator: '-',
  runningNumberLength: '4',
  includeYear: true,
  includeMonth: false,
  includeDepartment: false,
};

/**
 * The institution's staff-member-code pattern.
 *
 * Every change is preview-then-apply, because changing the pattern **recodes every existing
 * staffMember, the Admin included**. The preview is the only place that consequence is visible, so
 * Apply stays disabled until the backend says `canCommit`, and editing the form after a preview
 * throws that preview away rather than letting Apply commit something the user has not seen.
 */
@Component({
  selector: 'app-staff-member-code-configuration',
  imports: [
    DatePipe,
    FormField,
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    SkeletonModule,
    TableModule,
    ToggleSwitchModule,
    ToggleField,
  ],
  providers: [ConfirmationService, StaffMemberCodeConfigurationStore],
  templateUrl: './staff-member-code-configuration.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffMemberCodeConfiguration {
  readonly #commonService = inject(Common);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #confirmationService = inject(ConfirmationService);

  readonly store = inject(StaffMemberCodeConfigurationStore);

  protected readonly moduleCode = 'INSTITUTION_STAFF_CODE';
  protected readonly separators = CODE_SEPARATORS.map((value) => ({
    value,
    label: SEPARATOR_LABELS[value],
  }));
  protected readonly runningNumberLengths = RUNNING_NUMBER_LENGTHS.map((value) => ({
    value,
    label: `${value} digits`,
  }));

  protected readonly submitted = signal(false);

  /** Narrows a long preview to the rows that actually change. */
  protected readonly changedOnly = signal(false);

  /** Worth offering only when the preview mixes changed and unchanged rows. */
  protected readonly canFilterChanged = computed(
    () => this.store.changedCount() > 0 && this.store.changedCount() < this.store.rows().length,
  );

  protected readonly visibleRows = computed(() =>
    this.changedOnly() && this.canFilterChanged()
      ? this.store.rows().filter((row) => !this.isUnchanged(row))
      : this.store.rows(),
  );

  /** More rows than this and the preview paginates instead of running the page long. */
  protected readonly previewPageSize = 25;

  /** Focus lands here when a preview arrives, since it renders below the fold. */
  private readonly previewHeading = viewChild<ElementRef<HTMLElement>>('previewHeading');

  /** Creating the first pattern is an `Add`; changing one is an `Update`. */
  protected readonly canSave = computed(() =>
    this.#featurePageStore.canPerform(
      this.moduleCode,
      this.store.hasExistingPattern() ? 'Update' : 'Add',
    ),
  );

  protected readonly model = signal<StaffMemberCodePatternModel>({ ...DEFAULT_PATTERN });

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, staffMemberCodePatternSchema);
  });

  /** A live sample, so the shape of the code is visible before anyone previews it. */
  protected readonly sampleCode = computed(() => {
    const { prefix, separator, runningNumberLength, includeYear, includeMonth, includeDepartment } =
      this.model();
    const parts = [prefix || 'EMP'];
    if (includeYear) parts.push('2026');
    if (includeMonth) parts.push('SEP');
    if (includeDepartment) parts.push('12');
    parts.push('1'.padStart(Number(runningNumberLength) || 4, '0'));
    return parts.join(separator || '-');
  });

  constructor() {
    this.#commonService.setPageHeaderInfo({
      pageTitle:
        this.#featurePageStore.displayNameOf(this.moduleCode) ?? 'StaffMember Code Configuration',
      pageDescription: 'The pattern new staffMember codes are generated from.',
      pageIcon: 'pi pi-hashtag',
      isBreadcrumbShow: false,
    });

    this.#commonService.getLoginInfo().then((loginInfo) => {
      this.store.setInstitutionId(loginInfo?.user?.institutionId ?? null);
      this.store.loadExistingPattern();
    });

    // Seed the form from the pattern in place, once it arrives.
    effect(() => {
      const existing = this.store.existingPattern();
      if (existing) {
        // The read returns the length as a number where the select's options are strings, and a
        // value matching no option leaves the select blank. Fall back to the default rather than
        // showing an empty required field.
        const length = String(existing.runningNumberLength ?? '');
        this.model.set({
          ...existing,
          runningNumberLength: RUNNING_NUMBER_LENGTHS.some((option) => option === length)
            ? length
            : DEFAULT_PATTERN.runningNumberLength,
        } as StaffMemberCodePatternModel);
      }
    });

    // The preview renders under the form with nothing to announce it, so move focus to it. The
    // heading only exists while a preview does, so this fires once per preview taken.
    effect(() => {
      this.previewHeading()?.nativeElement.focus();
    });

    // Any edit invalidates the preview it was taken for: the two must never disagree.
    //
    // `clearPreview` reads the preview signals to decide whether it has anything to do, so it has
    // to run untracked - tracked, this effect would depend on them, re-run the moment a preview
    // arrived, and wipe the preview it had just been given.
    effect(() => {
      this.model();
      untracked(() => this.store.clearPreview());
    });
  }

  /** Nothing to review on a row whose code stays put. */
  /** Dimmed only when it sets the row apart: if every row is unchanged, none should stand out. */
  protected isDimmed(row: StaffMemberCodePatternPreviewRow): boolean {
    return this.store.changedCount() > 0 && this.isUnchanged(row);
  }

  protected setChangedOnly(event: Event): void {
    this.changedOnly.set((event.target as HTMLInputElement).checked);
  }

  protected isUnchanged(row: StaffMemberCodePatternPreviewRow): boolean {
    return row.currentCode === row.proposedCode;
  }

  protected showError<T>(field: FieldTree<T>): boolean {
    return showFieldError(field, this.submitted());
  }

  protected onPreview(): void {
    this.submitted.set(true);
    this.f().markAsTouched();

    if (this.f().invalid()) {
      return;
    }

    this.store.preview(this.model() as StaffMemberCodePattern);
  }

  /** Recoding is not reversible except by applying another pattern, so it asks first. */
  protected onApply(): void {
    if (!this.store.canCommit() || this.store.isNoOp() || this.store.isApplying()) return;

    const changed = this.store.changedCount();
    const total = this.store.rows().length;

    this.#confirmationService.confirm({
      header: 'Apply new code pattern',
      message:
        changed === 0
          ? `No staffMember code changes, but the new pattern is saved for future staffMembers. Apply it?`
          : `This recodes ${changed} of ${total} staffMembers, including the Admin. Codes can only be changed back by applying another pattern.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes, recode staffMembers',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.apply(() => this.submitted.set(false)),
    });
  }
}

