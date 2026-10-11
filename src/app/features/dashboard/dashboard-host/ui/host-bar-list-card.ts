import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';

import { HostBarGroup } from '../dashboard-host.store';
import { HostCardShell } from './host-card-shell';

/** Labelled horizontal bars. Serves the institution status split. */
@Component({
  selector: 'app-host-bar-list-card',
  imports: [HostCardShell, TableEmptyMessage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
  template: `
    <app-host-card-shell [cardTitle]="cardTitle()" [subtitle]="subtitle()">
      @if (loading()) {
        <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden" aria-hidden="true">
          @for (row of [0, 1, 2, 3]; track row) {
            <div class="flex flex-col gap-2">
              <div
                class="h-3 w-1/3 animate-pulse rounded bg-gray-200 motion-reduce:animate-none dark:bg-zinc-700"
              ></div>
              <div
                class="h-2 w-full animate-pulse rounded-full bg-gray-100 motion-reduce:animate-none dark:bg-zinc-800"
              ></div>
            </div>
          }
        </div>
      } @else if (isEmpty()) {
        <div class="flex min-h-0 flex-1 items-center justify-center">
          <app-table-empty-message icon="pi pi-chart-bar" [message]="emptyMessage()" />
        </div>
      } @else {
        <div class="flex min-h-0 flex-1 flex-col justify-center-safe gap-6 overflow-y-auto">
          @for (group of groups(); track group.heading ?? $index) {
            <div class="flex flex-col gap-3">
              @if (group.heading) {
                <h3
                  class="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-zinc-400"
                >
                  {{ group.heading }}
                </h3>
              }
              @for (item of group.items; track item.key) {
                <div class="flex flex-col gap-2">
                  <div class="flex items-center justify-between gap-2 text-sm">
                    <span class="flex min-w-0 items-center gap-2 text-gray-700 dark:text-zinc-200">
                      <span class="truncate">{{ item.label }}</span>
                    </span>
                    <span
                      class="shrink-0 font-medium text-gray-900 tabular-nums dark:text-zinc-100"
                    >
                      {{ item.value }}
                      <span class="text-xs font-normal text-gray-500 dark:text-zinc-400">
                        ({{ item.share }}%)
                      </span>
                    </span>
                  </div>
                  <div
                    class="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800"
                    role="progressbar"
                    [attr.aria-label]="item.label"
                    [attr.aria-valuenow]="item.value"
                    aria-valuemin="0"
                    [attr.aria-valuemax]="group.max"
                    [attr.aria-valuetext]="item.value + ' of ' + group.max"
                  >
                    <div
                      class="h-full rounded-full bg-primary-500 transition-all duration-500 motion-reduce:transition-none dark:bg-primary-400"
                      [style.width.%]="item.percent"
                    ></div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }
    </app-host-card-shell>
  `,
})
export class HostBarListCard {
  readonly cardTitle = input.required<string>();
  readonly subtitle = input('');
  readonly groups = input.required<HostBarGroup[]>();
  readonly loading = input(false);
  readonly emptyMessage = input('Nothing to show yet');

  protected readonly isEmpty = computed(() =>
    this.groups().every((group) => group.items.length === 0),
  );
}
