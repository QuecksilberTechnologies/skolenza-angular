import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CardModule } from '@openng/optimus-ui/card';

import { Common } from '@core/services';

@Component({
  selector: 'app-leave-staffMember-policy-map',
  imports: [CardModule],
  templateUrl: './leave-staffMember-policy-map.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LeaveStaffMemberPolicyMap {
  readonly #commonService = inject(Common);

  constructor() {
    this.setPageHeaderInfo();
  }

  setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Leave - StaffMember Policy Mapping',
      pageDescription: 'Manage leave-staffMember policy mappings',
      pageIcon: 'pi pi-plus',
      isBreadcrumbShow: true,
    });

    this.#commonService.setBreadcrumbItems([
      { label: 'Policies', routerLink: '/app/policies' },
      {
        label: 'Leave - StaffMember Policy Mapping',
        routerLink: '/app/policies/leave-staffMember-policy-mapping',
      },
    ]);
  }
}
