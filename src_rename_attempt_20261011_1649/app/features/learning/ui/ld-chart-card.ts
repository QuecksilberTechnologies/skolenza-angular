import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardModule } from '@openng/optimus-ui/card';
import { ChartModule } from '@openng/optimus-ui/chart';

@Component({
  selector: 'app-ld-chart-card',
  imports: [CardModule, ChartModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-card
      class="block rounded-xl border-0 bg-white shadow dark:border-zinc-800 dark:bg-zinc-900"
      styleClass="h-full"
    >
      <div class="flex h-full flex-col">
        <div class="mb-3 border-b border-gray-100 pb-2 dark:border-zinc-800">
          <h2 class="text-sm font-semibold text-gray-900 dark:text-zinc-100">{{ title() }}</h2>
          @if (subtitle()) {
            <p class="text-xs text-gray-500 dark:text-zinc-400">{{ subtitle() }}</p>
          }
        </div>

        <div class="relative">
          @defer (on viewport) {
            <p-chart
              [type]="type()"
              [data]="data()"
              [options]="options()"
              class="mx-auto block w-full"
              [class]="heightClass()"
            />
          } @placeholder {
            <div
              class="animate-pulse rounded-lg bg-gray-100 dark:bg-zinc-800"
              [class]="heightClass()"
            ></div>
          }

          @if (centerValue() !== null) {
            <div
              class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
              aria-hidden="true"
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
          }
        </div>
      </div>
    </p-card>
  `,
})
export class LdChartCard {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly type = input.required<'doughnut' | 'bar' | 'line'>();
  readonly data = input.required<unknown>();
  readonly options = input.required<unknown>();
  readonly heightClass = input('h-64');
  /** Optional headline value rendered in the doughnut hole. */
  readonly centerValue = input<string | number | null>(null);
  readonly centerLabel = input('');
}
