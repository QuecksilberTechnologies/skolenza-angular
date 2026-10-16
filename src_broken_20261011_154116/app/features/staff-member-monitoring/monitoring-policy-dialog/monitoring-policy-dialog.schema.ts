import * as z from 'zod';

const wholeNumber = (label: string, min: number, max?: number) => {
  const range = max === undefined ? `at least ${min}` : `between ${min} and ${max}`;
  const base = z
    .number()
    .int(`${label} must be a whole number`)
    .min(min, `${label} must be ${range}`);
  return (max === undefined ? base : base.max(max, `${label} must be ${range}`))
    .nullable()
    .refine((value) => value !== null, `${label} is required`);
};

/** `[field, floor, message, allowEqual]`: the server requires `field` to be above `floor`. */
const ORDER = [
  [
    'maximumCaptureIntervalSeconds',
    'minimumCaptureIntervalSeconds',
    'Maximum interval cannot be below the minimum',
    true,
  ],
  [
    'delayedAfterSeconds',
    'heartbeatIntervalSeconds',
    'Delayed after must be longer than the heartbeat interval',
    false,
  ],
  [
    'unreachableAfterSeconds',
    'delayedAfterSeconds',
    'Unreachable after must be longer than delayed after',
    false,
  ],
] as const;

/**
 * Mirrors `UpsertStaffMemberMonitoringPolicyCommandHandler.ValidatePolicy`, so a request the
 * server would reject never leaves the dialog. Storage is entered in GB and converted to the
 * `maximumOfflineBytes` the API takes on submit.
 */
export const monitoringPolicySchema = z
  .object({
    minimumCaptureIntervalSeconds: wholeNumber('Minimum interval', 60),
    maximumCaptureIntervalSeconds: wholeNumber('Maximum interval', 60),
    heartbeatIntervalSeconds: wholeNumber('Heartbeat interval', 15),
    delayedAfterSeconds: wholeNumber('Delayed after', 16),
    unreachableAfterSeconds: wholeNumber('Unreachable after', 17),
    offlineRetentionDays: wholeNumber('Offline retention', 1),
    maximumOfflineGb: z
      .number()
      .positive('Offline storage must be more than 0')
      .nullable()
      .refine((value) => value !== null, 'Offline storage is required'),
    imageQuality: wholeNumber('Image quality', 1, 100),
    captureAllMonitors: z.boolean(),
  })
  .superRefine((policy, ctx) => {
    for (const [field, other, message, allowEqual] of ORDER) {
      const value = policy[field];
      const floor = policy[other];
      if (value === null || floor === null) continue;
      if (allowEqual ? value < floor : value <= floor) {
        ctx.addIssue({ code: 'custom', path: [field], message });
      }
    }
  });

/** `z.input`, not `z.infer` — `.refine` narrows null out of the *output* type. */
export type MonitoringPolicyModel = z.input<typeof monitoringPolicySchema>;
