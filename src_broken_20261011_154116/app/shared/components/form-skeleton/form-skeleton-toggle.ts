import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';

/**
 * Placeholder for a switch row. Wears the same host classes as `app-toggle-field`
 * so the bordered box keeps its size while the record loads.
 */
@Component({
  selector: 'app-skeleton-toggle',
  imports: [SkeletonModule],
  template: `
    <div class="space-y-1.5">
      <p-skeleton width="5rem" height="0.8rem" class="rounded-md!" />
      @if (hint()) {
        <p-skeleton width="8rem" height="0.7rem" class="rounded-md!" />
      }
    </div>
    <p-skeleton width="2.5rem" height="1.25rem" class="shrink-0 rounded-full!" />
  `,
  host: {
    class:
      'flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 dark:border-zinc-700',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonToggle {
  /** Draws the second line the real toggle shows under its label. */
  readonly hint = input(true);
}
