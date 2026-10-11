import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';

import { PolicyType } from '@shared/interfaces';

@Component({
  selector: 'app-policy-type-leave-detail',
  imports: [ButtonModule],
  templateUrl: './policy-type-leave-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PolicyTypeLeaveDetail {
  readonly policyType = input<PolicyType>();
  readonly closePopup = output();

  onClose() {
    this.closePopup.emit();
  }
}
