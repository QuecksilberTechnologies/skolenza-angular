import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CardModule } from '@openng/optimus-ui/card';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';

@Component({
  selector: 'app-kanban-task-shimmer',
  imports: [CardModule, SkeletonModule],
  templateUrl: './kanban-task-shimmer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class KanbanTaskShimmerComponent {}
