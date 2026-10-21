import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CardModule } from '@openng/optimus-ui/card';

import { Common } from '@core/services';

@Component({
  selector: 'app-leave-staff-member-policy-map',
  imports: [CardModule],
  templateUrl: './leave-staff-member-policy-map.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LeaveStaffMemberPolicyMap {
  readonly #commonService = inject(Common);

  constructor() {
    this.setPageHeaderInfo();
  }

  setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Leave - Staff Member Policy Mapping',
      pageDescription: 'Manage leave policy mappings for staff members',
      pageIcon: 'pi pi-plus',
      isBreadcrumbShow: true,
    });

    this.#commonService.setBreadcrumbItems([
      { label: 'Policies', routerLink: '/app/policies' },
      {
        label: 'Leave - Staff Member Policy Mapping',
        routerLink: '/app/policies/leave-staff-member-policy-mapping',
      },
    ]);
  }
}
