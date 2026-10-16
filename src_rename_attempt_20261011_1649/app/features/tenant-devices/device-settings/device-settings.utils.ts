import { DeviceSettingsMutationRes } from '@shared/interfaces';

/** Empty strings go to the API as `null`, which is what the nullable DTO fields expect. */
export const nullable = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/**
 * `Ethernet`/`WiFi` model their static fields as optional (`?:`), not nullable, so a blank value
 * must be omitted from the request body entirely rather than sent as `null`.
 */
export const undefinedIfBlank = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

/**
 * A successful push only means **queued** - see `docs/specs/InstitutionDeviceRuntimeSettingsUiHandoff.md`
 * ("A successful settings API result means queued, not necessarily applied... Display
 * `internalTrackingId` as the user-support reference"). Every card's toast goes through this so the
 * tracking id is never silently dropped.
 */
export const queuedResultMessage = (res: DeviceSettingsMutationRes): string =>
  res.isSucceeded && res.data
    ? `${res.message} (ref: ${res.data.internalTrackingId})`
    : res.message;
