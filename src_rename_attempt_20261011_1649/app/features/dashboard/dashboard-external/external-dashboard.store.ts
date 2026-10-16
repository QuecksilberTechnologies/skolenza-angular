import { computed } from '@angular/core';
import { signalStore, withComputed } from '@ngrx/signals';

import { withRoleDashboard } from '../with-role-dashboard';

/** The external page's cards that carry their own refresh. */
type ExternalSection =
  | 'client-summary'
  | 'open-tickets'
  | 'recent-activity'
  | 'client-site-staffMembers'
  | 'documents';

/** The External User dashboard, read from the single `EXTERNAL_USER` dashboard call. */
export const ExternalDashboardStore = signalStore(
  withRoleDashboard<ExternalSection>('EXTERNAL_USER'),
  withComputed((store) => {
    const external = computed(() => store.dashboard()?.externalUser ?? null);

    return {
      clientSummary: computed(() => external()?.clientSummary ?? null),
      openTickets: computed(() => external()?.openTickets ?? null),
      recentActivity: computed(() => external()?.recentActivity ?? null),
      clientSiteStaffMembers: computed(() => external()?.clientSiteStaffMembers ?? null),
      documents: computed(() => external()?.documents ?? null),
    };
  }),
);
