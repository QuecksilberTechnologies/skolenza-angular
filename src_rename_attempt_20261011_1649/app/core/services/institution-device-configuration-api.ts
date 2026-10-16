import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  ApplyInstitutionDeviceRuntimeConfigurationReq,
  CreateInstitutionDeviceConfigurationReq,
  DeviceMutationRes,
  DeviceSettingsMutationRes,
  DispatchMqttsNowReq,
  DispatchMqttsNowRes,
  GetDeviceGatewayAddressRes,
  GetInstitutionDeviceConfigurationRes,
  GetInstitutionDeviceConfigurationsReq,
  GetInstitutionDeviceConfigurationsRes,
  IssueBootstrapUrlReq,
  IssueBootstrapUrlRes,
  RebootInstitutionDeviceReq,
  ReplaceHttpsGatewayUrlReq,
  RotateHttpsIngressTokenReq,
  RotateHttpsIngressTokenRes,
  SyncInstitutionDeviceTimeReq,
  UpdateInstitutionDeviceAdvancedSettingsReq,
  UpdateInstitutionDeviceAppNotificationSettingsReq,
  UpdateInstitutionDeviceBellSettingsReq,
  UpdateInstitutionDeviceConfigurationReq,
  UpdateInstitutionDeviceEthernetSettingsReq,
  UpdateInstitutionDeviceLockSettingsReq,
  UpdateInstitutionDeviceSerialSettingsReq,
  UpdateInstitutionDeviceScreenMenuPinReq,
  UpdateInstitutionDeviceSetupSettingsReq,
  UpdateInstitutionDeviceTimeSettingsReq,
  UpdateInstitutionDeviceWebAccessReq,
  UpdateInstitutionDeviceWifiSettingsReq,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class InstitutionDeviceConfigurationApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/InstitutionDeviceConfiguration`;
  readonly #http = inject(HttpClient);

  getInstitutionDeviceConfigurations(
    req: GetInstitutionDeviceConfigurationsReq,
  ): Observable<GetInstitutionDeviceConfigurationsRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetInstitutionDeviceConfigurationsRes>(`${this.#apiUrl}/get-all`, { params })
      .pipe(
        catchError(
          this.handleError<GetInstitutionDeviceConfigurationsRes>('getInstitutionDeviceConfigurations'),
        ),
      );
  }

  /** Swagger marks `InstitutionId` optional, but the server answers 400 `A valid identifier is
   *  required.` without it. `get-all` is the exception — it takes the institution as a filter. */
  getInstitutionDeviceConfiguration(
    id: number,
    institutionId: string | null,
  ): Observable<GetInstitutionDeviceConfigurationRes> {
    const params = this.makeHttpParams({ InstitutionId: institutionId });
    return this.#http
      .get<GetInstitutionDeviceConfigurationRes>(`${this.#apiUrl}/get-by-id/${id}`, { params })
      .pipe(
        catchError(
          this.handleError<GetInstitutionDeviceConfigurationRes>('getInstitutionDeviceConfiguration'),
        ),
      );
  }

  addInstitutionDeviceConfiguration(
    body: CreateInstitutionDeviceConfigurationReq,
  ): Observable<DeviceMutationRes> {
    return this.#http
      .post<DeviceMutationRes>(`${this.#apiUrl}/create`, body)
      .pipe(catchError(this.handleError<DeviceMutationRes>('addInstitutionDeviceConfiguration')));
  }

  /** `/update` replaces the record, so the body has to carry every field, not just the changed ones. */
  updateInstitutionDeviceConfiguration(
    body: UpdateInstitutionDeviceConfigurationReq,
  ): Observable<DeviceMutationRes> {
    return this.#http
      .post<DeviceMutationRes>(`${this.#apiUrl}/update`, body)
      .pipe(catchError(this.handleError<DeviceMutationRes>('updateInstitutionDeviceConfiguration')));
  }

  /**
   * Mints the one-time bootstrap URL a new device needs to reach the server for the first time.
   *
   * The response body is the only place that URL ever appears — the API will not reissue it, so a
   * caller that drops it has to generate a fresh one.
   */
  issueBootstrapUrl(body: IssueBootstrapUrlReq): Observable<IssueBootstrapUrlRes> {
    return this.#http
      .post<IssueBootstrapUrlRes>(`${this.#apiUrl}/issue-bootstrap-url`, body)
      .pipe(catchError(this.handleError<IssueBootstrapUrlRes>('issueBootstrapUrl')));
  }

  /**
   * Reissues the gateway URL's bearer token. Like `issueBootstrapUrl`, the response is the only
   * place the new URL ever appears.
   */
  rotateHttpsIngressToken(
    body: RotateHttpsIngressTokenReq,
  ): Observable<RotateHttpsIngressTokenRes> {
    return this.#http
      .post<RotateHttpsIngressTokenRes>(`${this.#apiUrl}/rotate-https-ingress-token`, body)
      .pipe(catchError(this.handleError<RotateHttpsIngressTokenRes>('rotateHttpsIngressToken')));
  }

  /** `InstitutionId` is required here too — see `getInstitutionDeviceConfiguration`. */
  deleteInstitutionDeviceConfiguration(
    id: number,
    institutionId: string | null,
  ): Observable<DeviceMutationRes> {
    const params = this.makeHttpParams({ InstitutionId: institutionId });
    return this.#http
      .delete<DeviceMutationRes>(`${this.#apiUrl}/delete/${id}`, { params })
      .pipe(catchError(this.handleError<DeviceMutationRes>('deleteInstitutionDeviceConfiguration')));
  }

  /**
   * The `settings/*` pushes below all queue a setting to the device through its outbound gateway.
   * A `200` means **queued**, not applied - `DeviceSettingsMutationRes.data` carries the
   * `deviceCommandId`/`internalTrackingId`/`status` to track it, per
   * `docs/specs/InstitutionDeviceRuntimeSettingsUiHandoff.md`.
   */
  updateTimeSettings(
    body: UpdateInstitutionDeviceTimeSettingsReq,
  ): Observable<DeviceSettingsMutationRes> {
    return this.#http
      .post<DeviceSettingsMutationRes>(`${this.#apiUrl}/settings/time`, body)
      .pipe(catchError(this.handleError<DeviceSettingsMutationRes>('updateTimeSettings')));
  }

  syncTime(body: SyncInstitutionDeviceTimeReq): Observable<DeviceSettingsMutationRes> {
    return this.#http
      .post<DeviceSettingsMutationRes>(`${this.#apiUrl}/settings/time/sync`, body)
      .pipe(catchError(this.handleError<DeviceSettingsMutationRes>('syncTime')));
  }

  updateBellSettings(
    body: UpdateInstitutionDeviceBellSettingsReq,
  ): Observable<DeviceSettingsMutationRes> {
    return this.#http
      .post<DeviceSettingsMutationRes>(`${this.#apiUrl}/settings/bell`, body)
      .pipe(catchError(this.handleError<DeviceSettingsMutationRes>('updateBellSettings')));
  }

  updateDeviceSetupSettings(
    body: UpdateInstitutionDeviceSetupSettingsReq,
  ): Observable<DeviceSettingsMutationRes> {
    return this.#http
      .post<DeviceSettingsMutationRes>(`${this.#apiUrl}/settings/device-setup`, body)
      .pipe(catchError(this.handleError<DeviceSettingsMutationRes>('updateDeviceSetupSettings')));
  }

  updateAdvancedSettings(
    body: UpdateInstitutionDeviceAdvancedSettingsReq,
  ): Observable<DeviceSettingsMutationRes> {
    return this.#http
      .post<DeviceSettingsMutationRes>(`${this.#apiUrl}/settings/advanced`, body)
      .pipe(catchError(this.handleError<DeviceSettingsMutationRes>('updateAdvancedSettings')));
  }

  updateLockSettings(
    body: UpdateInstitutionDeviceLockSettingsReq,
  ): Observable<DeviceSettingsMutationRes> {
    return this.#http
      .post<DeviceSettingsMutationRes>(`${this.#apiUrl}/settings/lock`, body)
      .pipe(catchError(this.handleError<DeviceSettingsMutationRes>('updateLockSettings')));
  }

  updateSerialSettings(
    body: UpdateInstitutionDeviceSerialSettingsReq,
  ): Observable<DeviceSettingsMutationRes> {
    return this.#http
      .post<DeviceSettingsMutationRes>(`${this.#apiUrl}/settings/serial`, body)
      .pipe(catchError(this.handleError<DeviceSettingsMutationRes>('updateSerialSettings')));
  }

  updateEthernetSettings(
    body: UpdateInstitutionDeviceEthernetSettingsReq,
  ): Observable<DeviceSettingsMutationRes> {
    return this.#http
      .post<DeviceSettingsMutationRes>(`${this.#apiUrl}/settings/ethernet`, body)
      .pipe(catchError(this.handleError<DeviceSettingsMutationRes>('updateEthernetSettings')));
  }

  updateWifiSettings(
    body: UpdateInstitutionDeviceWifiSettingsReq,
  ): Observable<DeviceSettingsMutationRes> {
    return this.#http
      .post<DeviceSettingsMutationRes>(`${this.#apiUrl}/settings/wifi`, body)
      .pipe(catchError(this.handleError<DeviceSettingsMutationRes>('updateWifiSettings')));
  }

  updateAppNotificationSettings(
    body: UpdateInstitutionDeviceAppNotificationSettingsReq,
  ): Observable<DeviceSettingsMutationRes> {
    return this.#http
      .post<DeviceSettingsMutationRes>(`${this.#apiUrl}/settings/app-notification`, body)
      .pipe(
        catchError(this.handleError<DeviceSettingsMutationRes>('updateAppNotificationSettings')),
      );
  }

  updateWebAccessSettings(
    body: UpdateInstitutionDeviceWebAccessReq,
  ): Observable<DeviceSettingsMutationRes> {
    return this.#http
      .post<DeviceSettingsMutationRes>(`${this.#apiUrl}/settings/web-access`, body)
      .pipe(catchError(this.handleError<DeviceSettingsMutationRes>('updateWebAccessSettings')));
  }

  updateScreenMenuPinSettings(
    body: UpdateInstitutionDeviceScreenMenuPinReq,
  ): Observable<DeviceSettingsMutationRes> {
    return this.#http
      .post<DeviceSettingsMutationRes>(`${this.#apiUrl}/settings/screen-menu-pin`, body)
      .pipe(catchError(this.handleError<DeviceSettingsMutationRes>('updateScreenMenuPinSettings')));
  }

  applyRuntimeConfiguration(
    body: ApplyInstitutionDeviceRuntimeConfigurationReq,
  ): Observable<DeviceSettingsMutationRes> {
    return this.#http
      .post<DeviceSettingsMutationRes>(`${this.#apiUrl}/apply-runtime-configuration`, body)
      .pipe(catchError(this.handleError<DeviceSettingsMutationRes>('applyRuntimeConfiguration')));
  }

  /**
   * Safe gateway metadata for the connection card. Never returns the active gateway URL or its
   * bearer token, so the response is free to render.
   */
  getDeviceGatewayAddress(institutionDeviceId: string): Observable<GetDeviceGatewayAddressRes> {
    return this.#http
      .get<GetDeviceGatewayAddressRes>(`${this.#apiUrl}/gateway-address/${institutionDeviceId}`)
      .pipe(catchError(this.handleError<GetDeviceGatewayAddressRes>('getDeviceGatewayAddress')));
  }

  /**
   * Queues a remote gateway-address change. The old address keeps working until the device polls
   * the pending one, which is what makes this safe to run without visiting the device - unlike
   * `rotateHttpsIngressToken`, which revokes the old address immediately.
   */
  replaceHttpsGatewayUrl(body: ReplaceHttpsGatewayUrlReq): Observable<DeviceSettingsMutationRes> {
    return this.#http
      .post<DeviceSettingsMutationRes>(`${this.#apiUrl}/replace-https-gateway-url`, body)
      .pipe(catchError(this.handleError<DeviceSettingsMutationRes>('replaceHttpsGatewayUrl')));
  }

  /** MQTTS devices only. Publishes a command that is already in the queue; queues nothing new. */
  dispatchMqttsNow(body: DispatchMqttsNowReq): Observable<DispatchMqttsNowRes> {
    return this.#http
      .post<DispatchMqttsNowRes>(`${this.#apiUrl}/dispatch-mqtts-now`, body)
      .pipe(catchError(this.handleError<DispatchMqttsNowRes>('dispatchMqttsNow')));
  }

  rebootDevice(body: RebootInstitutionDeviceReq): Observable<DeviceSettingsMutationRes> {
    return this.#http
      .post<DeviceSettingsMutationRes>(`${this.#apiUrl}/reboot`, body)
      .pipe(catchError(this.handleError<DeviceSettingsMutationRes>('rebootDevice')));
  }
}
