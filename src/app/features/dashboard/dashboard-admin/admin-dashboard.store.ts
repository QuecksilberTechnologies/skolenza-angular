import { computed } from '@angular/core';
import { signalStore, withComputed } from '@ngrx/signals';

import { DashboardSection, DashboardWidgetItem } from '@shared/interfaces';

import { withRoleDashboard } from '../with-role-dashboard';

/** The admin page's widgets that show their own loading state. */
type AdminSection =
  | 'summary'
  | 'staffMember-overview'
  | 'currently-on-leave'
  | 'staffMembers-on-notice'
  | 'recently-exited'
  | 'upcoming-birthdays'
  | 'storage-status'
  | 'hiring-pipeline'
  | 'department-headcount'
  | 'recent-onboarding';

/**
 * The Admin dashboard's widgets, all read from the single `INSTITUTION_ADMIN` dashboard call. The
 * Locations card keeps its own store (`locations-card.store.ts`) because it ships with its own
 * refresh and permission logic.
 */
export const AdminDashboardStore = signalStore(
  withRoleDashboard<AdminSection>('INSTITUTION_ADMIN'),
  withComputed((store) => {
    const admin = computed(() => store.dashboard()?.institutionAdministrator ?? null);

    return {
      summary: computed(() => admin()?.summary?.data ?? null),
      staffMemberOverview: computed(() => admin()?.staffMemberOverview?.data ?? null),
      birthdays: computed(() => admin()?.upcomingBirthdays?.data ?? null),
      onboarding: computed(() => admin()?.recentOnboarding?.data ?? null),
      departmentHeadcount: computed(() => admin()?.departmentHeadcount?.data ?? null),
      currentlyOnLeave: computed(() => admin()?.currentlyOnLeave?.data ?? null),
      staffMembersOnNotice: computed(() => admin()?.staffMembersOnNotice?.data ?? null),
      /** Exits reshaped into the generic list rows, so they render through `WidgetListCard`. */
      exitedStaffMembers: computed<DashboardSection<DashboardWidgetItem[]> | null>(() => {
        const exited = admin()?.exitedStaffMembers;
        if (!exited) return null;

        return {
          ...exited,
          data: (exited.data ?? []).map((staffMember) => ({
            code: staffMember.staffMemberId,
            title: staffMember.staffMemberName,
            subtitle: [staffMember.positionName, staffMember.departmentName]
              .filter(Boolean)
              .join(' · '),
            status: null,
            date: staffMember.dateOfExit.slice(0, 10),
          })),
        };
      }),
      storage: computed(() => admin()?.storageStatus?.data ?? null),
      storagePlaceholder: computed(() => admin()?.storageStatus?.isPlaceholder ?? false),
      hiringPipeline: computed(() => admin()?.hiringPipeline?.data ?? null),
      hiringPipelinePlaceholder: computed(() => admin()?.hiringPipeline?.isPlaceholder ?? false),
    };
  }),
);
