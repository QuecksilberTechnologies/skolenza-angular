import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';

import { TableLoader } from '@shared/components/table-loader/table-loader';
import { ChartSeries } from '@shared/interfaces';

import { LearningDashboardStore } from '../store/learning-dashboard.store';
import { LdCertificateCard } from '../ui/ld-certificate-card';
import { LdChartCard } from '../ui/ld-chart-card';
import { LdCourseCard } from '../ui/ld-course-card';
import { LdKpiCard } from '../ui/ld-kpi-card';
import { LdProgressBar } from '../ui/ld-progress-bar';

const PALETTE = ['#f97316', '#3b82f6', '#10b981', '#a855f7', '#f43f5e', '#eab308'];

@Component({
  selector: 'app-ld-dashboard',
  imports: [
    RouterLink,
    DatePipe,
    ButtonModule,
    TableLoader,
    LdKpiCard,
    LdChartCard,
    LdCourseCard,
    LdCertificateCard,
    LdProgressBar,
  ],
  providers: [LearningDashboardStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.isLoading()) {
      <app-table-loader />
    } @else if (store.kpis(); as k) {
      <!-- KPI cards -->
      <section
        class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
        aria-label="Learning summary"
      >
        <app-ld-kpi-card
          label="Total Courses"
          [value]="k.totalCourses"
          icon="pi pi-objects-column"
          link="../catalog"
        />
        <app-ld-kpi-card
          label="In Progress"
          [value]="k.inProgress"
          icon="pi pi-spinner"
          accent="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300"
          link="../my-learning"
        />
        <app-ld-kpi-card
          label="Completed"
          [value]="k.completed"
          icon="pi pi-check-circle"
          accent="bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300"
          link="../my-learning"
        />
        <app-ld-kpi-card
          label="Assigned"
          [value]="k.assigned"
          icon="pi pi-inbox"
          accent="bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300"
          link="../assigned"
        />
        <app-ld-kpi-card
          label="Certificates"
          [value]="k.certificates"
          icon="pi pi-verified"
          accent="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300"
          link="../certificates"
        />
        <app-ld-kpi-card
          label="Pending Quiz"
          [value]="k.pendingAssessments"
          icon="pi pi-question-circle"
          accent="bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300"
          link="../assessments"
        />
      </section>

      <!-- Charts -->
      <section class="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3" aria-label="Learning analytics">
        <app-ld-chart-card
          title="Monthly Enrollments"
          subtitle="Last 6 months"
          type="bar"
          [data]="barData()"
          [options]="barOptions"
        />
        <app-ld-chart-card
          title="Completion Rate"
          subtitle="Across enrolled courses"
          type="doughnut"
          [data]="completionData()"
          [options]="doughnutOptions"
          [centerValue]="completionPercent()"
          centerLabel="Completed"
        />
        <app-ld-chart-card
          title="Skill Distribution"
          subtitle="Courses by category"
          type="doughnut"
          [data]="skillData()"
          [options]="doughnutOptions"
          [centerValue]="totalSkillCourses()"
          centerLabel="Courses"
        />
      </section>

      <div class="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <!-- Continue learning -->
        <section class="xl:col-span-2" aria-label="Continue learning">
          <div class="mb-3 flex items-center justify-between gap-3">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-zinc-100">
              Continue Learning
            </h2>
            <a
              routerLink="../my-learning"
              class="rounded text-xs font-medium text-primary-600 transition hover:text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-primary-300"
            >
              View all
            </a>
          </div>
          <div
            class="flex flex-col gap-1 rounded-xl border-0 bg-white p-2 shadow dark:border-zinc-800 dark:bg-zinc-900"
          >
            @for (item of store.continueLearning(); track item.id) {
              <div
                class="flex items-center gap-3 rounded-lg p-2 transition duration-200 hover:bg-gray-50 dark:hover:bg-zinc-800/60"
              >
                <img
                  [src]="item.thumbnail"
                  [alt]="item.title + ' thumbnail'"
                  width="80"
                  height="48"
                  loading="lazy"
                  class="h-12 w-20 shrink-0 rounded-lg object-cover"
                />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-gray-900 dark:text-zinc-100">
                    {{ item.title }}
                  </p>
                  <app-ld-progress-bar [value]="item.progress" [label]="item.title + ' progress'" />
                </div>
                <p-button
                  label="Resume"
                  icon="pi pi-play"
                  size="small"
                  [text]="true"
                  [routerLink]="['../catalog', item.courseId]"
                  [attr.aria-label]="'Resume ' + item.title"
                />
              </div>
            } @empty {
              <div class="flex flex-col items-center gap-2 py-8 text-center">
                <i
                  class="pi pi-book text-2xl text-gray-300 dark:text-zinc-600"
                  aria-hidden="true"
                ></i>
                <p class="text-sm text-gray-400 dark:text-zinc-500">Nothing in progress.</p>
              </div>
            }
          </div>
        </section>

        <!-- Upcoming deadlines -->
        <section aria-label="Upcoming deadlines">
          <div class="mb-3 flex items-center justify-between gap-3">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-zinc-100">
              Upcoming Deadlines
            </h2>
            <a
              routerLink="../calendar"
              class="rounded text-xs font-medium text-primary-600 transition hover:text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-primary-300"
            >
              View all
            </a>
          </div>
          <ul
            class="flex flex-col divide-y divide-gray-100 rounded-xl border-0 bg-white shadow dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900"
          >
            @for (d of store.upcomingDeadlines(); track d.id) {
              <li
                class="flex items-center gap-3 p-3 transition duration-200 hover:bg-gray-50 dark:hover:bg-zinc-800/60"
              >
                <span
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300"
                >
                  <i class="pi pi-calendar text-sm" aria-hidden="true"></i>
                </span>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-gray-900 dark:text-zinc-100">
                    {{ d.title }}
                  </p>
                  <p class="text-xs text-gray-400 dark:text-zinc-500">{{ d.type }}</p>
                </div>
                <span
                  class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-gray-600 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {{ d.dueDate | date: 'MMM d' }}
                </span>
              </li>
            } @empty {
              <li class="flex flex-col items-center gap-2 py-8 text-center">
                <i
                  class="pi pi-calendar-times text-2xl text-gray-300 dark:text-zinc-600"
                  aria-hidden="true"
                ></i>
                <p class="text-sm text-gray-400 dark:text-zinc-500">No deadlines.</p>
              </li>
            }
          </ul>
        </section>
      </div>

      <!-- Recommended -->
      <section class="mt-6" aria-label="Recommended courses">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-zinc-100">
            Recommended For You
          </h2>
          <a
            routerLink="../catalog"
            class="rounded text-xs font-medium text-primary-600 transition hover:text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-primary-300"
          >
            View all
          </a>
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          @for (course of store.recommended(); track course.id) {
            <app-ld-course-card [course]="course" />
          }
        </div>
      </section>

      <!-- Recent certificates -->
      <section class="mt-6 pb-6" aria-label="Recent certificates">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-zinc-100">
            Recent Certificates
          </h2>
          <a
            routerLink="../certificates"
            class="rounded text-xs font-medium text-primary-600 transition hover:text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-primary-300"
          >
            View all
          </a>
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (cert of store.recentCertificates(); track cert.id) {
            <app-ld-certificate-card [certificate]="cert" />
          }
        </div>
      </section>
    }
  `,
})
export default class LdDashboard {
  protected readonly store = inject(LearningDashboardStore);

  protected readonly barData = computed(() => {
    const s = this.store.dashboard()?.monthlyEnrollments;
    return {
      labels: s?.labels ?? [],
      datasets: [
        {
          label: 'Enrollments',
          data: s?.values ?? [],
          backgroundColor: PALETTE[0],
          borderRadius: 6,
        },
      ],
    };
  });

  protected readonly completionData = computed(() =>
    this.doughnut(this.store.dashboard()?.completionRate),
  );
  protected readonly skillData = computed(() =>
    this.doughnut(this.store.dashboard()?.skillDistribution),
  );

  /** Completed share of enrolled courses, for the doughnut centre. */
  protected readonly completionPercent = computed(() => {
    const s = this.store.dashboard()?.completionRate;
    if (!s) return null;
    const total = s.values.reduce((a, b) => a + b, 0);
    if (!total) return null;
    const completedIdx = s.labels.findIndex((l) => l.toLowerCase() === 'completed');
    const completed = completedIdx >= 0 ? s.values[completedIdx] : s.values[0];
    return `${Math.round((completed / total) * 100)}%`;
  });

  /** Total courses across skill categories, for the doughnut centre. */
  protected readonly totalSkillCourses = computed(() => {
    const s = this.store.dashboard()?.skillDistribution;
    if (!s) return null;
    const total = s.values.reduce((a, b) => a + b, 0);
    return total || null;
  });

  protected readonly barOptions = {
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    maintainAspectRatio: false,
  };
  protected readonly doughnutOptions = {
    plugins: { legend: { position: 'bottom' } },
    cutout: '60%',
    maintainAspectRatio: false,
  };

  private doughnut(series: ChartSeries | undefined) {
    return {
      labels: series?.labels ?? [],
      datasets: [{ data: series?.values ?? [], backgroundColor: PALETTE }],
    };
  }
}
