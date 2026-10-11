import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthApi } from '@core/services/auth-api';
import { Common } from '@core/services/common';
import { LayoutStore, LookupStore } from '@core/stores';
import { isHostLogin } from '@shared/utilities/login-info';

import AppAsideMenu from './app-aside-menu/app-aside-menu';
import AsideMenuLoader from './app-aside-menu/aside-menu-loader/aside-menu-loader';
import AppHeader from './app-header/app-header';
import HeaderLoader from './app-header/header-loader/header-loader';
import AppLogo from './app-logo/app-logo';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, AppHeader, AppAsideMenu, AppLogo, HeaderLoader, AsideMenuLoader],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Layout implements OnInit, AfterViewInit {
  readonly #authApi = inject(AuthApi);
  readonly #commonService = inject(Common);
  readonly #lookupStore = inject(LookupStore);
  readonly layoutStore = inject(LayoutStore);

  protected readonly isTransitionEnabled = signal(false);

  ngAfterViewInit() {
    // Enable transitions after the first render to prevent the flash of expanded sidebar
    requestAnimationFrame(() => {
      this.isTransitionEnabled.set(true);
    });
  }

  async ngOnInit() {
    const loginInfo = await this.#commonService.getLoginInfo();
    // Lookups are institution-scoped; a host has no staffMember context and the API
    // answers "Inactive user." for UserStaffMemberId=0. Countries and genders are the exception —
    // global reference data that the host Institutions list and institution form both need, and both
    // endpoints answer with no staffMember id at all.
    if (isHostLogin(loginInfo)) {
      this.#lookupStore.initializeGlobalOptions();
    } else {
      this.#lookupStore.initialize(loginInfo?.user?.staffMemberId);
    }
  }

  toggleLeftMenu() {
    this.layoutStore.toggleSidebar();
  }

  hideLeftMenu() {
    if (window.innerWidth < 1024) {
      this.layoutStore.hideSidebar();
    }
  }

  redirectToDashboard() {
    this.#authApi.redirectToDashboard();
  }
}
