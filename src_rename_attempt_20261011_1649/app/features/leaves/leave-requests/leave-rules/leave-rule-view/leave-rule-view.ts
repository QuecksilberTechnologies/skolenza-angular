import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BadgeModule } from '@openng/optimus-ui/badge';

import { ILeaveRule } from '@shared/interfaces';

@Component({
  selector: 'app-leave-rule-view',
  imports: [BadgeModule, DatePipe],
  templateUrl: './leave-rule-view.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LeaveRuleView {
  readonly leaveRule = input<ILeaveRule | undefined>();
}
