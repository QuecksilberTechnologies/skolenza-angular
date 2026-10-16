import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { ThemeApi } from '@core/services';
import { CurrentUserPermissionsStore } from '@core/stores';
import { ColorPicker } from '@shared/components/color-picker/color-picker';
import { ProBadge } from '@shared/components/pro-badge/pro-badge';
import { RovingRadioGroup } from '@shared/directives';
import { QUICK_ACCENT_COLORS } from '@shared/interfaces';
import { contrastTextColor } from '@shared/utilities/color';

import { SettingsStore } from '../settings.store';

@Component({
  selector: 'app-appearance',
  imports: [ProBadge, ColorPicker, RovingRadioGroup],
  templateUrl: './appearance.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Appearance {
  readonly #store = inject(SettingsStore);
  readonly #themeApi = inject(ThemeApi);
  /** Accent colour is institution-wide branding, so only a super admin may change it. */
  readonly isSuperAdmin = inject(CurrentUserPermissionsStore).isSuperAdmin;
  readonly quickColors = QUICK_ACCENT_COLORS;
  readonly appearance = this.#store.appearance;
  readonly selectedColorName = this.#store.selectedColorName;
  readonly isDarkMode = this.#themeApi.isDarkMode;
  readonly contrastTextColor = contrastTextColor;

  /** The applied accent when it is not one of the quick colors, so the row still shows it. */
  readonly appliedColor = computed(() => {
    const hex = this.appearance().accentColor;
    return QUICK_ACCENT_COLORS.some((color) => color.value === hex) ? null : hex;
  });

  selectAccentColor(hex: string) {
    this.#store.setAccentColor(hex);
  }

  selectThemeMode(mode: 'light' | 'dark') {
    this.#store.setThemeMode(mode);
  }
}
