import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardModule } from '@openng/optimus-ui/card';

import { StaffMemberStatistic } from '@shared/interfaces';

@Component({
  selector: 'app-staffMember-stats',
  imports: [CardModule],
  templateUrl: './staffMember-stats.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffMemberStats {
  readonly staffMemberStatistics = input<StaffMemberStatistic | null>();
}
