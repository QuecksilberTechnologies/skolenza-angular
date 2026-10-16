import { formatDate } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardModule } from '@openng/optimus-ui/card';

import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { AvatarColor } from '@shared/directives/avatar-color';
import { DashboardSection, DashboardWidgetItem } from '@shared/interfaces';

import { DashboardCardHeader } from '../dashboard-card-header/dashboard-card-header';
import { RowStatus, RowStatusChip } from '../row-status/row-status';

/** Chip per backend status code; unknown codes get a neutral one. */
const STATUS_TAGS: Record<string, RowStatusChip> = {
  APPROVED: { severity: 'success', icon: 'pi pi-check-circle' },
  ACTIVE: { severity: 'success', icon: 'pi pi-check-circle' },
  PENDING: { severity: 'warn', icon: 'pi pi-clock' },
  NOTICE_PERIOD: { severity: 'warn', icon: 'pi pi-sign-out' },
  REJECTED: { severity: 'danger', icon: 'pi pi-ban' },
};
const NEUTRAL_TAG: RowStatusChip = { severity: 'secondary', icon: 'pi pi-circle' };

/** A role dashboard's list of title/subtitle rows (`DashboardWidgetItem`). */
@Component({
  selector: 'app-widget-list-card',
  imports: [AvatarColor, CardModule, DashboardCardHeader, RouterLink, RowStatus, TableEmptyMessage],
  template: `
    <p-card
      class="h-full shadow-sm dark:border dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none"
      [pt]="cardPt"
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
        <ul
          class="m-0 max-h-96 list-none divide-y divide-zinc-100 overflow-y-auto p-0 dark:divide-zinc-800"
          [attr.aria-busy]="loading()"
        >
          @if (loading() && !items().length) {
            @for (row of skeletonRows(); track row) {
              <!-- same line heights as a loaded title/subtitle row, so nothing moves when data lands -->
              <li class="flex items-center gap-3 py-3" aria-hidden="true">
                @if (showAvatar()) {
                  <span
                    class="size-9 shrink-0 animate-pulse rounded-full bg-zinc-100 motion-reduce:animate-none dark:bg-zinc-800"
                  ></span>
                }
                <div class="flex min-w-0 flex-1 flex-col gap-1">
                  <p class="m-0 text-base">
                    <span
                      class="inline-block w-32 animate-pulse rounded-sm bg-zinc-100 motion-reduce:animate-none dark:bg-zinc-800"
                    >
                      &nbsp;
                    </span>
                  </p>
                  <p class="m-0 text-sm">
                    <span
                      class="inline-block w-20 animate-pulse rounded-sm bg-zinc-100 motion-reduce:animate-none dark:bg-zinc-800"
                    >
                      &nbsp;
                    </span>
                  </p>
                </div>
              </li>
            }
          } @else {
            @for (item of items(); track item.code ?? $index) {
              <li class="flex items-center justify-between gap-4 py-3">
                <div class="flex min-w-0 items-center gap-3">
                  @if (showAvatar()) {
                    <span
                      class="flex size-9 shrink-0 items-center justify-center rounded-full text-base font-semibold"
                      [appAvatarColor]="item.title ?? ''"
                      aria-hidden="true"
                    ></span>
                  }
                  <div class="flex min-w-0 flex-col gap-1">
                    <p class="m-0 truncate text-base font-medium text-zinc-900 dark:text-zinc-50">
                      {{ item.title }}
                    </p>
                    @if (item.subtitle) {
                      <p class="m-0 truncate text-sm text-zinc-500 dark:text-zinc-400">
                        {{ item.subtitle }}
                      </p>
                    }
                  </div>
                </div>
                <div class="flex shrink-0 flex-col items-end gap-1 text-sm">
                  @if (item.status; as status) {
                    <app-row-status [text]="statusLabel(status)" [chip]="statusTag(status)" />
                  } @else if (relativeDate() && item.date && daysUntil(item.date) !== null) {
                    <app-row-status [text]="relativeLabel(daysUntil(item.date)!)" />
                  }
                  @if (item.date) {
                    <span class="text-zinc-500 dark:text-zinc-400">
                      {{ formatDate(item.date) }}
                    </span>
                  }
                </div>
              </li>
            } @empty {
              <li>
                <app-table-empty-message
                  [icon]="icon()"
                  [message]="emptyMessage()"
                  [subMessage]="emptySubMessage()"
                />
              </li>
            }
          }
        </ul>
        @if (viewAllLink(); as route) {
          <div class="mt-auto flex justify-end border-t border-zinc-200 pt-3 dark:border-zinc-800">
            <a
              class="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-primary-700 no-underline transition-colors duration-200 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 dark:text-primary-200"
              [routerLink]="route"
            >
              View all
              <span class="sr-only">{{ title() }}</span>
              <i class="pi pi-arrow-right text-xs" aria-hidden="true"></i>
            </a>
          </div>
        }
      </ng-template>
    </p-card>
  `,
  // the static title="..." the parent writes would otherwise render as a native tooltip
  host: { '[attr.title]': 'null' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WidgetListCard {
  readonly title = input<string>();
  readonly section = input<DashboardSection<DashboardWidgetItem[] | null> | null>(null);
  readonly emptyMessage = input('Nothing to show');
  /** The next step under the empty message: what will appear here, and when. */
  readonly emptySubMessage = input<string>();
  readonly icon = input('pi pi-inbox');
  /** Show an initials avatar of `title` - only for rows that name a person. */
  readonly showAvatar = input(false);
  /** For rows with no status: show "In N days" for a single upcoming date. */
  readonly relativeDate = input(false);
  readonly loading = input(false);
  readonly refreshable = input(true);
  /** Off when the page already says once that every section is sample data. */
  readonly placeholderBadge = input(true);
  /** Route of the full list behind this card; omit when there is none or no permission. */
  readonly viewAllLink = input<string | null>(null);
  readonly refresh = output<void>();

  /** Placeholder rows shown while loading; match the usual loaded count to avoid a jump. */
  readonly skeletonCount = input(3);
  protected readonly skeletonRows = computed(() =>
    Array.from({ length: this.skeletonCount() }, (_, i) => i),
  );
  protected readonly items = computed(() => this.section()?.data ?? []);
  /** Body and content stretch to the card's full height, so the "View all" footer sits at the bottom. */
  protected readonly cardPt = {
    body: { class: 'flex-1' },
    content: { class: 'flex flex-1 flex-col gap-2' },
  };

  /** `NOTICE_PERIOD` -> `Notice period`. */
  protected statusLabel(status: string): string {
    const text = status.replaceAll('_', ' ').toLowerCase();
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  protected statusTag(status: string): RowStatusChip {
    return STATUS_TAGS[status.toUpperCase()] ?? NEUTRAL_TAG;
  }

  /** Whole days from today to a single `yyyy-MM-dd` date; null for ranges, bad or past dates. */
  protected daysUntil(value: string): number | null {
    const day = new Date(`${value}T00:00:00`);
    if (value.includes('/') || Number.isNaN(day.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.round((day.getTime() - today.getTime()) / 86_400_000);
    return days >= 0 ? days : null;
  }

  protected relativeLabel(days: number): string {
    if (days === 0) return 'Today';
    return days === 1 ? 'Tomorrow' : `In ${days} days`;
  }

  /**
   * Backend sends `yyyy-MM-dd`, or a `start/end` range of two such dates. A range drops the
   * month and year it shares with its end: `12–13 Oct 2026`, `28 Oct – 3 Nov 2026`.
   */
  protected formatDate(value: string): string {
    const [start, end] = value.split('/');
    const full = this.formatDay(start, 'd MMM y');
    if (full === null) return value;
    if (end === undefined || end === start) return full;

    const last = this.formatDay(end, 'd MMM y');
    if (last === null) return value;
    if (start.slice(0, 4) !== end.slice(0, 4)) return `${full} – ${last}`;
    if (start.slice(0, 7) !== end.slice(0, 7)) return `${this.formatDay(start, 'd MMM')} – ${last}`;
    return `${this.formatDay(start, 'd')}–${last}`;
  }

  private formatDay(day: string, format: string): string | null {
    try {
      return formatDate(day, format, 'en-US');
    } catch {
      return null;
    }
  }
}
