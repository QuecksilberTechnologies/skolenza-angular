import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { Popover, PopoverModule } from '@openng/optimus-ui/popover';

import NotificationPopup from '../notification-popup/notification-popup';

/**
 * Notification bell popover.
 *
 * Split out of the header so each `p-popover` owns its own `#content` marker —
 * Optimus resolves projected templates by reference name, which must be unique
 * within a template.
 */
@Component({
  selector: 'app-notification-popover',
  imports: [PopoverModule, NotificationPopup],
  template: `
    <p-popover #popover class="app-menu-popup bg-white dark:bg-zinc-900">
      <ng-template #content>
        <app-notification-popup (closePopup)="hide()" />
      </ng-template>
    </p-popover>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationPopover {
  protected readonly popover = viewChild.required<Popover>('popover');

  toggle(event: MouseEvent) {
    this.popover().toggle(event);
  }

  hide() {
    this.popover().hide();
  }
}
