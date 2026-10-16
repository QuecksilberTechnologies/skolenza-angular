import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';

import { NotificationsData } from '@shared/interfaces';

import { SettingsStore } from '../settings.store';

@Component({
  selector: 'app-notifications-settings',
  imports: [FormsModule, ToggleSwitchModule],
  templateUrl: './notifications-settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class NotificationsSettings {
  readonly #store = inject(SettingsStore);
  readonly notifications = this.#store.notifications;

  onToggle(key: keyof NotificationsData, value: boolean) {
    this.#store.updateNotifications({ [key]: value });
  }
}
