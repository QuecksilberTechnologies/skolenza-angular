import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { TagModule } from '@openng/optimus-ui/tag';

import { InsurancePolicy } from '@shared/interfaces';

/**
 * Read-only insurance policy summary for the row detail sheet.
 *
 * The list shows five columns; the rest of the model is only reachable here, so
 * this panel always renders every field.
 *
 * `block h-full` on the host is required: Optimus renders `#headless` content as
 * a direct flex child of the drawer root with no `.p-drawer-content` wrapper, so
 * without it the inner `h-full` has nothing to resolve against and the body
 * never scrolls.
 */
@Component({
  selector: 'app-insurance-policy-detail',
  imports: [ButtonModule, TagModule, DatePipe],
  templateUrl: './insurance-policy-detail.html',
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsurancePolicyDetail {
  readonly policy = input<InsurancePolicy | undefined>();
  readonly closePopup = output();

  /** Scoped to the policy so a reopened drawer never labels itself from a stale node. */
  readonly titleId = computed(
    () => `insurance-policy-detail-title-${this.policy()?.insurancePolicyId ?? 'none'}`,
  );

  onCancel() {
    this.closePopup.emit();
  }
}
