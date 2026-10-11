import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DeviceDdlOptionsApi } from './device-ddl-options-api';
import { DeviceMasterApi } from './device-master-api';
import { StaffMemberDeviceEnrollmentApi } from './staff-member-device-enrollment-api';
import { InstitutionDeviceApi } from './institution-device-api';
import { InstitutionDeviceConfigurationApi } from './institution-device-configuration-api';

/**
 * The routes added for the device and enrollment gap. Only the wire shape is asserted - which URL,
 * which verb, and which of `institutionId` / `institutionDeviceId` / `currentWebServerPassword` travels where
 * - because that is what the handoff doc pins down and what a refactor can silently break.
 */
describe('device operations routes', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('InstitutionDeviceConfigurationApi', () => {
    let api: InstitutionDeviceConfigurationApi;

    beforeEach(() => {
      api = TestBed.inject(InstitutionDeviceConfigurationApi);
    });

    it('reads the gateway address by device id on the path', () => {
      api.getDeviceGatewayAddress('device-1').subscribe();

      const request = httpMock.expectOne((req) =>
        req.url.endsWith('/InstitutionDeviceConfiguration/gateway-address/device-1'),
      );
      expect(request.request.method).toBe('GET');
      request.flush({ isSucceeded: true, message: 'ok', data: null });
    });

    it('sends the device password and the replacement lifetime when replacing a gateway URL', () => {
      api
        .replaceHttpsGatewayUrl({
          institutionId: 'institution-1',
          institutionDeviceId: 'device-1',
          currentWebServerPassword: 'secret',
          replacementLifetimeMinutes: 30,
        })
        .subscribe();

      const request = httpMock.expectOne((req) =>
        req.url.endsWith('/InstitutionDeviceConfiguration/replace-https-gateway-url'),
      );
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({
        institutionId: 'institution-1',
        institutionDeviceId: 'device-1',
        currentWebServerPassword: 'secret',
        replacementLifetimeMinutes: 30,
      });
      request.flush({ isSucceeded: true, message: 'Queued', data: null });
    });

    it('dispatches MQTTS with the device identity alone, and no command or credential', () => {
      api.dispatchMqttsNow({ institutionId: 'institution-1', institutionDeviceId: 'device-1' }).subscribe();

      const request = httpMock.expectOne((req) =>
        req.url.endsWith('/InstitutionDeviceConfiguration/dispatch-mqtts-now'),
      );
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ institutionId: 'institution-1', institutionDeviceId: 'device-1' });
      request.flush({ isSucceeded: true, message: 'Published', data: { wasDispatched: true } });
    });
  });

  it('moves a device with the opaque device id, never the numeric row id', () => {
    const api = TestBed.inject(InstitutionDeviceApi);

    api
      .updateInstitutionDeviceLocation({
        institutionId: 'institution-1',
        institutionDeviceId: 'device-1',
        campusId: 20,
      })
      .subscribe();

    const request = httpMock.expectOne((req) => req.url.endsWith('/InstitutionDevice/update-location'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      institutionId: 'institution-1',
      institutionDeviceId: 'device-1',
      campusId: 20,
    });
    request.flush({ isSucceeded: true, message: 'Moved', data: null });
  });

  it('escapes a serial number that is not URL safe', () => {
    const api = TestBed.inject(DeviceMasterApi);

    api.getDeviceMasterBySerial('ZK/SF V5L').subscribe();

    const request = httpMock.expectOne((req) =>
      req.url.endsWith('/DeviceMaster/get-info-by-sno/ZK%2FSF%20V5L'),
    );
    expect(request.request.method).toBe('GET');
    request.flush({ isSucceeded: true, message: 'ok', data: null });
  });

  describe('StaffMemberDeviceEnrollmentApi', () => {
    let api: StaffMemberDeviceEnrollmentApi;

    beforeEach(() => {
      api = TestBed.inject(StaffMemberDeviceEnrollmentApi);
    });

    it('posts the face image as multipart, untouched', () => {
      const body = new FormData();
      body.append('enrollmentId', 'enrollment-1');
      body.append('faceImage', new Blob([''], { type: 'image/jpeg' }), 'face.jpg');

      api.upsertStaffMemberDeviceFace(body).subscribe();

      const request = httpMock.expectOne((req) =>
        req.url.endsWith('/StaffDeviceEnrollment/face/upsert'),
      );
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toBe(body);
      request.flush({ isSucceeded: true, message: 'Queued', data: null });
    });

    it('posts the PIN as JSON and sends nothing else with it', () => {
      api.upsertStaffMemberDevicePin({ enrollmentId: 'enrollment-1', pin: '1234' }).subscribe();

      const request = httpMock.expectOne((req) =>
        req.url.endsWith('/StaffDeviceEnrollment/pin/upsert'),
      );
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ enrollmentId: 'enrollment-1', pin: '1234' });
      request.flush({ isSucceeded: true, message: 'Queued', data: null });
    });
  });

  it('reads the access-window day options off their own ddl section', () => {
    const api = TestBed.inject(DeviceDdlOptionsApi);

    api.getStaffMemberDeviceAccessWindows().subscribe();

    const request = httpMock.expectOne((req) =>
      req.url.endsWith('/device-ddl-options/staff-member-device-access-windows'),
    );
    expect(request.request.method).toBe('GET');
    request.flush({ isSucceeded: true, message: 'ok', data: [] });
  });
});

