import * as z from 'zod';

/** The backend rejects arrays and scalar JSON for override configuration, same rule as a policy
 *  rule's `ruleConfiguration`. */
function isJsonObject(raw: string): boolean {
  try {
    const parsed = JSON.parse(raw);
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

export const policyExceptionSchema = z.object({
  staffMemberId: z
    .string()
    .nullable()
    .refine((value) => value !== null && value !== '', 'StaffMember is required'),
  exceptionType: z
    .number()
    .min(1, 'Exception type must be at least 1')
    .nullable()
    .refine((value) => value !== null, 'Exception type is required'),
  overrideConfiguration: z
    .string()
    .trim()
    .min(1, 'Override configuration is required')
    .refine(isJsonObject, 'Must be a JSON object, e.g. {"allowRemoteAttendance":true}'),
  reason: z.string().trim().min(1, 'Reason is required'),
  effectiveFrom: z
    .date()
    .nullable()
    .refine((value) => value !== null, 'Effective from is required'),
  effectiveTo: z
    .date()
    .nullable()
    .refine((value) => value !== null, 'Effective to is required'),
});

/** `z.input`, not `z.infer` — the `.refine`s narrow null out of the *output* type. */
export type PolicyExceptionModel = z.input<typeof policyExceptionSchema>;
