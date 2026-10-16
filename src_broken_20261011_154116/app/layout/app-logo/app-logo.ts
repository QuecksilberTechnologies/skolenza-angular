import { Platform } from '@angular/cdk/platform';
import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterModule } from '@angular/router';

import { InstitutionsApi } from '@core/services/institutions-api';
import { ThemeApi } from '@core/services/theme-api';
import { LogoVariantKey } from '@shared/interfaces';

@Component({
  selector: 'app-logo',
  imports: [RouterModule, NgOptimizedImage],
  templateUrl: './app-logo.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AppLogo {
  readonly #themeApi = inject(ThemeApi);
  readonly #institutionsApi = inject(InstitutionsApi);
  readonly platform = inject(Platform);
  readonly isLeftmenuCollapsed = input<boolean>();
  readonly logoClick = output();
  readonly isDarkMode = signal(false);
  readonly isCompact = computed(() => !!this.isLeftmenuCollapsed() && window.innerWidth >= 1024);

  readonly activeVariantKey = computed<LogoVariantKey>(() => {
    const dark = this.isDarkMode();
    const compact = this.isCompact();
    if (dark) return compact ? 'darkSmall' : 'darkLarge';
    return compact ? 'lightSmall' : 'lightLarge';
  });
  readonly customLogo = computed(() => this.#institutionsApi.brandLogos()[this.activeVariantKey()]);

  constructor() {
    this.#institutionsApi.loadBrandLogos();
    effect(() => {
      this.isDarkMode.set(this.#themeApi.isDarkMode());
    });
  }

  onLogoClick(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    this.logoClick.emit();
  }
}
