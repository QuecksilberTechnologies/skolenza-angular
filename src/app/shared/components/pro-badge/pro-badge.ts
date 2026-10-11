import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

@Component({
  selector: 'app-pro-badge',
  imports: [TagModule, TooltipModule],
  templateUrl: './pro-badge.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProBadge {
  readonly tooltip = input('Pro feature — available on premium plans');
  readonly tooltipPosition = input('top');
}
