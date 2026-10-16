import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { ListboxModule } from '@openng/optimus-ui/listbox';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';

import { StatusBadge } from '@shared/components/status-badge/status-badge';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableFilterSelect } from '@shared/components/table/table-filter-select/table-filter-select';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';

import { StaffMemberPolicyMapDialogStore } from './staffMember-policy-map-dialog.store';

/** Maps staffMembers to one Published version. Candidates come from the version's Applicability, so
 *  an excluded staffMember never reaches the list. */
@Component({
  selector: 'app-staffMember-policy-map-dialog',
  imports: [
    DatePipe,
    FormsModule,
    ButtonModule,
    ListboxModule,
    SkeletonModule,
    StatusBadge,
    TableEmptyMessage,
    TableFilterSelect,
    TableSearchInput,
  ],
  providers: [StaffMemberPolicyMapDialogStore],
  templateUrl: './staffMember-policy-map-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-0 flex-1 flex-col' },
})
export class StaffMemberPolicyMapDialog {
  readonly #dialogRef = inject(DynamicDialogRef);
  protected readonly store = inject(StaffMemberPolicyMapDialogStore);

  protected save() {
    this.store.assign(() => this.#dialogRef.close());
  }

  protected onCancel() {
    this.#dialogRef.close();
  }
}
