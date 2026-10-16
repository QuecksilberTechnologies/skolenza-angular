import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from '@openng/optimus-ui/select';

import {
  DATE_FORMATS,
  DateFormatOption,
  LANGUAGES,
  LanguageOption,
  TIMEZONES,
  TIME_FORMATS,
  TimeFormatOption,
  TimezoneOption,
} from '@shared/interfaces';

import { SettingsStore } from '../settings.store';

@Component({
  selector: 'app-language-region',
  imports: [FormsModule, SelectModule],
  templateUrl: './language-region.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LanguageRegion {
  readonly #store = inject(SettingsStore);
  readonly languageRegion = this.#store.languageRegion;
  readonly languages: LanguageOption[] = LANGUAGES;
  readonly dateFormats: DateFormatOption[] = DATE_FORMATS;
  readonly timeFormats: TimeFormatOption[] = TIME_FORMATS;
  readonly timezones: TimezoneOption[] = TIMEZONES;

  onLanguageChange(value: LanguageOption) {
    this.#store.updateLanguageRegion({ language: value.code });
  }

  onDateFormatChange(value: DateFormatOption) {
    this.#store.updateLanguageRegion({ dateFormat: value.value });
  }

  onTimeFormatChange(value: TimeFormatOption) {
    this.#store.updateLanguageRegion({ timeFormat: value.value });
  }

  onTimezoneChange(value: TimezoneOption) {
    this.#store.updateLanguageRegion({ timezone: value.value });
  }

  getSelectedLanguage(): LanguageOption | undefined {
    return this.languages.find((l) => l.code === this.languageRegion().language);
  }

  getSelectedDateFormat(): DateFormatOption | undefined {
    return this.dateFormats.find((d) => d.value === this.languageRegion().dateFormat);
  }

  getSelectedTimeFormat(): TimeFormatOption | undefined {
    return this.timeFormats.find((t) => t.value === this.languageRegion().timeFormat);
  }

  getSelectedTimezone(): TimezoneOption | undefined {
    return this.timezones.find((t) => t.value === this.languageRegion().timezone);
  }
}
