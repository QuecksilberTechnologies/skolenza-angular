import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

/** Title, optional "Sample data" badge and refresh button shared by the role dashboard cards. */
@Component({
  selector: 'app-dashboard-card-header',
  imports: [ButtonModule, TooltipModule],
  template: `
    <div class="flex items-center justify-between gap-3 px-5 pt-5">
      <div class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <h3 class="m-0 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {{ title() }}
        </h3>
        @if (placeholder()) {
          <span
            class="rounded-full border border-zinc-200 px-2 py-1 text-xs font-medium whitespace-nowrap text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
          >
            Sample data
          </span>
        }
      </div>
      @if (refreshable()) {
        <p-button
          icon="pi pi-refresh"
          [rounded]="true"
          [text]="true"
          [loading]="loading()"
          [attr.aria-busy]="loading()"
          pTooltip="Refresh"
          tooltipPosition="left"
          [ariaLabel]="'Refresh ' + (title() ?? '')"
          (onClick)="refresh.emit()"
        />
      }
      @if (loading()) {
        <span class="sr-only" role="status">Loading {{ title() }}</span>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardCardHeader {
  readonly title = input<string>();
  /** The backend still fakes this section's values. */
  readonly placeholder = input(false);
  readonly loading = input(false);
  /** Off when the page offers one refresh for every card, which would make this one redundant. */
  readonly refreshable = input(true);
  readonly refresh = output<void>();
}
