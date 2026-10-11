import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { finalize } from 'rxjs';

import { Common, StaffMembersApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';

/**
 * One editable profile section. `moduleCode` is the leaf `my-menu` publishes it under, which is
 * what resolves the `moduleId` the request carries.
 */
interface StaffMemberSection {
  moduleCode: string;
  label: string;
  hint: string;
}

/**
 * The five sections `POST /Staff/section-defaults` covers, per its swagger summary. Each is its
 * own leaf in the permission tree, and the id of that leaf is the only thing that tells the
 * endpoint which section a call is about.
 */
const SECTIONS: readonly StaffMemberSection[] = [
  {
    moduleCode: 'STAFF_CAMPUS_ASSIGNMENTS',
    label: 'Work locations',
    hint: 'Which sites an staffMember is assigned to',
  },
  { moduleCode: 'STAFF_DEVICE_ENROLMENTS', label: 'Devices', hint: 'Attendance device enrollments' },
  {
    moduleCode: 'STAFF_WORK_ARRANGEMENTS',
    label: 'Work arrangement',
    hint: 'On-site, hybrid or remote',
  },
  { moduleCode: 'STAFF_WORK_PATTERNS', label: 'Work pattern', hint: 'Weekly working days and hours' },
  { moduleCode: 'STAFF_WORK_MODE_OVERRIDES', label: 'Overrides', hint: 'One-off exceptions to the pattern' },
];

/**
 * Institution-wide defaults for whether staffMembers may edit their own profile sections.
 *
 * Distinct from the per-staffMember unlock on the profile itself, which goes through
 * `/Staff/update-edit-status` with a `tabInfoType`. This endpoint carries no staffMember id: it
 * sets the default for everyone.
 *
 * The API is write-only - nothing publishes the current defaults - so each switch starts off and
 * reports what it just sent rather than claiming to show stored state.
 */
@Component({
  selector: 'app-staff-member-editing',
  imports: [FormsModule, ToggleSwitchModule],
  templateUrl: './staff-member-editing.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffMemberEditing {
  readonly #staffMembersApi = inject(StaffMembersApi);
  readonly #commonService = inject(Common);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #destroyRef = inject(DestroyRef);

  protected readonly sections = SECTIONS;

  /** What each switch is showing. Not read from the server - see the class docblock. */
  protected readonly values = signal<Record<string, boolean>>({});
  protected readonly savingCode = signal<string | null>(null);

  protected isOn(moduleCode: string): boolean {
    return this.values()[moduleCode] === true;
  }

  /**
   * Hard gate, not `canPerformOrUnknown`: an unpublished module answers "unknown" as allowed, and
   * the call would then go out with no `moduleId` - the one field that says which section it is
   * about - so it would either 400 or land on the wrong section.
   */
  protected canEdit(moduleCode: string): boolean {
    return this.#featurePageStore.canPerform(moduleCode, 'Allow Editing');
  }

  /**
   * Why a switch is locked, or `null` when it is usable. Devices and Overrides publish no
   * `Allow Editing` operation at all, so no role can ever use them - that is "Not available", not a
   * missing grant.
   */
  protected unavailableReason(moduleCode: string): string | null {
    if (this.canEdit(moduleCode)) return null;
    const { OperationId } = this.#featurePageStore.moduleOperationIds(moduleCode, 'Allow Editing');
    return OperationId === undefined ? 'Not available' : 'No access';
  }

  protected onToggle(section: StaffMemberSection, isEditAllowed: boolean): void {
    if (this.savingCode()) return;

    const { ModuleId, OperationId } = this.#featurePageStore.moduleOperationIds(
      section.moduleCode,
      'Allow Editing',
    );

    // Belt and braces behind `canEdit`: without a module id the request cannot name its section.
    if (ModuleId === undefined || OperationId === undefined) {
      this.#commonService.showMessage(
        `This session has no permission entry for ${section.label}, so the default cannot be changed.`,
        'error',
      );
      return;
    }

    this.savingCode.set(section.moduleCode);
    // Optimistic: the switch has already moved, and a failure puts it back.
    this.values.update((values) => ({ ...values, [section.moduleCode]: isEditAllowed }));

    this.#staffMembersApi
      .setStaffMemberSectionDefaults({ moduleId: ModuleId, operationId: OperationId, isEditAllowed })
      .pipe(
        finalize(() => this.savingCode.set(null)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (!res.isSucceeded) {
            this.values.update((values) => ({ ...values, [section.moduleCode]: !isEditAllowed }));
          }
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
        },
        error: (err) => {
          this.values.update((values) => ({ ...values, [section.moduleCode]: !isEditAllowed }));
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }
}


