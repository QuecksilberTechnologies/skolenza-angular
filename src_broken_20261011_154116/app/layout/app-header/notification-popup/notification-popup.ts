import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';

import { NotificationStore } from '@core/stores';

@Component({
  selector: 'app-notification-popup',
  imports: [ButtonModule],
  templateUrl: './notification-popup.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class NotificationPopup {
  readonly closePopup = output();
  readonly notificationStore = inject(NotificationStore);
  #router = inject(Router);

  markAllAsRead(): void {
    this.notificationStore.markAllAsRead();
  }

  viewAll(): void {
    this.closePopup.emit();
    this.#router.navigate(['/app/notifications']);
  }

  onItemClick(event: Event, id: number): void {
    event.stopPropagation();
    event.preventDefault();
    this.notificationStore.markAsRead(id);
    this.closePopup.emit();
  }
}
