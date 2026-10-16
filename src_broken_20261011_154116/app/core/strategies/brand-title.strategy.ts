import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

import { AuthStore } from '@core/stores';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class BrandTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly authStore = inject(AuthStore);
  private readonly appName = environment.appName;

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const built = this.buildTitle(snapshot);
    const suffix = this.authStore.institutionName() || this.appName;

    if (!built) {
      this.title.setTitle(suffix);
      return;
    }

    const staticSuffix = ` | ${this.appName}`;
    const page = built.endsWith(staticSuffix) ? built.slice(0, -staticSuffix.length) : built;

    this.title.setTitle(`${page} | ${suffix}`);
  }
}
