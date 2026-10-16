import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardModule } from '@openng/optimus-ui/card';

import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { DashboardMetric, DashboardMetricCollection, DashboardSection } from '@shared/interfaces';

import { DashboardCardHeader } from '../dashboard-card-header/dashboard-card-header';

const NEUTRAL = 'text-zinc-500 dark:text-zinc-400';
const SUCCESS = 'text-green-700 dark:text-green-400';
const WARNING = 'text-amber-700 dark:text-amber-400';
const ERROR = 'text-red-700 dark:text-red-400';

/**
 * Icon + icon colour per metric code: semantic only where the metric is a state, neutral for
 * plain counts. Unknown codes fall back to a neutral chart icon.
 */
const METRIC_ICONS: Record<string, string> = {
  TEAM_MEMBERS: `pi pi-users ${NEUTRAL}`,
  PRESENT_TODAY: `pi pi-check-circle ${SUCCESS}`,
  PRESENT: `pi pi-check-circle ${SUCCESS}`,
  ABSENT: `pi pi-times-circle ${ERROR}`,
  ON_LEAVE: `pi pi-calendar ${NEUTRAL}`,
  ON_NOTICE: `pi pi-sign-out ${WARNING}`,
  PENDING_APPROVALS: `pi pi-clock ${WARNING}`,
};
const FALLBACK_ICON = `pi pi-chart-bar ${NEUTRAL}`;

/** A role dashboard's label/value tiles (`DashboardMetricCollection`). */
@Component({
  selector: 'app-metrics-card',
  imports: [CardModule, DashboardCardHeader, NgTemplateOutlet, RouterLink, TableEmptyMessage],
  template: `
    <p-card
      class="h-full shadow-sm dark:border dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none"
    >
      <ng-template #header>
        <app-dashboard-card-header
          [title]="title()"
          [placeholder]="placeholderBadge() && (section()?.isPlaceholder ?? false)"
          [loading]="loading()"
          [refreshable]="refreshable()"
          (refresh)="refresh.emit()"
        />
      </ng-template>
      <ng-template #content>
        <div class="grid gap-3" [class]="gridClass()" [attr.aria-busy]="loading()">
          @if (loading() && !metrics().length) {
            <!-- same box and line heights as a loaded tile, so nothing moves when data lands -->
            @for (row of skeletonRows(); track row) {
              <div
                class="flex flex-col gap-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
                [class]="tileSpanClass()"
                aria-hidden="true"
              >
                <p class="m-0 text-sm">
                  <span
                    class="inline-block w-24 animate-pulse rounded-sm bg-zinc-100 motion-reduce:animate-none dark:bg-zinc-800"
                  >
                    &nbsp;
                  </span>
                </p>
                <p class="m-0 text-2xl font-semibold">
                  <span
                    class="inline-block w-10 animate-pulse rounded-sm bg-zinc-100 motion-reduce:animate-none dark:bg-zinc-800"
                  >
                    &nbsp;
                  </span>
                </p>
              </div>
            }
          } @else {
            @for (metric of metrics(); track metric.code ?? metric.label) {
              @if (link(metric); as route) {
                <a
                  class="group relative flex flex-col gap-2 rounded-md border border-zinc-200 p-3 no-underline transition-colors duration-200 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 dark:border-zinc-800 dark:hover:bg-zinc-700"
                  [class]="tileSpanClass()"
                  [routerLink]="route"
                >
                  <ng-container
                    [ngTemplateOutlet]="tileBody"
                    [ngTemplateOutletContext]="{ $implicit: metric }"
                  />
                  <i
                    class="pi pi-arrow-right absolute top-3 right-3 text-xs text-zinc-500 dark:text-zinc-400"
                    aria-hidden="true"
                  ></i>
                  <span class="sr-only">, open</span>
                </a>
              } @else {
                <div
                  class="flex flex-col gap-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
                  [class]="tileSpanClass()"
                >
                  <ng-container
                    [ngTemplateOutlet]="tileBody"
                    [ngTemplateOutletContext]="{ $implicit: metric }"
                  />
                </div>
              }
            } @empty {
              <div class="col-span-full">
                <app-table-empty-message icon="pi pi-chart-bar" message="No data yet" />
              </div>
            }
          }
        </div>
        <ng-template #tileBody let-metric>
          <p class="m-0 flex min-w-0 items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <i [class]="icon(metric)" aria-hidden="true"></i>
            <span class="truncate">{{ metric.label }}</span>
          </p>
          <p class="m-0 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {{ format(metric) }}
          </p>
        </ng-template>
      </ng-template>
    </p-card>
  `,
  // the static title="..." the parent writes would otherwise render as a native tooltip
  host: { '[attr.title]': 'null' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricsCard {
  readonly title = input<string>();
  readonly section = input<DashboardSection<DashboardMetricCollection> | null>(null);
  readonly loading = input(false);
  readonly refreshable = input(true);
  /** Off when the page already says once that every section is sample data. */
  readonly placeholderBadge = input(true);
  /** Tiles per row from `md` up; below that always two. */
  readonly columns = input<2 | 3>(2);
  /** Route per metric code; a linked tile becomes a link to that page. */
  readonly links = input<Partial<Record<string, string>>>({});
  readonly refresh = output<void>();

  /** Placeholder tiles shown while loading; match the usual loaded count to avoid a jump. */
  readonly skeletonCount = input(4);
  protected readonly skeletonRows = computed(() =>
    Array.from({ length: this.skeletonCount() }, (_, i) => i),
  );
  protected readonly metrics = computed(() => this.section()?.data?.metrics ?? []);

  protected readonly gridClass = computed(() =>
    this.columns() === 3 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2',
  );
  /** A lone last tile fills its row - only in the two-column layout. */
  protected readonly tileSpanClass = computed(() =>
    this.columns() === 3 ? 'last:odd:col-span-2 md:last:odd:col-span-1' : 'last:odd:col-span-2',
  );

  protected icon({ code }: DashboardMetric): string {
    return METRIC_ICONS[code ?? ''] ?? FALLBACK_ICON;
  }

  protected link({ code }: DashboardMetric): string | undefined {
    return this.links()[code ?? ''];
  }

  protected format({ value, unit }: DashboardMetric): string {
    if (!unit) return `${value}`;
    return unit === '%' ? `${value}%` : `${value} ${unit}`;
  }
}
