import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { FeaturePageStore } from '@core/stores';
import { ProfileListItem } from '@shared/components/profile/profile-list-item/profile-list-item';
import { ProfileList } from '@shared/components/profile/profile-list/profile-list';
import { ProfileLoader } from '@shared/components/profile/profile-loader/profile-loader';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableFilterSelect } from '@shared/components/table/table-filter-select/table-filter-select';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';

import { ASSIGNMENTS_MODULE_CODE } from '../../../institution-policies/institution-policy-constants';
import { StaffMemberPolicyMapDialogData, PublishedPolicy } from './staff-member-policy-info.model';
import { StaffMemberPolicyInfoStore } from './staff-member-policy-info.store';
import { StaffMemberPolicyMapDialog } from './staff-member-policy-map-dialog/staff-member-policy-map-dialog';

@Component({
  selector: 'app-staff-member-policy-info',
  imports: [
    DatePipe,
    ButtonModule,
    CardModule,
    TooltipModule,
    ProfileList,
    ProfileListItem,
    ProfileLoader,
    TableEmptyMessage,
    TableFilterSelect,
    TableSearchInput,
  ],
  providers: [StaffMemberPolicyInfoStore],
  templateUrl: './staff-member-policy-info.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffMemberPolicyInfo {
  readonly #dialogService = inject(DialogService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #featurePageStore = inject(FeaturePageStore);
  protected readonly store = inject(StaffMemberPolicyInfoStore);

  protected readonly canAssign = computed(() =>
    this.#featurePageStore.canPerform(ASSIGNMENTS_MODULE_CODE, 'Assign'),
  );

  protected openMapDialog(policy: PublishedPolicy) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(StaffMemberPolicyMapDialog, {
      header: `${policy.name} - Map StaffMembers`,
      style: { width: '90vw', maxWidth: '40rem', maxHeight: '90vh' },
      contentStyle: { display: 'flex', flexDirection: 'column', overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { policy } satisfies StaffMemberPolicyMapDialogData,
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }
}
