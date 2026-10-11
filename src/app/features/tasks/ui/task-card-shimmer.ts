import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';

@Component({
  selector: 'app-task-card-shimmer',
  imports: [SkeletonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
    >
      <div class="flex items-start justify-between gap-2">
        <div class="flex w-full flex-col gap-2">
          <p-skeleton height="1rem" class="rounded-md" />
          <p-skeleton width="60%" height="1rem" class="rounded-md" />
        </div>
        <p-skeleton width="4.5rem" height="1.5rem" borderRadius="9999px" />
      </div>

      <div class="flex gap-1">
        <p-skeleton width="3rem" height="1.25rem" borderRadius="9999px" />
        <p-skeleton width="3rem" height="1.25rem" borderRadius="9999px" />
      </div>

      <div class="flex items-center gap-2">
        <p-skeleton height="0.5rem" class="flex-1 rounded-full" />
        <p-skeleton width="2.25rem" height="0.75rem" class="rounded-md" />
      </div>

      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-1.5">
          <p-skeleton shape="circle" size="1.75rem" />
          <p-skeleton width="5rem" height="0.75rem" class="rounded-md" />
        </div>
        <p-skeleton width="3rem" height="0.75rem" class="rounded-md" />
      </div>
    </div>
  `,
})
export class TaskCardShimmer {}
