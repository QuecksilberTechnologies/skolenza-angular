import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from '@openng/optimus-ui/button';
import { KnobModule } from '@openng/optimus-ui/knob';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { GetStaffMemberProgressColorPipe } from '@shared/pipes';

@Component({
  selector: 'app-profile-block-actions',
  imports: [KnobModule, FormsModule, ButtonModule, TooltipModule, GetStaffMemberProgressColorPipe],
  templateUrl: './profile-block-actions.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileBlockActions {
  readonly completionPercentage = input<number>();
  /** The record's "Allow staffMember to edit" flag. It locks staffMembers only. */
  readonly isEditAllowed = input<boolean>();
  /** Viewer's role type. Admins (1) and managers (3) can edit whatever the flag says. */
  readonly roleTypeId = input<number>();
  protected readonly canEdit = computed(
    () => !!this.isEditAllowed() || [1, 3].includes(this.roleTypeId() ?? -1),
  );
  /** Names the record in the icon buttons' accessible names, e.g. "Edit BlueOrbit experience". */
  readonly itemLabel = input<string>();
  /** Verb for the trash button, e.g. "Remove" when the action unlinks rather than deletes. */
  readonly removeVerb = input('Delete');
  readonly isRemove = input<boolean>(true);
  readonly isShowBtnEdit = input<boolean>(true);
  /** `add` swaps the pencil for a labelled "Add" button, for rows that have nothing saved yet. */
  readonly editMode = input<'edit' | 'add'>('edit');
  readonly isShowPercentage = input<boolean>(true);
  readonly edit = output();
  readonly remove = output();

  onEdit() {
    if (!this.canEdit()) {
      return;
    }

    this.edit.emit();
  }

  onRemove() {
    if (!this.canEdit()) {
      return;
    }

    this.remove.emit();
  }
}
