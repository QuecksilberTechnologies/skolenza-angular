import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';

import { PmsKpi, PmsKpiCards } from '../ui/pms-kpi-cards';
import { PmsTrendChart } from '../ui/pms-trend-chart';
import { PmsDashboardStore } from './pms-dashboard.store';

@Component({
  selector: 'app-pms-dashboard',
  imports: [PmsKpiCards, PmsTrendChart],
  providers: [PmsDashboardStore],
  templateUrl: './pms-dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PmsDashboard implements OnInit {
  readonly store = inject(PmsDashboardStore);
  readonly #platformId = inject(PLATFORM_ID);

  /** Resolve the live brand colour for canvas charts (cannot use CSS vars). */
  #brand(): string {
    if (!isPlatformBrowser(this.#platformId)) return '#f97316';
    return (
      getComputedStyle(document.documentElement).getPropertyValue('--p-primary-color').trim() ||
      '#f97316'
    );
  }

  /** Low-alpha version of the brand colour for area fills. */
  #brandFill(color: string): string {
    const hex = color.replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r},${g},${b},0.15)`;
    }
    if (color.startsWith('rgb(')) return color.replace('rgb(', 'rgba(').replace(')', ',0.15)');
    return 'rgba(249,115,22,0.15)';
  }

  readonly kpiCards = computed<PmsKpi[]>(() => {
    const k = this.store.kpis();
    return [
      {
        key: 'goals',
        label: 'Active Goals',
        value: k?.activeGoals ?? 0,
        icon: 'pi pi-flag',
        link: '../goals',
      },
      {
        key: 'pending',
        label: 'Pending Reviews',
        value: k?.pendingReviews ?? 0,
        icon: 'pi pi-clock',
        link: '../reviews',
      },
      {
        key: 'completed',
        label: 'Completed Reviews',
        value: k?.completedReviews ?? 0,
        icon: 'pi pi-check-circle',
        link: '../reviews',
      },
      {
        key: 'feedback',
        label: 'Feedback Received',
        value: k?.feedbackReceived ?? 0,
        icon: 'pi pi-comments',
        link: '../feedback',
      },
      {
        key: 'rating',
        label: 'Average Rating',
        value: k?.averageRating?.toFixed(1) ?? '0.0',
        icon: 'pi pi-star',
        link: '../history',
      },
    ];
  });

  readonly goalChartData = computed(() => {
    const s = this.store.goalProgress();
    return {
      labels: s?.labels ?? [],
      datasets: [
        {
          label: 'Progress %',
          data: s?.values ?? [],
          backgroundColor: this.#brand(),
          borderRadius: 6,
          minBarLength: 2,
        },
      ],
    };
  });

  readonly ratingChartData = computed(() => {
    const s = this.store.ratingTrendSeries();
    const brand = this.#brand();
    return {
      labels: s?.labels ?? [],
      datasets: [
        {
          label: 'Avg Rating',
          data: s?.values ?? [],
          borderColor: brand,
          backgroundColor: this.#brandFill(brand),
          fill: true,
          tension: 0.4,
        },
      ],
    };
  });

  readonly barOptions = {
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, max: 100 } },
  };

  readonly lineOptions = {
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, max: 5 } },
  };

  ngOnInit(): void {
    this.store.loadDashboard();
  }
}
