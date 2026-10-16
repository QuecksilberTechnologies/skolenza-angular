import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';

import { Common } from '@core/services';
import { CurrentUserPermissionsStore } from '@core/stores';
import { NoticePeriodCard } from '@shared/components/dashboad/notice-period-card/notice-period-card';
import { StatCard } from '@shared/components/dashboad/stat-card/stat-card';
import { WidgetListCard } from '@shared/components/dashboad/widget-list-card/widget-list-card';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { DashboardMetric } from '@shared/interfaces';

import { DashboardGreeting } from '../dashboard-greeting/dashboard-greeting';
import { ManagerDashboardStore } from './manager-dashboard.store';

/** A page a tile or card links to, behind the same module key as the route's own guard. */
interface PageLink {
  route: string;
  moduleKey: string;
}

const STAFF_MEMBERS: PageLink = { route: '/staffMembers', moduleKey: 'StaffMembers' };
const LEAVE_HISTORY: PageLink = { route: '/leave/history', moduleKey: 'Leaves' };
const LEAVE_INBOX: PageLink = { route: '/leave/inbox', moduleKey: 'Leaves' };

interface OverviewMetric {
  icon: string;
  link?: PageLink;
  /** Red number when above zero: the figure a manager has to act on. */
  alertWhenAboveZero?: boolean;
  hidden?: boolean;
}

/** Everything the overview row knows per metric code; unknown codes get a plain chart tile. */
const OVERVIEW_METRICS: Record<string, OverviewMetric> = {
  TEAM_MEMBERS: { icon: 'pi pi-users', link: STAFF_MEMBERS },
  PRESENT_TODAY: { icon: 'pi pi-check-circle' },
  PRESENT: { icon: 'pi pi-check-circle' },
  // no team attendance page yet, so unlinked
  ABSENT: { icon: 'pi pi-times-circle', alertWhenAboveZero: true },
  ON_LEAVE: { icon: 'pi pi-calendar', link: LEAVE_HISTORY },
  // the Team Members On Notice card already names everyone in it
  ON_NOTICE: { icon: 'pi pi-sign-out', hidden: true },
  PENDING_APPROVALS: { icon: 'pi pi-clock', link: LEAVE_INBOX },
};
const FALLBACK_METRIC: OverviewMetric = { icon: 'pi pi-chart-bar' };

/** Tiles in the usual overview; the skeleton matches it so nothing jumps when data lands. */
const USUAL_TILE_COUNT = 5;

/**
 * Column spans that fill the last row instead of leaving a gap: two columns from `sm`, three
 * (on a six-track grid) from `lg`, one row from `2xl`.
 */
function tileSpanClass(index: number, count: number): string {
  const isLast = index === count - 1;
  const classes = ['lg:max-2xl:col-span-2'];
  if (count % 2 === 1 && isLast) classes.push('sm:max-lg:col-span-2');
  if (count % 3 === 1 && isLast) classes.push('lg:max-2xl:col-span-6');
  if (count % 3 === 2 && index >= count - 2) classes.push('lg:max-2xl:col-span-3');
  return classes.join(' ');
}

@Component({
  selector: 'app-dashboard-manager',
  imports: [
    ButtonModule,
    DashboardGreeting,
    NoticePeriodCard,
    StatCard,
    TableEmptyMessage,
    WidgetListCard,
  ],
  templateUrl: './dashboard-manager.html',
  providers: [ManagerDashboardStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DashboardManager {
  readonly #permissions = inject(CurrentUserPermissionsStore);
  protected readonly store = inject(ManagerDashboardStore);

  protected readonly staffMembersLink = computed(() => this.#allowed(STAFF_MEMBERS));
  protected readonly leaveHistoryLink = computed(() => this.#allowed(LEAVE_HISTORY));

  protected readonly overviewTiles = computed(() => {
    const metrics = (this.store.teamOverview()?.data?.metrics ?? []).filter(
      (metric) => !this.#config(metric).hidden,
    );
    return metrics.map((metric, index) => {
      const config = this.#config(metric);
      return {
        key: metric.code ?? metric.label ?? `${index}`,
        icon: config.icon,
        value: this.#format(metric),
        label: metric.label,
        tone:
          config.alertWhenAboveZero && metric.value > 0
            ? ('danger' as const)
            : ('default' as const),
        link: config.link ? this.#allowed(config.link) : null,
        spanClass: tileSpanClass(index, metrics.length),
      };
    });
  });
  protected readonly skeletonSpans = Array.from({ length: USUAL_TILE_COUNT }, (_, i) =>
    tileSpanClass(i, USUAL_TILE_COUNT),
  );

  constructor() {
    inject(Common).setPageHeaderInfo({
      pageTitle: 'Dashboard',
      pageDescription: 'Overview of your team, attendance, and leave.',
      pageIcon: 'pi pi-microsoft',
    });
  }

  /** Same check as the route's own guard, so a link never lands on access-denied. */
  #allowed({ route, moduleKey }: PageLink): string | null {
    return this.#permissions.canAccessOrUnknown(moduleKey) ? route : null;
  }

  #config({ code }: DashboardMetric): OverviewMetric {
    return OVERVIEW_METRICS[code ?? ''] ?? FALLBACK_METRIC;
  }

  #format({ value, unit }: DashboardMetric): string {
    if (!unit) return `${value}`;
    return unit === '%' ? `${value}%` : `${value} ${unit}`;
  }
}
