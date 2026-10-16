import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';

import { Common } from '@core/services';

import { SettingsStore } from '../settings.store';

@Component({
  selector: 'app-setting-actions',
  imports: [ButtonModule],
  templateUrl: './setting-actions.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingActions {
  readonly #store = inject(SettingsStore);
  readonly #common = inject(Common);
  readonly isDirty = this.#store.isDirty;

  onDiscard() {
    this.#store.discardChanges();
    this.#common.showMessage('Changes discarded', 'info');
  }

  onSave() {
    this.#store.saveSettings();
    this.#common.showMessage('Settings saved successfully', 'success');
  }
}
