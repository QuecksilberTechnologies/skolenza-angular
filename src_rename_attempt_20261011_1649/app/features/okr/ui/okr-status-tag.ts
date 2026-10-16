import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TagModule } from '@openng/optimus-ui/tag';

import { OkrStatus } from '@shared/interfaces';

type Severity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

const STATUS_META: Record<OkrStatus, { label: string; severity: Severity }> = {
  Draft: { label: 'Draft', severity: 'secondary' },
  Active: { label: 'Active', severity: 'info' },
  OnTrack: { label: 'On Track', severity: 'success' },
  Behind: { label: 'Behind', severity: 'warn' },
  Completed: { label: 'Completed', severity: 'contrast' },
  Archived: { label: 'Archived', severity: 'secondary' },
};

@Component({
  selector: 'app-okr-status-tag',
  imports: [TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-tag [value]="meta().label" [severity]="meta().severity" />
  `,
})
export class OkrStatusTag {
  readonly status = input.required<OkrStatus>();
  protected readonly meta = computed(() => STATUS_META[this.status()]);
}
