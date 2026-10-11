import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardModule } from '@openng/optimus-ui/card';

import { StaffMemberStatistic } from '@shared/interfaces';

@Component({
  selector: 'app-staff-member-stats',
  imports: [CardModule],
  templateUrl: './staff-member-stats.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffMemberStats {
  readonly staffMemberStatistics = input<StaffMemberStatistic | null>();
}
