import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardModule } from '@openng/optimus-ui/card';
import { ChartModule } from '@openng/optimus-ui/chart';

@Component({
  selector: 'app-okr-chart-card',
  imports: [CardModule, ChartModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-card
      class="block rounded-xl border-0 bg-white shadow dark:border-zinc-800 dark:bg-zinc-900"
      styleClass="h-full"
    >
      <div class="flex h-full flex-col">
        <h2 class="text-xl font-semibold text-color-emphasis dark:text-zinc-100">{{ title() }}</h2>
        <p class="mb-3 text-sm text-gray-500 dark:text-zinc-400">{{ subtitle() }}</p>
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
      </div>
    </p-card>
  `,
})
export class OkrChartCard {
  readonly title = input.required<string>();
  readonly subtitle = input.required<string>();
  readonly type = input.required<'doughnut' | 'bar'>();
  readonly data = input.required<unknown>();
  readonly options = input.required<unknown>();
  readonly heightClass = input('h-72');
}
