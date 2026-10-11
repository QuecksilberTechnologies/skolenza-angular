import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { AttendanceApi } from '@core/services/attendance-api';
import { ApiError } from '@core/services/base-service';
import { Common } from '@core/services/common';
import {
  AttendanceDeviceTypeOption,
  AttendancePunchAction,
  AttendanceToday,
  MarkAttendanceReq,
} from '@shared/interfaces';

import { AuthStore } from './auth.store';
import { CheckInStore } from './checkin.store';

const DEVICE_TYPES: AttendanceDeviceTypeOption[] = [
  { id: 7, code: 'MOBILE', name: 'Mobile', requiresDeviceRegistration: false },
  { id: 9, code: 'WEB', name: 'Web', requiresDeviceRegistration: false },
];

const punch = (id: number, action: AttendancePunchAction, occurredAtUtc: string) => ({
  id,
  action,
  attendanceDeviceTypeId: 9,
  attendanceDeviceTypeCode: 'WEB',
  attendanceDeviceType: 'Web',
  occurredAtUtc,
  campusId: null,
});

const localTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

describe('CheckInStore', () => {
  let today: AttendanceToday;
  let api: {
    getToday: ReturnType<typeof vi.fn>;
    getDeviceTypes: ReturnType<typeof vi.fn>;
    markAttendance: ReturnType<typeof vi.fn>;
  };
  let showMessage: ReturnType<typeof vi.fn>;
  let auth: {
    isLoggedIn: ReturnType<typeof signal<boolean>>;
    isHost: ReturnType<typeof signal<boolean>>;
    user: ReturnType<typeof signal<{ staffMemberId: string } | null>>;
  };

  async function setup(): Promise<InstanceType<typeof CheckInStore>> {
    TestBed.configureTestingModule({
      providers: [
        { provide: AttendanceApi, useValue: api },
        { provide: Common, useValue: { showMessage } },
        { provide: AuthStore, useValue: auth },
      ],
    });
    const store = TestBed.inject(CheckInStore);
    await TestBed.inject(ApplicationRef).whenStable();
    return store;
  }

  beforeEach(() => {
    today = { workDate: '2026-10-07', isCurrentlyCheckedIn: false, punches: [] };
    api = {
      getToday: vi.fn(() => of({ isSucceeded: true, message: '', data: today })),
      getDeviceTypes: vi.fn(() => of({ isSucceeded: true, message: '', data: DEVICE_TYPES })),
      markAttendance: vi.fn(() => of({ isSucceeded: true, message: 'ok', data: null })),
    };
    showMessage = vi.fn();
    auth = {
      isLoggedIn: signal(true),
      isHost: signal(false),
      user: signal<{ staffMemberId: string } | null>({ staffMemberId: 'emp-1' }),
    };
    // jsdom has no geolocation; the punch goes out without coordinates.
    vi.stubGlobal('navigator', { ...navigator, geolocation: undefined });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('loads nothing for a host', async () => {
    auth.isHost.set(true);
    const store = await setup();

    expect(api.getToday).not.toHaveBeenCalled();
    expect(api.getDeviceTypes).not.toHaveBeenCalled();
    expect(store.isClockedIn()).toBe(false);
  });

  it('loads nothing before login', async () => {
    auth.isLoggedIn.set(false);
    await setup();

    expect(api.getToday).not.toHaveBeenCalled();
  });

  it('reads check-in state and first check-in / last check-out from /today', async () => {
    today = {
      workDate: '2026-10-07',
      isCurrentlyCheckedIn: false,
      punches: [
        punch(1, AttendancePunchAction.CheckIn, '2026-10-07T03:30:00Z'),
        punch(2, AttendancePunchAction.CheckOut, '2026-10-07T07:00:00Z'),
        punch(3, AttendancePunchAction.CheckIn, '2026-10-07T08:00:00Z'),
        punch(4, AttendancePunchAction.CheckOut, '2026-10-07T12:15:00'),
      ],
    };
    const store = await setup();

    expect(store.isClockedIn()).toBe(false);
    expect(store.buttonLabel()).toBe('Check In');
    expect(store.clockInTime()).toBe(localTime('2026-10-07T03:30:00Z'));
    // An offset-less timestamp is UTC, not local.
    expect(store.clockOutTime()).toBe(localTime('2026-10-07T12:15:00Z'));
  });

  it("labels the work date Today when it is the viewer's date, else shows the date", async () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    today = {
      workDate: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      isCurrentlyCheckedIn: false,
      punches: [],
    };
    const store = await setup();
    expect(store.workDateLabel()).toBe('Today');

    today = { workDate: '2026-01-15', isCurrentlyCheckedIn: false, punches: [] };
    TestBed.resetTestingModule();
    const other = await setup();
    expect(other.workDateLabel()).toBe(
      new Date(2026, 0, 15).toLocaleDateString([], { day: 'numeric', month: 'short' }),
    );
  });

  it('falls back to getRandomValues for the key outside a secure context', async () => {
    const realCrypto = globalThis.crypto;
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array<ArrayBuffer>) => realCrypto.getRandomValues(bytes),
      randomUUID: undefined,
    });
    const store = await setup();

    await store.toggle();

    const body = api.markAttendance.mock.calls[0][0] as MarkAttendanceReq;
    expect(body.idempotencyKey).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('keeps showing the last check-out after checking in again', async () => {
    today = {
      workDate: '2026-10-07',
      isCurrentlyCheckedIn: true,
      punches: [
        punch(1, AttendancePunchAction.CheckIn, '2026-10-07T03:30:00Z'),
        punch(2, AttendancePunchAction.CheckOut, '2026-10-07T07:00:00Z'),
        punch(3, AttendancePunchAction.CheckIn, '2026-10-07T08:00:00Z'),
      ],
    };
    const store = await setup();

    expect(store.isClockedIn()).toBe(true);
    expect(store.buttonLabel()).toBe('Check Out');
    expect(store.buttonSeverity()).toBe('success');
    expect(store.punchCount()).toBe(3);
    expect(store.clockOutTime()).toBe(localTime('2026-10-07T07:00:00Z'));
  });

  it('checks in with the WEB device type id from the lookup and reloads today', async () => {
    const store = await setup();
    expect(api.getToday).toHaveBeenCalledTimes(1);

    await store.toggle();
    await TestBed.inject(ApplicationRef).whenStable();

    const body = api.markAttendance.mock.calls[0][0] as MarkAttendanceReq;
    expect(body.action).toBe(AttendancePunchAction.CheckIn);
    expect(body.attendanceDeviceTypeId).toBe(9);
    expect(body.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.latitude).toBeUndefined();
    expect(body.campusId).toBeUndefined();
    expect(api.getToday).toHaveBeenCalledTimes(2);
    expect(showMessage).toHaveBeenCalledWith('Checked in successfully.', 'success');
    expect(store.isSubmitting()).toBe(false);
  });

  it('checks out when currently checked in, with a fresh idempotency key per press', async () => {
    today = { workDate: '2026-10-07', isCurrentlyCheckedIn: true, punches: [] };
    const store = await setup();

    await store.toggle();
    await TestBed.inject(ApplicationRef).whenStable();
    await store.toggle();

    const [first, second] = api.markAttendance.mock.calls.map(
      ([body]) => body as MarkAttendanceReq,
    );
    expect(first.action).toBe(AttendancePunchAction.CheckOut);
    expect(first.idempotencyKey).not.toBe(second.idempotencyKey);
  });

  it('sends coordinates together when the browser grants a position', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (ok: PositionCallback) =>
          ok({
            coords: { latitude: 23.18, longitude: 79.98, accuracy: 18.5 },
          } as GeolocationPosition),
      },
    });
    const store = await setup();

    await store.toggle();

    const body = api.markAttendance.mock.calls[0][0] as MarkAttendanceReq;
    expect(body).toMatchObject({ latitude: 23.18, longitude: 79.98, accuracyMeters: 18.5 });
  });

  it('shows the API message and keeps state when the punch is rejected', async () => {
    api.markAttendance.mockReturnValue(
      of({ isSucceeded: false, message: 'You are outside the allowed location.', data: null }),
    );
    const store = await setup();

    await store.toggle();

    expect(showMessage).toHaveBeenCalledWith('You are outside the allowed location.', 'error');
    expect(api.getToday).toHaveBeenCalledTimes(1);
    expect(store.isSubmitting()).toBe(false);
  });

  it('shows the HTTP error message when the punch fails', async () => {
    api.markAttendance.mockReturnValue(throwError(() => new ApiError('Already checked in.', 409)));
    const store = await setup();

    await store.toggle();

    expect(showMessage).toHaveBeenCalledWith('Already checked in.', 'error');
    expect(store.isSubmitting()).toBe(false);
  });

  const keysSent = () =>
    api.markAttendance.mock.calls.map(([body]) => (body as MarkAttendanceReq).idempotencyKey);

  it('reuses the idempotency key when retrying an unanswered punch', async () => {
    api.markAttendance.mockReturnValueOnce(throwError(() => new ApiError('Timed out.', 0)));
    const store = await setup();

    await store.toggle();
    await store.toggle();

    const [first, retry] = keysSent();
    expect(retry).toBe(first);
    expect(store.pendingPunch()).toBeNull();
  });

  it('spends the key once the server has answered, even with an error', async () => {
    api.markAttendance.mockReturnValueOnce(
      throwError(() => new ApiError('Outside the geofence.', 400)),
    );
    const store = await setup();

    await store.toggle();
    await store.toggle();

    const [first, second] = keysSent();
    expect(second).not.toBe(first);
  });

  it('treats a press long after an unanswered punch as a new punch', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    api.markAttendance.mockReturnValueOnce(throwError(() => new ApiError('Timed out.', 504)));
    const store = await setup();

    await store.toggle();
    now.mockReturnValue(1_000_000 + 6 * 60_000);
    await store.toggle();

    const [first, second] = keysSent();
    expect(second).not.toBe(first);
    now.mockRestore();
  });

  it('flags a failed /today load instead of reading it as not checked in, and retries on press', async () => {
    api.getToday.mockReturnValueOnce(throwError(() => new ApiError('Server error', 500)));
    const store = await setup();

    expect(store.hasLoadFailed()).toBe(true);

    await store.toggle();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(api.markAttendance).not.toHaveBeenCalled();
    expect(api.getToday).toHaveBeenCalledTimes(2);
    expect(store.hasLoadFailed()).toBe(false);
  });

  it('retries a failed device-types lookup on press', async () => {
    api.getDeviceTypes.mockReturnValueOnce(
      of({ isSucceeded: false, message: 'Lookup failed', data: null }),
    );
    const store = await setup();

    await store.toggle();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(api.markAttendance).not.toHaveBeenCalled();
    expect(api.getDeviceTypes).toHaveBeenCalledTimes(2);
    expect(store.webDeviceType()?.id).toBe(9);
  });

  it('refuses to punch when the lookup has no WEB device type', async () => {
    api.getDeviceTypes.mockReturnValue(
      of({ isSucceeded: true, message: '', data: [DEVICE_TYPES[0]] }),
    );
    const store = await setup();

    await store.toggle();

    expect(api.markAttendance).not.toHaveBeenCalled();
    expect(showMessage).toHaveBeenCalledWith(expect.stringContaining('not available'), 'error');
  });
});
