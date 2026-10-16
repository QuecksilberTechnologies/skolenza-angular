import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';

@Component({
  selector: 'app-avatar-popup-item',
  imports: [LucideAngularModule, TooltipModule],
  templateUrl: './avatar-popup-item.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarPopupItem {
  readonly label = input.required<string>();
  readonly value = input<string | number>();
  readonly icon = input.required<LucideIconData>();
}
