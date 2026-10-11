import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ProjectTaskStatus } from '@shared/interfaces';
import { TagModule } from '@openng/optimus-ui/tag';
import { STATUS_META } from '../projects-nav';

@Component({
  selector: 'app-project-status-badge',
  imports: [TagModule],
  template: `
    <p-tag [value]="meta().label" [severity]="meta().severity" [icon]="meta().icon" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectStatusBadge {
  readonly status = input.required<ProjectTaskStatus>();
  readonly meta = computed(() => STATUS_META[this.status()]);
}
