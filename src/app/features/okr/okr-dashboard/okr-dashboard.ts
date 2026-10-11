import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { Common } from '@core/services';
import { AuthStore } from '@core/stores';
import { IOkrFilter, OkrStatus, SettledSearchTerm } from '@shared/interfaces';

import { OkrStore } from '../okr.store';
import { OkrAverageProgress } from '../ui/okr-average-progress';
import { OkrChartCard } from '../ui/okr-chart-card';
import { OkrFilterBar } from '../ui/okr-filter-bar';
import { OkrKpiCards, OkrKpi } from '../ui/okr-kpi-cards';

interface Kpi {
  key: string;
  label: string;
  value: () => number;
  icon: string;
  link?: string;
}

@Component({
  selector: 'app-okr-dashboard',
  imports: [OkrFilterBar, OkrKpiCards, OkrAverageProgress, OkrChartCard],
  providers: [OkrStore],
  templateUrl: './okr-dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class OkrDashboard implements OnInit {
  readonly store = inject(OkrStore);
  readonly #router = inject(Router);
  readonly #commonService = inject(Common);
  readonly #authStore = inject(AuthStore);

  /** Admin (1) or Manager (3) may access Team/Create routes; StaffMember (2) cannot. */
  protected readonly canManage = computed(() => {
    const role = this.#authStore.roleTypeId();
    return role === 1 || role === 3;
  });

  readonly kpis: Kpi[] = [
    {
      key: 'active',
      label: 'Active OKRs',
      value: () => this.store.stats().active,
      icon: 'pi pi-bolt',
      link: '/app/okr/my',
    },
    {
      key: 'completed',
      label: 'Completed',
      value: () => this.store.stats().completed,
      icon: 'pi pi-check-circle',
    },
    {
      key: 'onTrack',
      label: 'On Track',
      value: () => this.store.stats().onTrack,
      icon: 'pi pi-arrow-up-right',
    },
    {
      key: 'atRisk',
      label: 'At Risk',
      value: () => this.store.stats().atRisk,
      icon: 'pi pi-exclamation-triangle',
    },
    {
      key: 'overdue',
      label: 'Overdue',
      value: () => this.store.stats().overdue,
      icon: 'pi pi-clock',
    },
  ];

  /** Resolves each KPI's store-backed value fn to a plain number for the dumb card grid. */
  readonly resolvedKpis = computed<OkrKpi[]>(() =>
    this.kpis.map(({ value, ...rest }) => ({ ...rest, value: value() })),
  );

  readonly quarterOptions = ['Q1-2026', 'Q2-2026', 'Q3-2026', 'Q4-2026'].map((q) => ({
    label: q,
    value: q,
  }));
  readonly departmentOptions = [
    { label: 'Engineering', value: 'dep-eng' },
    { label: 'Sales', value: 'dep-sales' },
    { label: 'Marketing', value: 'dep-mkt' },
    { label: 'Human Resources', value: 'dep-hr' },
    { label: 'Product', value: 'dep-prod' },
    { label: 'Finance', value: 'dep-fin' },
  ];

  /** Average objective progress across the loaded set. */
  readonly avgProgress = computed(() => {
    const list = this.store.okrs();
    if (!list.length) return 0;
    return Math.round(list.reduce((s, o) => s + o.progress, 0) / list.length);
  });

  /**
   * Reads an Optimus preset color token (e.g. `--p-primary-500`) at runtime so charts
   * follow the active brand palette instead of hardcoded hex. SSR-guarded.
   */
  #brandColor(token: string, fallback: string): string {
    if (typeof document === 'undefined') return fallback;
    const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
    return value || fallback;
  }

  readonly statusChartData = computed(() => {
    const list = this.store.okrs();
    const order: OkrStatus[] = ['Draft', 'Active', 'OnTrack', 'Behind', 'Completed', 'Archived'];
    const counts = order.map((s) => list.filter((o) => o.status === s).length);
    // Semantic palette — status carries meaning, so keep stone/primary/emerald/amber.
    const primary = this.#brandColor('--p-primary-500', '#f59e0b');
    return {
      labels: ['Draft', 'Active', 'On Track', 'Behind', 'Completed', 'Archived'],
      datasets: [
        {
          data: counts,
          backgroundColor: ['#d6d3d1', primary, '#22c55e', '#fbbf24', '#10b981', '#78716c'],
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    };
  });

  readonly chartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { usePointStyle: true, pointStyle: 'circle', padding: 14, boxWidth: 8 },
      },
    },
    cutout: '64%',
  };

  /** Average objective progress grouped by department. */
  readonly departmentChartData = computed(() => {
    const list = this.store.okrs();
    const groups = new Map<string, { sum: number; count: number }>();
    for (const okr of list) {
      const g = groups.get(okr.department) ?? { sum: 0, count: 0 };
      g.sum += okr.progress;
      g.count += 1;
      groups.set(okr.department, g);
    }
    const labels = [...groups.keys()];
    return {
      labels,
      datasets: [
        {
          label: 'Avg progress %',
          data: labels.map((d) => Math.round(groups.get(d)!.sum / groups.get(d)!.count)),
          backgroundColor: this.#brandColor('--p-primary-500', '#f59e0b'),
          hoverBackgroundColor: this.#brandColor('--p-primary-400', '#fbbf24'),
          borderRadius: 6,
          maxBarThickness: 40,
        },
      ],
    };
  });

  readonly barChartOptions = {
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { displayColors: false } },
    scales: {
      x: { grid: { display: false }, border: { display: false } },
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { stepSize: 25, callback: (v: number) => `${v}%` },
        border: { display: false },
        grid: { color: 'rgba(120,113,108,0.12)' },
      },
    },
  };

  ngOnInit(): void {
    // 'team' scope returns the full dataset in the mock layer — ideal for an overview.
    this.store.setScope('team');
    this.store.loadOkrs({ first: 0, rows: 100 });
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'OKR Dashboard',
      pageDescription: 'Track objectives, progress and risk at a glance',
      pageIcon: 'pi pi-chart-bar',
      isBreadcrumbShow: false,
    });
  }

  onSearch(term: SettledSearchTerm): void {
    this.store.setSearchTerm(term);
  }

  onFilterChange(patch: Partial<IOkrFilter>): void {
    this.store.updateAppliedFilters({ ...this.store.appliedFilters(), ...patch });
  }

  go(link?: string): void {
    if (link) this.#router.navigateByUrl(link);
  }
}
