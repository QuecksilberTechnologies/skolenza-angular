import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ChartModule } from '@openng/optimus-ui/chart';

import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';

import { HostCardShell } from './host-card-shell';

/** One slice, mirrored as a legend row. `color` is the slice colour, so the two cannot drift. */
export interface HostDonutLegendItem {
  key: string;
  label: string;
  value: number;
  /** Share of the widget total, rendered next to the count. */
  share: number;
  color: string;
  /** ISO-2 country code; renders a flag when the lookup resolved. */
  code?: string;
}

/**
 * Doughnut card for the host dashboard. The canvas is hidden from assistive tech — a bare
 * canvas fails WCAG 1.1.1 — and the visible legend below it carries the same numbers as text,
 * which also supplies the relief the light-mode palette needs for its sub-3:1 slices.
 *
 * The legend is a *fixed* `h-36`, not a cap: its height must not depend on how many countries
 * come back, or the card — and with it the whole grid row — resizes when data lands.
 */
@Component({
  selector: 'app-host-donut-card',
  imports: [ChartModule, HostCardShell, TableEmptyMessage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
  template: `
    <app-host-card-shell [cardTitle]="cardTitle()" [subtitle]="subtitle()">
      @if (loading()) {
        <div class="flex min-h-0 flex-1 flex-col" aria-hidden="true">
          <div class="flex min-h-0 flex-1 items-center justify-center">
            <div
              class="aspect-square h-full animate-pulse rounded-full bg-gray-100 motion-reduce:animate-none dark:bg-zinc-800"
            ></div>
          </div>
          <div class="mt-4 flex h-36 shrink-0 flex-col gap-2 overflow-hidden">
            @for (row of [0, 1, 2, 3, 4]; track row) {
              <div
                class="h-3 w-2/3 animate-pulse rounded bg-gray-200 motion-reduce:animate-none dark:bg-zinc-700"
              ></div>
            }
          </div>
        </div>
      } @else if (!hasData()) {
        <div class="flex min-h-0 flex-1 items-center justify-center">
          <app-table-empty-message icon="pi pi-chart-pie" [message]="emptyMessage()" />
        </div>
      } @else {
        <div class="relative min-h-0 flex-1" aria-hidden="true">
          @defer (on viewport) {
            <p-chart
              type="doughnut"
              [data]="data()"
              [options]="options()"
              class="block h-full w-full"
            />
          } @placeholder {
            <div class="flex h-full items-center justify-center">
              <div
                class="aspect-square h-full animate-pulse rounded-full bg-gray-100 motion-reduce:animate-none dark:bg-zinc-800"
              ></div>
            </div>
          }

          <div
            class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          >
            <span class="text-2xl font-bold text-gray-900 tabular-nums dark:text-zinc-100">
              {{ centerValue() }}
            </span>
            @if (centerLabel()) {
              <span class="text-xs font-medium text-gray-500 dark:text-zinc-400">
                {{ centerLabel() }}
              </span>
            }
          </div>
        </div>

        <ul role="list" class="mt-4 flex h-36 shrink-0 flex-col gap-2 overflow-y-auto">
          @for (item of legend(); track item.key) {
            <li class="flex items-center justify-between gap-2 text-sm">
              <span class="flex min-w-0 items-center gap-2 text-gray-700 dark:text-zinc-200">
                <span
                  class="size-2.5 shrink-0 rounded-full"
                  [style.background-color]="item.color"
                  aria-hidden="true"
                ></span>
                @if (item.code) {
                  <img
                    [src]="'https://flagcdn.com/' + item.code + '.svg'"
                    class="h-3 w-4.5 shrink-0 rounded-xs object-cover"
                    alt=""
                    aria-hidden="true"
                  />
                }
                <span class="truncate">{{ item.label }}</span>
              </span>
              <span class="shrink-0 font-medium text-gray-900 tabular-nums dark:text-zinc-100">
                {{ item.value }}
                <span class="text-xs font-normal text-gray-500 dark:text-zinc-400">
                  ({{ item.share }}%)
                </span>
              </span>
            </li>
          }
        </ul>
      }
    </app-host-card-shell>
  `,
})
export class HostDonutCard {
  readonly cardTitle = input.required<string>();
  readonly subtitle = input('');
  readonly data = input.required<unknown>();
  readonly options = input.required<unknown>();
  /** Text alternative to the canvas — one row per slice, same colour as the slice. */
  readonly legend = input.required<HostDonutLegendItem[]>();
  /** Headline value rendered in the doughnut hole. */
  readonly centerValue = input<string | number>('');
  readonly centerLabel = input('');
  readonly hasData = input(true);
  readonly loading = input(false);
  readonly emptyMessage = input('No data to chart yet');
}
