import { computed, DestroyRef, inject } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { finalize, map, Observable, tap } from 'rxjs';

import { Common, DeviceDdlOptionsApi, InstitutionDeviceConfigurationApi } from '@core/services';
import {
  DeviceCommunicationType,
  DeviceDdlOptionSection,
  DeviceDdlOptionValue,
  DeviceDdlOptionsRes,
  DeviceGatewayAddress,
  InstitutionDeviceConfigurationRow,
} from '@shared/interfaces';

/** The 9 sections backed by `device-ddl-options/*`. `webAccess` / `screenMenuPin` have no dropdown
 *  data and are not part of this union - see `device-settings.ts`. */
export type DeviceSettingsSection =
  | 'time'
  | 'bell'
  | 'deviceSetup'
  | 'advanced'
  | 'lock'
  | 'serial'
  | 'ethernet'
  | 'wifi'
  | 'appNotification';

const DDL_REQUEST_BY_SECTION: Record<
  DeviceSettingsSection,
  (api: DeviceDdlOptionsApi) => Observable<DeviceDdlOptionsRes>
> = {
  time: (api) => api.getTime(),
  bell: (api) => api.getBell(),
  deviceSetup: (api) => api.getDeviceSetup(),
  advanced: (api) => api.getAdvanced(),
  lock: (api) => api.getLock(),
  serial: (api) => api.getSerial(),
  ethernet: (api) => api.getEthernet(),
  wifi: (api) => api.getWifi(),
  appNotification: (api) => api.getAppNotification(),
};

interface DeviceSettingsState {
  institutionId: string | null;
  institutionDeviceId: string | null;
  currentWebServerPassword: string | null;
  activeSection: DeviceSettingsSection;
  isDispatchingMqtts: boolean;
}

const initialState: DeviceSettingsState = {
  institutionId: null,
  institutionDeviceId: null,
  currentWebServerPassword: null,
  activeSection: 'time',
  isDispatchingMqtts: false,
};

export const DeviceSettingsStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const ddlOptionsApi = inject(DeviceDdlOptionsApi);
    const configurationApi = inject(InstitutionDeviceConfigurationApi);
    const commonService = inject(Common);

    // The DDL option lists are generic - not scoped to a device - so each tab only ever fetches
    // its own section once, on first activation.
    const ddlOptionsResource = rxResource({
      params: () => store.activeSection(),
      stream: ({ params: section }) =>
        DDL_REQUEST_BY_SECTION[section](ddlOptionsApi).pipe(
          tap((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
          }),
          map((res): DeviceDdlOptionSection[] => (res.isSucceeded ? res.data : [])),
        ),
    });

    // The connection telemetry (heartbeat/connection errors) - refetched once after a settings
    // push queues successfully, per the handoff doc's "refresh configuration telemetry" rule. Idle
    // until a device id is known.
    const configurationResource = rxResource({
      params: () => store.institutionDeviceId() ?? undefined,
      stream: ({ params: institutionDeviceId }) =>
        configurationApi
          .getInstitutionDeviceConfigurations({ InstitutionDeviceId: institutionDeviceId, PageSize: 1 })
          .pipe(map((res): InstitutionDeviceConfigurationRow | null => res.data?.[0] ?? null)),
    });

    // Safe gateway metadata for the connection strip: base address plus whether a remote
    // replacement is still waiting for the device to pick it up. Carries no URL or token, so it
    // is free to render. Idle until a device id is known, same as the telemetry read.
    const gatewayAddressResource = rxResource({
      params: () => store.institutionDeviceId() ?? undefined,
      stream: ({ params: institutionDeviceId }) =>
        configurationApi
          .getDeviceGatewayAddress(institutionDeviceId)
          .pipe(map((res): DeviceGatewayAddress | null => (res.isSucceeded ? res.data : null))),
    });

    return { ddlOptionsResource, configurationResource, gatewayAddressResource };
  }),
  withComputed(({ ddlOptionsResource, configurationResource, gatewayAddressResource }) => ({
    ddlOptions: computed(() => ddlOptionsResource.value() ?? []),
    isLoadingOptions: computed(() => ddlOptionsResource.isLoading()),
    telemetry: computed(() => configurationResource.value() ?? null),
    /** Distinguishes "still checking" from "confirmed no configuration exists yet", so the page
     *  does not flash the create-connection form before the read resolves. */
    isLoadingConfiguration: computed(() => configurationResource.isLoading()),
    gatewayAddress: computed(() => gatewayAddressResource.value() ?? null),
    /** Only MQTTS devices may dispatch by hand; an HTTPS queue drains on the next heartbeat. */
    isMqttsDevice: computed(
      () => configurationResource.value()?.communicationType === DeviceCommunicationType.Mqtts,
    ),
  })),
  withMethods((store) => {
    const configurationApi = inject(InstitutionDeviceConfigurationApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    return {
      setDeviceContext(institutionId: string | null, institutionDeviceId: string | null): void {
        patchState(store, { institutionId, institutionDeviceId });
      },

      reloadTelemetry(): void {
        store.configurationResource.reload();
      },

      reloadGatewayAddress(): void {
        store.gatewayAddressResource.reload();
      },

      /**
       * Publishes a command the device already has queued. Sends no command of its own, so there is
       * nothing to confirm beyond the click - and `wasDispatched: false` is a real outcome, not an
       * error, which is why the message is read off the response rather than assumed.
       */
      dispatchMqttsNow(): void {
        const institutionId = store.institutionId();
        const institutionDeviceId = store.institutionDeviceId();
        if (!institutionId || !institutionDeviceId || store.isDispatchingMqtts()) {
          return;
        }

        patchState(store, { isDispatchingMqtts: true });

        configurationApi
          .dispatchMqttsNow({ institutionId, institutionDeviceId })
          .pipe(
            finalize(() => patchState(store, { isDispatchingMqtts: false })),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              const dispatched = res.isSucceeded && res.data?.wasDispatched === true;
              commonService.showMessage(
                res.message ||
                  (dispatched ? 'Command published.' : 'Nothing was queued for this device.'),
                dispatched ? 'success' : 'info',
              );
              if (res.isSucceeded) {
                store.configurationResource.reload();
              }
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      setCurrentWebServerPassword(currentWebServerPassword: string | null): void {
        patchState(store, { currentWebServerPassword });
      },

      setActiveSection(activeSection: DeviceSettingsSection): void {
        patchState(store, { activeSection });
      },

      /** A section reads its own dropdown list off the shared response by `key`, e.g. `timeFormat`. */
      optionsFor(key: string): DeviceDdlOptionValue[] {
        return store.ddlOptions().find((section) => section.key === key)?.options ?? [];
      },

      /** Deleting flips the page back to the create-connection state via `reloadTelemetry`. */
      deleteConfiguration(): void {
        const configuration = store.telemetry();
        const institutionId = store.institutionId();
        if (!configuration || !institutionId) {
          return;
        }

        configurationApi
          .deleteInstitutionDeviceConfiguration(configuration.id, institutionId)
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (res) => {
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
              if (res.isSucceeded) {
                store.configurationResource.reload();
              }
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },
    };
  }),
);
