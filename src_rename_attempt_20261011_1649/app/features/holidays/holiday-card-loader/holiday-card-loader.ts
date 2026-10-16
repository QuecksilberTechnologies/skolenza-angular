import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';

/** Skeleton grid shaped like `HolidayCard`, shown while the card view loads. */
@Component({
  selector: 'app-holiday-card-loader',
  imports: [SkeletonModule],
  template: `
    <div
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      role="status"
      aria-live="polite"
    >
      <span class="sr-only">Loading holidays</span>
      @for (_ of placeholders; track $index) {
        <div
          class="flex flex-col rounded-xl border border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800"
          aria-hidden="true"
        >
          <!-- Date + title + actions -->
          <div class="flex items-start gap-3">
            <p-skeleton shape="square" size="3.5rem" borderRadius="0.75rem" />
            <div class="flex flex-1 flex-col gap-2">
              <p-skeleton width="70%" height="1rem" />
              <p-skeleton width="40%" height="0.75rem" />
            </div>
            <p-skeleton width="2.5rem" height="2.5rem" borderRadius="0.5rem" />
          </div>

          <!-- Description -->
          <div class="mt-3 flex flex-col gap-2">
            <p-skeleton height="0.75rem" />
            <p-skeleton width="80%" height="0.75rem" />
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HolidayCardLoader {
  protected readonly placeholders = Array.from({ length: 8 });
}
