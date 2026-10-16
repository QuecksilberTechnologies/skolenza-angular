import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';

import { HostBillingAuditEntry } from '@shared/interfaces';

/**
 * `metadataJson` is free text the backend stores as-is. Valid JSON is re-indented for reading;
 * anything else is shown verbatim rather than dropped.
 */
export function formatAuditMetadata(metadataJson: string | null | undefined): string | null {
  if (!metadataJson?.trim()) return null;

  try {
    return JSON.stringify(JSON.parse(metadataJson), null, 2);
  } catch {
    return metadataJson;
  }
}

@Component({
  selector: 'app-billing-audit-detail',
  imports: [DatePipe, ButtonModule],
  templateUrl: './billing-audit-detail.html',
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillingAuditDetail {
  readonly entry = input<HostBillingAuditEntry | undefined>();
  readonly closePopup = output();

  protected readonly metadata = computed(() => formatAuditMetadata(this.entry()?.metadataJson));
}
