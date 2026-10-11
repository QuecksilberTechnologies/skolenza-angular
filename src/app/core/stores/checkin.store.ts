import { computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { firstValueFrom, map } from 'rxjs';

import { AttendanceApi } from '@core/services/attendance-api';
import { ApiError } from '@core/services/base-service';
import { Common } from '@core/services/common';
import { AttendancePunchAction, AttendancePunchItem, MarkAttendanceReq } from '@shared/interfaces';

import { AuthStore } from './auth.store';

/** A punch sent but never answered. Its key is reused when the same action is retried. */
interface PendingPunch {
  action: AttendancePunchAction;
  idempotencyKey: string;
  sentAt: number;
}

interface CheckInState {
  isSubmitting: boolean;
  pendingPunch: PendingPunch | null;
}

const initialState: CheckInState = {
  isSubmitting: false,
  pendingPunch: null,
};

/** How long a punch waits on the browser's location prompt before going out without GPS. */
const GEOLOCATION_TIMEOUT_MS = 10_000;

/**
 * How long an unanswered punch stays retryable. A press after this is a new punch, not a retry,
 * so a key never outlives the moment it was meant for (or the session that sent it).
 */
const PENDING_PUNCH_TTL_MS = 5 * 60_000;

/** Upper bound of the API's `[Range(0, 10000)] AccuracyMeters` — a coarser fix is clamped to it. */
const MAX_ACCURACY_METERS = 10_000;

/**
 * Statuses that leave a punch's outcome unknown: no response (0), or a gateway/timeout answer.
 * Any other response is the server's verdict, so the key is spent.
 */
const UNANSWERED_STATUSES = new Set([0, 408, 502, 503, 504]);

type PunchPosition = Pick<MarkAttendanceReq, 'latitude' | 'longitude' | 'accuracyMeters'>;

/**
 * Best-effort GPS fix. Policy decides server-side whether GPS is required, which the UI cannot
 * see, so a denied prompt or a missing API sends the punch without coordinates and lets the API
 * answer with its own "GPS required" message.
 */
function readPosition(): Promise<PunchPosition> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve({});

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracyMeters: Math.min(coords.accuracy, MAX_ACCURACY_METERS),
        }),
      () => resolve({}),
      { enableHighAccuracy: true, timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: 0 },
    );
  });
}

/** `HH:mm` in the viewer's local time, from a server UTC timestamp. */
function formatPunchTime(punch: AttendancePunchItem | undefined): string | null {
  if (!punch) return null;
  // The API serialises `DateTime` without an offset when its Kind is unspecified — it is UTC.
  const iso = /Z|[+-]\d{2}:\d{2}$/.test(punch.occurredAtUtc)
    ? punch.occurredAtUtc
    : `${punch.occurredAtUtc}Z`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

/**
 * A v4 UUID. `crypto.randomUUID()` exists only in secure contexts (HTTPS, localhost), so a plain-HTTP
 * host falls back to `getRandomValues()`, which has no such restriction.
 */
function newIdempotencyKey(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * "Today" when the server's business date is the viewer's own date, else that date. They differ
 * when the punch location's timezone has already crossed midnight and the viewer's has not.
 */
function formatWorkDate(workDate: string): string {
  const now = new Date();
  const localDate = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  if (workDate === localDate) return 'Today';

  const [year, month, day] = workDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime())
    ? workDate
    : date.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function isUnanswered(error: unknown): boolean {
  return !(error instanceof ApiError) || UNANSWERED_STATUSES.has(error.status);
}

/**
 * The signed-in staffMember's attendance for today, backed by `/api/Attendance`.
 *
 * Root-scoped: the header button, the profile summary and the dashboard card all read the same
 * punch state. Nothing loads for a host or before login — a host has no attendance.
 */
export const CheckInStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withProps(() => {
    const authStore = inject(AuthStore);
    const attendanceApi = inject(AttendanceApi);

    // Keyed on the staffMember so a logout/login as someone else refetches instead of reusing.
    const sessionParams = (): { staffMemberId: string } | undefined => {
      const staffMemberId = authStore.user()?.staffMemberId;
      return authStore.isLoggedIn() && !authStore.isHost() && staffMemberId
        ? { staffMemberId }
        : undefined;
    };

    // Failures stay in the resource's `error` state rather than collapsing to an empty value:
    // a failed `/today` must not read as "not checked in".
    return {
      _todayResource: rxResource({
        params: sessionParams,
        stream: () =>
          attendanceApi.getToday().pipe(
            map((res) => {
              if (!res.isSucceeded || !res.data) throw new Error(res.message);
              return res.data;
            }),
          ),
      }),
      _deviceTypesResource: rxResource({
        params: sessionParams,
        stream: () =>
          attendanceApi.getDeviceTypes().pipe(
            map((res) => {
              if (!res.isSucceeded) throw new Error(res.message);
              return res.data ?? [];
            }),
          ),
      }),
    };
  }),
  withComputed(({ _todayResource, _deviceTypesResource, isSubmitting }) => {
    const today = computed(() => (_todayResource.hasValue() ? _todayResource.value() : null));
    const punches = computed(() => today()?.punches ?? []);
    const isClockedIn = computed(() => today()?.isCurrentlyCheckedIn ?? false);
    const clockInTime = computed(() =>
      formatPunchTime(punches().find((p) => p.action === AttendancePunchAction.CheckIn)),
    );

    return {
      isClockedIn,
      isLoading: computed(() => _todayResource.isLoading()),
      hasLoadFailed: computed(
        () => _todayResource.status() === 'error' || _deviceTypesResource.status() === 'error',
      ),
      isBusy: computed(() => isSubmitting() || _todayResource.isLoading()),
      webDeviceType: computed(() =>
        (_deviceTypesResource.hasValue() ? _deviceTypesResource.value() : []).find(
          (type) => type.code === 'WEB',
        ),
      ),
      punchCount: computed(() => punches().length),
      workDateLabel: computed(() => {
        const workDate = today()?.workDate;
        return workDate ? formatWorkDate(workDate) : 'Today';
      }),
      hasCheckedInToday: computed(() => clockInTime() !== null),
      /** First check-in of the work date. */
      clockInTime,
      /** Latest check-out of the work date. */
      clockOutTime: computed(() =>
        formatPunchTime(
          punches()
            .filter((p) => p.action === AttendancePunchAction.CheckOut)
            .at(-1),
        ),
      ),
      buttonLabel: computed(() => (isClockedIn() ? 'Check Out' : 'Check In')),
      buttonIcon: computed(() => (isClockedIn() ? 'pi pi-sign-out' : 'pi pi-sign-in')),
      // Colour follows the current state, the label names the action.
      buttonSeverity: computed(() => (isClockedIn() ? ('success' as const) : ('danger' as const))),
    };
  }),
  withMethods((store) => {
    const attendanceApi = inject(AttendanceApi);
    const commonService = inject(Common);

    /** Refetches whichever lookup failed. Returns whether anything had. */
    const retryFailedLoads = (): boolean => {
      let retried = false;
      if (store._todayResource.status() === 'error') {
        store._todayResource.reload();
        retried = true;
      }
      if (store._deviceTypesResource.status() === 'error') {
        store._deviceTypesResource.reload();
        retried = true;
      }
      return retried;
    };

    return {
      /** Punches the opposite of the current state. Repeat presses are ignored until it settles. */
      async toggle(): Promise<void> {
        if (store.isBusy()) return;

        if (retryFailedLoads()) {
          commonService.showMessage(
            "Could not load today's attendance. Reloading, please try again.",
            'error',
          );
          return;
        }

        const deviceType = store.webDeviceType();
        if (!deviceType) {
          commonService.showMessage(
            'Web attendance is not available right now. Please try again later.',
            'error',
          );
          return;
        }

        const action = store.isClockedIn()
          ? AttendancePunchAction.CheckOut
          : AttendancePunchAction.CheckIn;
        // Retrying an unanswered punch must reuse its key so the server can deduplicate it.
        const pending = store.pendingPunch();
        const isRetry =
          pending?.action === action && Date.now() - pending.sentAt < PENDING_PUNCH_TTL_MS;
        const punch: PendingPunch = isRetry
          ? pending
          : { action, idempotencyKey: newIdempotencyKey(), sentAt: Date.now() };

        patchState(store, { isSubmitting: true, pendingPunch: punch });
        try {
          const position = await readPosition();
          const res = await firstValueFrom(
            attendanceApi.markAttendance({
              action,
              attendanceDeviceTypeId: deviceType.id,
              ...position,
              clientOccurredAt: new Date().toISOString(),
              idempotencyKey: punch.idempotencyKey,
            }),
          );
          patchState(store, { pendingPunch: null });

          if (!res.isSucceeded) {
            commonService.showMessage(res.message, 'error');
            return;
          }

          commonService.showMessage(
            action === AttendancePunchAction.CheckIn
              ? 'Checked in successfully.'
              : 'Checked out successfully.',
            'success',
          );
          store._todayResource.reload();
        } catch (error) {
          if (!isUnanswered(error)) patchState(store, { pendingPunch: null });
          commonService.showMessage(
            error instanceof Error ? error.message : 'Could not record attendance.',
            'error',
          );
        } finally {
          patchState(store, { isSubmitting: false });
        }
      },
    };
  }),
);
