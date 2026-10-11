import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import { DeviceDdlOptionsRes } from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class DeviceDdlOptionsApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/device-ddl-options`;
  readonly #http = inject(HttpClient);

  #get(section: string, operation: string): Observable<DeviceDdlOptionsRes> {
    return this.#http
      .get<DeviceDdlOptionsRes>(`${this.#apiUrl}/${section}`)
      .pipe(catchError(this.handleError<DeviceDdlOptionsRes>(operation)));
  }

  getTime(): Observable<DeviceDdlOptionsRes> {
    return this.#get('time', 'getTimeDdlOptions');
  }

  getBell(): Observable<DeviceDdlOptionsRes> {
    return this.#get('bell', 'getBellDdlOptions');
  }

  getDeviceSetup(): Observable<DeviceDdlOptionsRes> {
    return this.#get('device-setup', 'getDeviceSetupDdlOptions');
  }

  getAdvanced(): Observable<DeviceDdlOptionsRes> {
    return this.#get('advanced', 'getAdvancedDdlOptions');
  }

  getLock(): Observable<DeviceDdlOptionsRes> {
    return this.#get('lock', 'getLockDdlOptions');
  }

  getSerial(): Observable<DeviceDdlOptionsRes> {
    return this.#get('serial', 'getSerialDdlOptions');
  }

  getEthernet(): Observable<DeviceDdlOptionsRes> {
    return this.#get('ethernet', 'getEthernetDdlOptions');
  }

  getWifi(): Observable<DeviceDdlOptionsRes> {
    return this.#get('wifi', 'getWifiDdlOptions');
  }

  getAppNotification(): Observable<DeviceDdlOptionsRes> {
    return this.#get('app-notification', 'getAppNotificationDdlOptions');
  }

  /** Credential types accepted by `StaffMemberDeviceEnrollment/credential/remove`. */
  getStaffMemberDeviceCredentials(): Observable<DeviceDdlOptionsRes> {
    return this.#get('staff-member-device-credentials', 'getStaffMemberDeviceCredentialsDdlOptions');
  }

  /** Monday-first working-day options for the enrollment access-window editor. */
  getStaffMemberDeviceAccessWindows(): Observable<DeviceDdlOptionsRes> {
    return this.#get('staff-member-device-access-windows', 'getStaffMemberDeviceAccessWindowsDdlOptions');
  }

  /** Tax treatment and card-status filter options for the Institution Card Inventory screens. */
  getInstitutionCardInventory(): Observable<DeviceDdlOptionsRes> {
    return this.#get('institution-card-inventory', 'getInstitutionCardInventoryDdlOptions');
  }
}
