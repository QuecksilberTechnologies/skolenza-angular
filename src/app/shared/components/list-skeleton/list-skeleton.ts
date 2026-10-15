import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';

/**
 * Shimmer rows for a bordered record list — a title line, a muted detail line and small
 * row-action buttons on the right — so the swap to real rows does not shift the layout.
 */
@Component({
  selector: 'app-list-skeleton',
  imports: [SkeletonModule],
  template: `
    <!-- No aria-busy here: it would tell screen readers to hold the status announcement. -->
    <div role="status">
      <span class="sr-only">{{ label() }}</span>
      @for (row of rowList(); track row) {
        <div
          class="flex items-center justify-between gap-4 border-b border-gray-200 p-4 last:border-b-0 dark:border-zinc-700"
        >
          <div class="min-w-0 flex-1">
            <div class="flex h-[1lh] items-center">
              <p-skeleton width="12rem" height="1rem" />
            </div>
            <div class="flex h-[1lh] items-center text-sm">
              <p-skeleton width="60%" height="0.75rem" />
            </div>
          </div>
          @if (actions()) {
            <!-- Height of a small p-button. -->
            <div class="flex h-[2.2163rem] shrink-0 gap-2">
              @for (action of actionList(); track action) {
                <p-skeleton width="5rem" height="100%" />
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListSkeleton {
  /** Screen-reader text announced while the list loads. */
  readonly label = input('Loading...');
  readonly rows = input(5);
  /** Number of row-action button placeholders. */
  readonly actions = input(2);

  protected readonly rowList = computed(() => Array.from({ length: this.rows() }, (_, i) => i));
  protected readonly actionList = computed(() =>
    Array.from({ length: this.actions() }, (_, i) => i),
  );
}
