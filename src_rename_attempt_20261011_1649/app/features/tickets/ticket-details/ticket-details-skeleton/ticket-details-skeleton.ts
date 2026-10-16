import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';

@Component({
  selector: 'app-ticket-details-skeleton',
  imports: [SkeletonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full space-y-4 bg-zinc-50/50 p-4 dark:bg-zinc-950/50">
      <div class="flex items-center justify-between">
        <p-skeleton width="150px" height="2rem" />
        <div class="flex gap-2">
          <p-skeleton width="80px" height="2rem" rounded="lg" />
          <p-skeleton width="80px" height="2rem" rounded="lg" />
        </div>
      </div>
      <div class="grid gap-4 lg:grid-cols-4">
        <div class="space-y-4 lg:col-span-3">
          <p-skeleton width="100%" height="15rem" rounded="xl" />
          <p-skeleton width="100%" height="25rem" rounded="xl" />
        </div>
        <div class="space-y-4">
          <p-skeleton width="100%" height="12rem" rounded="xl" />
        </div>
      </div>
    </div>
  `,
})
export class TicketDetailsSkeleton {}
