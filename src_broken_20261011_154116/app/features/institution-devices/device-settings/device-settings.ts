import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';
import { TabsModule } from '@openng/optimus-ui/tabs';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { finalize } from 'rxjs';

import { Common, InstitutionDeviceConfigurationApi } from '@core/services';
import { CurrentUserPermissionsStore } from '@core/stores';
import { SkeletonField } from '@shared/components/form-skeleton/form-skeleton-field';
import { SkeletonToggle } from '@shared/components/form-skeleton/form-skeleton-toggle';
import { ReplaceGatewayUrlDialog } from '@shared/components/replace-gateway-url-dialog/replace-gateway-url-dialog';
import { RotateGatewayUrlDialog } from '@shared/components/rotate-gateway-url-dialog/rotate-gateway-url-dialog';
import { SectionCard } from '@shared/components/section-card/section-card';

import { DeviceConnectionForm } from './device-connection-form/device-connection-form';
import {
  EditDeviceConnectionDialog,
  EditDeviceConnectionDialogData,
} from './device-connection-form/edit-device-connection-dialog/edit-device-connection-dialog';
import DeviceSettingsAdvanced from './device-settings-advanced/device-settings-advanced';
import DeviceSettingsAppNotification from './device-settings-app-notification/device-settings-app-notification';
import DeviceSettingsBell from './device-settings-bell/device-settings-bell';
import DeviceSettingsDeviceSetup from './device-settings-device-setup/device-settings-device-setup';
import DeviceSettingsEthernet from './device-settings-ethernet/device-settings-ethernet';
import DeviceSettingsLock from './device-settings-lock/device-settings-lock';
import DeviceSettingsScreenMenuPin from './device-settings-screen-menu-pin/device-settings-screen-menu-pin';
import DeviceSettingsSerial from './device-settings-serial/device-settings-serial';
import DeviceSettingsTime from './device-settings-time/device-settings-time';
import DeviceSettingsWebAccess from './device-settings-web-access/device-settings-web-access';
import DeviceSettingsWifi from './device-settings-wifi/device-settings-wifi';
import { DeviceSettingsSection, DeviceSettingsStore } from './device-settings.store';
import { queuedResultMessage } from './device-settings.utils';

/** Backend module code behind `/api/InstitutionDeviceConfiguration/*` - matches `MODULE_KEY` in
 *  `institution-devices.routes.ts`. Only Institution admins/managers reach this page, so a Host session never
 *  evaluates these checks. */
const MODULE_KEY = 'INSTITUTION_DEVICE_CONFIGURATION';

/** The 9 DDL-backed sections plus the 2 that have no dropdown data of their own. */
type DeviceSettingsTab = DeviceSettingsSection | 'webAccess' | 'screenMenuPin';

const DDL_BACKED_TABS: ReadonlySet<DeviceSettingsTab> = new Set<DeviceSettingsSection>([
  'time',
  'bell',
  'deviceSetup',
  'advanced',
  'lock',
  'serial',
  'ethernet',
  'wifi',
  'appNotification',
]);

@Component({
  selector: 'app-device-settings',
  imports: [
    DatePipe,
    ButtonModule,
    ConfirmDialogModule,
    InputTextModule,
    TabsModule,
    TooltipModule,
    DeviceConnectionForm,
    SectionCard,
    SkeletonModule,
    SkeletonField,
    SkeletonToggle,
    DeviceSettingsTime,
    DeviceSettingsBell,
    DeviceSettingsDeviceSetup,
    DeviceSettingsAdvanced,
    DeviceSettingsLock,
    DeviceSettingsSerial,
    DeviceSettingsEthernet,
    DeviceSettingsWifi,
    DeviceSettingsAppNotification,
    DeviceSettingsWebAccess,
    DeviceSettingsScreenMenuPin,
  ],
  providers: [DeviceSettingsStore],
  templateUrl: './device-settings.html',
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DeviceSettings {
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #commonService = inject(Common);
  readonly #configurationApi = inject(InstitutionDeviceConfigurationApi);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #permissionsStore = inject(CurrentUserPermissionsStore);
  readonly #dialogService = inject(DialogService);
  readonly #destroyRef = inject(DestroyRef);

  protected readonly store = inject(DeviceSettingsStore);

  protected readonly isRebooting = signal(false);
  protected readonly activeTab = signal<DeviceSettingsTab>('time');

  /** The one-time create form only makes sense once the read has actually confirmed there is no
   *  configuration yet - a still-loading resource must not flash it. */
  protected readonly canAddConfiguration = computed(() =>
    this.#permissionsStore.canPerform(MODULE_KEY, 'Add'),
  );
  protected readonly canDeleteConfiguration = computed(() =>
    this.#permissionsStore.canPerform(MODULE_KEY, 'Delete'),
  );

  protected readonly tabs: { key: DeviceSettingsTab; label: string; icon: string }[] = [
    { key: 'time', label: 'Time', icon: 'pi pi-clock' },
    { key: 'bell', label: 'Bell', icon: 'pi pi-volume-up' },
    { key: 'deviceSetup', label: 'Device Setup', icon: 'pi pi-desktop' },
    { key: 'advanced', label: 'Advanced', icon: 'pi pi-sliders-h' },
    { key: 'lock', label: 'Lock', icon: 'pi pi-lock' },
    { key: 'serial', label: 'Serial', icon: 'pi pi-arrows-h' },
    { key: 'ethernet', label: 'Ethernet', icon: 'pi pi-globe' },
    { key: 'wifi', label: 'WiFi', icon: 'pi pi-wifi' },
    { key: 'appNotification', label: 'App Notification', icon: 'pi pi-mobile' },
    { key: 'webAccess', label: 'Web Access', icon: 'pi pi-server' },
    { key: 'screenMenuPin', label: 'Menu PIN', icon: 'pi pi-key' },
  ];

  constructor() {
    const institutionDeviceId = this.#route.snapshot.paramMap.get('institutionDeviceId');
    // The Institution is whoever is logged in - the handoff doc: "A Institution screen must not send or edit
    // a different Institution ID." There is no institution picker on this page.
    this.#commonService.getLoginInfo().then((loginInfo) => {
      this.store.setDeviceContext(loginInfo?.user?.institutionId ?? null, institutionDeviceId);
    });

    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Device Settings',
      pageDescription: 'Push time, bell, lock and other live settings to this device',
      pageIcon: 'pi pi-sliders-h',
      isBreadcrumbShow: true,
    });

    // The device's own name only arrives with the telemetry read, so the trail is re-published as
    // the resource settles instead of being set once.
    effect(() => {
      const deviceName = this.store.telemetry()?.deviceName;

      this.#commonService.setBreadcrumbItems([
        { label: 'My Devices', routerLink: '/app/my-devices' },
        { label: deviceName || 'Device Settings' },
      ]);
    });

    this.#destroyRef.onDestroy(() => this.#commonService.resetBreadcrumbItems());
  }

  onSectionChange(value: unknown): void {
    const tab = value as DeviceSettingsTab;
    this.activeTab.set(tab);
    // The two non-DDL tabs must not touch the store's DDL section, or they would fetch and
    // discard a dropdown list neither of them uses.
    if (DDL_BACKED_TABS.has(tab)) {
      this.store.setActiveSection(tab as DeviceSettingsSection);
    }
  }

  onPasswordInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.store.setCurrentWebServerPassword(value || null);
  }

  /** No settings payload, so no confirmation form - just the institution/device the device already
   *  needs on every other push. */
  confirmReboot(): void {
    this.#confirmationService.confirm({
      message: 'This restarts the device immediately. Anyone standing at it will be interrupted.',
      header: 'Reboot Device',
      icon: 'pi pi-exclamation-circle !text-amber-500 !text-2xl',
      acceptLabel: 'Reboot',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.#rebootDevice(),
    });
  }

  #rebootDevice(): void {
    const institutionId = this.store.institutionId();
    const institutionDeviceId = this.store.institutionDeviceId();
    if (!institutionId || !institutionDeviceId) {
      this.#commonService.showMessage('This device has no institution context to reboot.', 'error');
      return;
    }

    this.isRebooting.set(true);
    this.#configurationApi
      .rebootDevice({ institutionId, institutionDeviceId: String(institutionDeviceId) })
      .pipe(
        finalize(() => {
          this.isRebooting.set(false);
          this.store.setCurrentWebServerPassword(null);
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.#commonService.showMessage(
            queuedResultMessage(res),
            res.isSucceeded ? 'success' : 'error',
          );
          if (res.isSucceeded) {
            this.store.reloadTelemetry();
          }
        },
        error: (err) => this.#commonService.showMessage(err.message, 'error'),
      });
  }

  /** The inline create form has nowhere to "cancel" back to on this page, so cancelling it leaves
   *  for the device list instead. */
  onConnectionCancelled(): void {
    this.#router.navigate(['/app/my-devices']);
  }

  onConnectionSaved(): void {
    this.store.reloadTelemetry();
  }

  editConnection(): void {
    const institutionId = this.store.institutionId();
    const institutionDeviceId = this.store.institutionDeviceId();
    const existing = this.store.telemetry();
    if (!institutionId || !institutionDeviceId || !existing) {
      return;
    }

    const ref: DynamicDialogRef | null = this.#dialogService.open(EditDeviceConnectionDialog, {
      header: 'Edit Connection',
      style: { width: '90vw', maxWidth: '48rem' },
      contentStyle: { overflow: 'auto', maxHeight: '80vh' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: {
        institutionId,
        institutionDeviceId,
        deviceName: existing.deviceName ?? null,
        existing,
      } satisfies EditDeviceConnectionDialogData,
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((saved: boolean) => {
      if (saved) {
        this.store.reloadTelemetry();
      }
    });
    this.#destroyRef.onDestroy(() => ref?.close());
  }

  rotateGatewayUrl(): void {
    const institutionDeviceId = this.store.institutionDeviceId();
    if (!institutionDeviceId) {
      return;
    }

    const ref: DynamicDialogRef | null = this.#dialogService.open(RotateGatewayUrlDialog, {
      header: 'Rotate Gateway URL',
      style: { width: '90vw', maxWidth: '34rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: {
        by: 'device',
        id: institutionDeviceId,
        deviceName: this.store.telemetry()?.deviceName ?? null,
      },
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  /**
   * Queues a new gateway address without revoking the current one. Distinct from
   * `rotateGatewayUrl` above, which takes effect immediately and expects someone at the device.
   */
  replaceGatewayUrl(): void {
    const institutionId = this.store.institutionId();
    const institutionDeviceId = this.store.institutionDeviceId();
    if (!institutionId || !institutionDeviceId) {
      return;
    }

    const ref: DynamicDialogRef | null = this.#dialogService.open(ReplaceGatewayUrlDialog, {
      header: 'Replace Gateway URL',
      style: { width: '90vw', maxWidth: '34rem' },
      contentStyle: { overflow: 'visible' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: {
        institutionId,
        institutionDeviceId,
        currentWebServerPassword: this.store.currentWebServerPassword(),
        deviceName: this.store.telemetry()?.deviceName ?? null,
      },
    });

    // The pending state is what the strip shows while the device has not polled yet.
    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((queued) => {
      if (queued) {
        this.store.reloadGatewayAddress();
      }
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  confirmDeleteConfiguration(): void {
    this.#confirmationService.confirm({
      message:
        'Are you sure you want to delete this connection? The device stays registered, but it loses its connection settings and stops syncing until it is set up again.',
      header: 'Delete Configuration',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete Configuration',
      rejectLabel: 'Keep Configuration',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.deleteConfiguration(),
    });
  }
}
