import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { Router } from '@angular/router';

import { AuthStore, isLogoutMenuItem } from '@core/stores';
import { UserAvatar } from '@shared/components/user-avatar/user-avatar';
import { CommonMenuItem } from '@shared/interfaces';

import { UserMenuLoader } from './user-menu-loader/user-menu-loader';

@Component({
  selector: 'app-user-menu',
  imports: [UserAvatar, UserMenuLoader],
  templateUrl: './user-menu.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserMenu {
  readonly authStore = inject(AuthStore);
  readonly closePopup = output();
  readonly logout = output();
  readonly #router = inject(Router);

  /** The sign-out row is the one CommonMenu entry that does not navigate. */
  protected isLogout(childModule: CommonMenuItem): boolean {
    return isLogoutMenuItem(childModule);
  }

  async onClickNav(e: Event, childModule: CommonMenuItem) {
    e.stopPropagation();
    e.preventDefault();

    this.closePopup.emit();

    if (!childModule.urlPath) {
      return;
    }

    await this.#router.navigate([`/app/${childModule.urlPath}`], { fragment: 'auth' });
  }

  async onLogout(e: Event) {
    e.stopPropagation();
    this.logout.emit();
  }
}
