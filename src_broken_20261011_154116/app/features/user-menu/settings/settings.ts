import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { CardModule } from '@openng/optimus-ui/card';
import { TabsModule } from '@openng/optimus-ui/tabs';

import { AuthApi, Common } from '@core/services';
import { CurrentUserPermissionsStore } from '@core/stores';
import { ProBadge } from '@shared/components/pro-badge/pro-badge';
import { SettingsTab } from '@shared/interfaces';

import { SettingActions } from './setting-actions/setting-actions';
import { SettingsStore } from './settings.store';

/** The one tab every role keeps, so a hidden tab never leaves the tab bar unhighlighted. */
const FALLBACK_TAB = 'appearance';

@Component({
  selector: 'app-settings',
  imports: [RouterModule, TabsModule, CardModule, ProBadge, SettingActions],
  providers: [SettingsStore],
  templateUrl: './settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Settings implements OnInit {
  readonly #commonService = inject(Common);
  readonly #router = inject(Router);
  readonly #destroyRef = inject(DestroyRef);
  readonly #authApi = inject(AuthApi);
  readonly #permissionsStore = inject(CurrentUserPermissionsStore);

  readonly #baseTabs: SettingsTab[] = [
    {
      route: 'brand-identity',
      label: 'Brand Identity',
      icon: 'pi pi-verified',
      description: "Customize how your organization's brand appears across the portal.",
      pro: true,
      superAdminOnly: true,
    },
    {
      route: 'appearance',
      label: 'Appearance',
      icon: 'pi pi-palette',
      description: 'Personalize your theme and appearance.',
    },
    {
      route: 'language-region',
      label: 'Language & Region',
      icon: 'pi pi-globe',
      description: 'Set your language, date & time format, and timezone.',
      superAdminOnly: true,
    },
    {
      route: 'notifications',
      label: 'Notifications',
      icon: 'pi pi-bell',
      description: 'Control the alerts and notifications you want to receive.',
      superAdminOnly: true,
    },
    {
      route: 'staffMember-editing',
      label: 'StaffMember Editing',
      icon: 'pi pi-user-edit',
      description: 'Choose which profile sections staffMembers may edit themselves.',
      superAdminOnly: true,
      autoSave: true,
    },
  ];

  // Org-wide tabs are super-admin-only, mirroring the settings route guards.
  // Billing tab is Admin (1) / Manager (3) only, mirroring the subscription route guard.
  readonly tabs = computed<SettingsTab[]>(() => {
    const isSuperAdmin = this.#permissionsStore.isSuperAdmin();
    const visible = this.#baseTabs.filter((tab) => !tab.superAdminOnly || isSuperAdmin);
    const roleTypeId = this.#authApi.authRoleType();
    if (roleTypeId !== 1 && roleTypeId !== 3) return visible;
    return [
      ...visible,
      {
        route: 'billing',
        label: 'Billing & Subscription',
        icon: 'pi pi-credit-card',
        description: 'Manage your plan, usage, and billing in one place.',
      },
    ];
  });

  readonly activeTab = signal(FALLBACK_TAB);

  readonly activeTabMeta = computed(
    () => this.tabs().find((t) => t.route === this.activeTab()) ?? this.tabs()[0],
  );

  constructor() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Settings',
      pageDescription: 'Manage your account and application settings here',
      pageIcon: 'pi pi-shield',
      isBreadcrumbShow: false,
    });
  }

  ngOnInit(): void {
    this.#syncFromUrl(this.#router.url);
    this.#router.events.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.#syncFromUrl(event.urlAfterRedirects);
      }
    });
  }

  #syncFromUrl(url: string): void {
    const segment = url.split(/[?#]/)[0].split('/').pop() ?? '';
    const matched = this.tabs().find((t) => t.route === segment);
    // Fall back to the first tab this user can actually see, not a hidden one.
    this.activeTab.set(matched?.route ?? this.tabs()[0]?.route ?? FALLBACK_TAB);
  }
}
