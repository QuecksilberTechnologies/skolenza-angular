import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TagModule } from '@openng/optimus-ui/tag';

import { PMS_STATUS_META, PmsStatus } from '@shared/interfaces';

@Component({
  selector: 'app-pms-status-badge',
  imports: [TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-tag [value]="meta().label" [severity]="meta().severity" />
  `,
})
export class PmsStatusBadge {
  readonly status = input.required<PmsStatus>();
  protected readonly meta = computed(() => PMS_STATUS_META[this.status()]);
}
