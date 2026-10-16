import {
  ChangeDetectionStrategy,
  Component,
  inject,
  NgZone,
  output,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { OverlayBadgeModule } from '@openng/optimus-ui/overlaybadge';
import { Popover, PopoverModule } from '@openng/optimus-ui/popover';

import { AuthApi } from '@core/services/auth-api';
import {
  AuthStore,
  CheckInStore,
  CurrentUserPermissionsStore,
  FeaturePageStore,
  NotificationStore,
} from '@core/stores';
import Logout from '@layout/logout/logout';
import { UserMenu } from '@layout/user-menu/user-menu';
import { PageInfo } from '@shared/components/navbar/page-info/page-info';
import { UserAvatar } from '@shared/components/user-avatar/user-avatar';

import { NotificationPopover } from './notification-popover/notification-popover';

@Component({
  selector: 'app-header',
  imports: [
    UserAvatar,
    ButtonModule,
    OverlayBadgeModule,
    PopoverModule,
    PageInfo,
    UserMenu,
    NotificationPopover,
  ],
  templateUrl: './app-header.html',
  styleUrl: './app-header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AppHeader {
  readonly #router = inject(Router);
  readonly #authApi = inject(AuthApi);
  readonly #dialogService = inject(DialogService);
  readonly #ngZone = inject(NgZone);
  readonly #permissionsStore = inject(CurrentUserPermissionsStore);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly authStore = inject(AuthStore);
  readonly checkInStore = inject(CheckInStore);
  readonly notificationStore = inject(NotificationStore);
  readonly leftmenuToggleEvent = output();
  readonly notificationPopup = viewChild.required<NotificationPopover>('notificationPopup');
  readonly profileMenuPopup = viewChild.required<Popover>('profileMenuPopup');
  protected dynamicDialogRef: DynamicDialogRef | null = null;

  constructor() {
    this.#router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.profileMenuPopup().hide();
      }
    });
  }

  toggleNotificationPopup(event: MouseEvent) {
    this.notificationPopup().toggle(event);
  }

  closeProfilePopup() {
    this.profileMenuPopup().hide();
  }

  onLeftMenuToggle() {
    this.leftmenuToggleEvent.emit();
  }

  async logout() {
    this.closeProfilePopup();
    this.authStore.clearLoginData();
    this.#permissionsStore.clear();
    this.#featurePageStore.clear();

    // Show logout progress bar
    this.dynamicDialogRef = this.#dialogService.open(Logout, {
      showHeader: false,
      modal: true,
      closable: false,
      focusOnShow: false,
      style: { width: '90vw', maxWidth: '36rem' },
      contentStyle: { overflow: 'hidden' },
    });

    // Close logout progress bar after 500ms
    this.#ngZone.runOutsideAngular(() => {
      setTimeout(async () => {
        await this.#authApi.logout();
        if (this.dynamicDialogRef) {
          this.dynamicDialogRef.close();
        }
      }, 300);
    });
  }
}
