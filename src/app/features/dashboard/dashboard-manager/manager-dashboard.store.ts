import { computed } from '@angular/core';
import { signalStore, withComputed } from '@ngrx/signals';

import { DashboardMetric, DashboardMetricCollection, DashboardSection } from '@shared/interfaces';

import { withRoleDashboard } from '../with-role-dashboard';

/** Codes the two sections spell differently for the same figure. */
const SAME_METRIC: Record<string, string> = { PRESENT_TODAY: 'PRESENT' };

/** Tile order in the merged overview; codes not listed keep their order after these. */
const OVERVIEW_ORDER = ['TEAM_MEMBERS', 'PRESENT', 'ABSENT', 'ON_LEAVE', 'ON_NOTICE'];

const canonical = (code: string | null | undefined) => SAME_METRIC[code ?? ''] ?? code ?? '';

const rank = (metric: DashboardMetric) => {
  const index = OVERVIEW_ORDER.indexOf(canonical(metric.code));
  return index === -1 ? OVERVIEW_ORDER.length : index;
};

/**
 * Team Summary and Team Attendance repeat Present and On Leave, so the page shows them as one
 * overview: Summary's tiles first, then any Attendance tile Summary lacks (Absent). Sample data
 * if either section is.
 */
function mergeOverview(
  summary: DashboardSection<DashboardMetricCollection> | null,
  attendance: DashboardSection<DashboardMetricCollection> | null,
): DashboardSection<DashboardMetricCollection> | null {
  if (!summary && !attendance) return null;

  const metrics = [...(summary?.data?.metrics ?? [])];
  const seen = new Set(metrics.map((metric) => canonical(metric.code)));
  for (const metric of attendance?.data?.metrics ?? []) {
    if (!seen.has(canonical(metric.code))) metrics.push(metric);
  }
  // Array sort is stable, so codes outside OVERVIEW_ORDER keep their arrival order.
  metrics.sort((a, b) => rank(a) - rank(b));

  const base = (summary ?? attendance)!;
  return {
    ...base,
    data: { ...base.data, metrics },
    isPlaceholder: (summary?.isPlaceholder ?? false) || (attendance?.isPlaceholder ?? false),
  };
}

/** The manager page's cards that carry their own refresh. */
type ManagerSection = 'notice' | 'leave' | 'birthdays' | 'onboarding';

/** The Staff Manager dashboard, read from the single `STAFF_MANAGER` dashboard call. */
export const ManagerDashboardStore = signalStore(
  withRoleDashboard<ManagerSection>('STAFF_MANAGER'),
  withComputed((store) => {
    const manager = computed(() => store.dashboard()?.staffManager ?? null);
    const teamSummary = computed(() => manager()?.teamSummary ?? null);
    const teamAttendance = computed(() => manager()?.teamAttendance ?? null);
    const teamMembersOnNotice = computed(() => manager()?.teamMembersOnNotice ?? null);
    const teamLeave = computed(() => manager()?.teamLeave ?? null);
    const teamBirthdays = computed(() => manager()?.teamBirthdays ?? null);
    const recentTeamOnboarding = computed(() => manager()?.recentTeamOnboarding ?? null);

    return {
      teamSummary,
      teamAttendance,
      teamOverview: computed(() => mergeOverview(teamSummary(), teamAttendance())),
      teamMembersOnNotice,
      teamLeave,
      teamBirthdays,
      recentTeamOnboarding,
      /** Every section is backend sample data - say so once, not on each card. */
      allPlaceholder: computed(() => {
        const sections = [
          teamSummary(),
          teamAttendance(),
          teamMembersOnNotice(),
          teamLeave(),
          teamBirthdays(),
          recentTeamOnboarding(),
        ].filter((section) => section !== null);
        return sections.length > 0 && sections.every((section) => section.isPlaceholder);
      }),
    };
  }),
);
