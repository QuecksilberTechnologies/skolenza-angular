import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';

import { HostCardShell } from './host-card-shell';

export interface HostListBadge {
  label: string;
  tone: 'success' | 'warn' | 'muted' | 'primary';
}

export interface HostListItem {
  key: string;
  icon: string;
  title: string;
  subtitle?: string;
  /** Right-aligned trailing text — a price, a count or a timestamp. */
  meta?: string;
  badges?: HostListBadge[];
  /** Renders the row as a link when set. */
  link?: string;
}

const TONE_CLASS: Record<HostListBadge['tone'], string> = {
  success: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  warn: 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  muted: 'bg-gray-100 text-gray-600 dark:bg-zinc-700 dark:text-zinc-300',
  primary: 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200',
};

/** Icon + title + meta list. Serves recent institutions, the plan catalog and host activity. */
@Component({
  selector: 'app-host-list-card',
  imports: [HostCardShell, RouterLink, TableEmptyMessage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
  template: `
    <app-host-card-shell [cardTitle]="cardTitle()" [subtitle]="subtitle()">
      @if (loading()) {
        <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden" aria-hidden="true">
          @for (row of [0, 1, 2, 3]; track row) {
            <div class="flex items-center gap-3 rounded-lg px-3 py-2.5">
              <div
                class="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-gray-200 motion-reduce:animate-none dark:bg-zinc-700"
              ></div>
              <div class="flex flex-1 flex-col gap-2">
                <div
                  class="h-3 w-1/2 animate-pulse rounded bg-gray-200 motion-reduce:animate-none dark:bg-zinc-700"
                ></div>
                <div
                  class="h-2.5 w-1/3 animate-pulse rounded bg-gray-100 motion-reduce:animate-none dark:bg-zinc-800"
                ></div>
              </div>
            </div>
          }
        </div>
      } @else if (!items().length) {
        <div class="flex min-h-0 flex-1 items-center justify-center">
          <app-table-empty-message icon="pi pi-inbox" [message]="emptyMessage()" />
        </div>
      } @else {
        <ul class="min-h-0 flex-1 dash-list pr-1">
          @for (item of items(); track item.key) {
            <li>
              <a
                [routerLink]="item.link ?? null"
                class="dash-list-item focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 motion-reduce:transition-none"
                [class]="item.link ? '' : 'cursor-default!'"
              >
                <span
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/30"
                >
                  <i [class]="item.icon" class="text-primary-500 dark:text-primary-200"></i>
                </span>
                <span class="flex min-w-0 flex-1 flex-col gap-1">
                  <span class="flex min-w-0 flex-wrap items-center gap-2">
                    <span class="truncate text-sm font-medium text-gray-900 dark:text-zinc-100">
                      {{ item.title }}
                    </span>
                    @for (badge of item.badges; track badge.label) {
                      <span
                        class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                        [class]="toneClass(badge.tone)"
                      >
                        {{ badge.label }}
                      </span>
                    }
                  </span>
                  @if (item.subtitle) {
                    <span class="truncate text-xs text-gray-500 dark:text-zinc-400">
                      {{ item.subtitle }}
                    </span>
                  }
                </span>
                @if (item.meta) {
                  <span
                    class="shrink-0 self-center text-sm font-medium whitespace-nowrap text-gray-900 tabular-nums dark:text-zinc-100"
                  >
                    {{ item.meta }}
                  </span>
                }
              </a>
            </li>
          }
        </ul>
      }
    </app-host-card-shell>
  `,
})
export class HostListCard {
  readonly cardTitle = input.required<string>();
  readonly subtitle = input('');
  readonly items = input.required<HostListItem[]>();
  readonly loading = input(false);
  readonly emptyMessage = input('Nothing here yet');

  protected toneClass(tone: HostListBadge['tone']): string {
    return TONE_CLASS[tone];
  }
}
