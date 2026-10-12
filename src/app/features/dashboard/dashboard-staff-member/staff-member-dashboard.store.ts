import { computed } from '@angular/core';
import { signalStore, withComputed } from '@ngrx/signals';

import { withRoleDashboard } from '../with-role-dashboard';

/** The staffMember page's cards that carry their own refresh. */
type WorkforceSection =
  | 'my-profile'
  | 'my-attendance'
  | 'my-leave'
  | 'my-tasks'
  | 'my-documents'
  | 'announcements';

/** The Staff Member's own figures, read from the single `STAFF_MEMBER` dashboard call. */
export const StaffMemberDashboardStore = signalStore(
  withRoleDashboard<WorkforceSection>('STAFF_MEMBER'),
  withComputed((store) => {
    const workforce = computed(() => store.dashboard()?.staffMember ?? null);

    return {
      myProfile: computed(() => workforce()?.myProfile ?? null),
      myAttendance: computed(() => workforce()?.myAttendance ?? null),
      myLeave: computed(() => workforce()?.myLeave ?? null),
      myTasks: computed(() => workforce()?.myTasks ?? null),
      myDocuments: computed(() => workforce()?.myDocuments ?? null),
      announcements: computed(() => workforce()?.announcements ?? null),
    };
  }),
);
