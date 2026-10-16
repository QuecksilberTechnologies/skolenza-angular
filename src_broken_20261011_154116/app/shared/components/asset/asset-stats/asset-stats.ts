import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardModule } from '@openng/optimus-ui/card';

import { AssetStatistic } from '@shared/interfaces';

@Component({
  selector: 'app-asset-stats',
  imports: [CardModule],
  templateUrl: './asset-stats.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetStats {
  readonly assetStatistics = input<AssetStatistic | null>();
}
