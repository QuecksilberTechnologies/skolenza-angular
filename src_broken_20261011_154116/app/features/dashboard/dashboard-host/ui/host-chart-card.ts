import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ChartModule } from '@openng/optimus-ui/chart';

import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';

import { HostCardShell } from './host-card-shell';

/**
 * Chart card for the host dashboard. The canvas is hidden from assistive tech and
 * paired with an `sr-only` list of the same numbers — a bare canvas fails WCAG 1.1.1.
 *
 * All three branches are `flex-1 min-h-0` so they inherit the shell's fixed body height —
 * the skeleton, the empty state and the chart are the same size.
 */
@Component({
  selector: 'app-host-chart-card',
  imports: [ChartModule, HostCardShell, TableEmptyMessage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
  template: `
    <app-host-card-shell [cardTitle]="cardTitle()" [subtitle]="subtitle()">
      @if (loading()) {
        <div
          class="min-h-0 flex-1 animate-pulse rounded-lg bg-gray-100 motion-reduce:animate-none dark:bg-zinc-800"
        ></div>
      } @else if (!hasData()) {
        <div class="flex min-h-0 flex-1 items-center justify-center">
          <app-table-empty-message icon="pi pi-chart-bar" [message]="emptyMessage()" />
        </div>
      } @else {
        @defer (on viewport) {
          <div class="min-h-0 flex-1" aria-hidden="true">
            <p-chart
              [type]="type()"
              [data]="data()"
              [options]="options()"
              class="block h-full w-full"
            />
          </div>
        } @placeholder {
          <div
            class="min-h-0 flex-1 animate-pulse rounded-lg bg-gray-100 motion-reduce:animate-none dark:bg-zinc-800"
          ></div>
        }
        <ul class="sr-only">
          @for (row of summary(); track row) {
            <li>{{ row }}</li>
          }
        </ul>
      }
    </app-host-card-shell>
  `,
})
export class HostChartCard {
  readonly cardTitle = input.required<string>();
  readonly subtitle = input('');
  readonly type = input.required<'bar' | 'line'>();
  readonly data = input.required<unknown>();
  readonly options = input.required<unknown>();
  /** Screen-reader alternative — one pre-formatted "label: value" line per data point. */
  readonly summary = input<string[]>([]);
  readonly hasData = input(true);
  readonly loading = input(false);
  readonly emptyMessage = input('No data to chart yet');
}
