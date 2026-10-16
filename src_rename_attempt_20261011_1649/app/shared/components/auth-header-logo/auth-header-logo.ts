import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

import { InstitutionsApi } from '@core/services/institutions-api';
import { ThemeApi } from '@core/services/theme-api';
import { LogoVariantKey } from '@shared/interfaces';

@Component({
  selector: 'app-auth-header-logo',
  imports: [NgOptimizedImage],
  templateUrl: './auth-header-logo.html',
  styleUrl: './auth-header-logo.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AuthHeaderLogo {
  readonly #themeApi = inject(ThemeApi);
  readonly #institutionsApi = inject(InstitutionsApi);
  readonly isDarkMode = signal(false);

  readonly customLogo = computed(() => {
    const key: LogoVariantKey = this.isDarkMode() ? 'darkLarge' : 'lightLarge';
    return this.#institutionsApi.brandLogos()[key];
  });

  constructor() {
    this.#institutionsApi.loadBrandLogos();
    effect(() => {
      this.isDarkMode.set(this.#themeApi.isDarkMode());
    });
  }
}
