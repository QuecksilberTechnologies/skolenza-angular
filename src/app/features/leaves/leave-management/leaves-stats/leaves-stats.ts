import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardModule } from '@openng/optimus-ui/card';

@Component({
  selector: 'app-leaves-stats',
  imports: [CardModule],
  templateUrl: './leaves-stats.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LeavesStats {
  readonly total = input<number>(0);
  readonly used = input<number>(0);
  readonly available = input<number>(0);
  readonly pending = input<number>(0);
}
