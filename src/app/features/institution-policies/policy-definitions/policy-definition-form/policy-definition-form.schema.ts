import * as z from 'zod';

import { AttendanceLocationScope } from '@shared/interfaces';

const requiredId = (label: string) =>
  z
    .number()
    .nullable()
    .refine((value) => value !== null, `${label} is required`);

const requiredDate = (label: string) =>
  z
    .date()
    .nullable()
    .refine((value) => value !== null, `${label} is required`);

const ruleSettingSchema = z.object({
  key: z.string().trim().min(1, 'Setting name is required'),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.array(z.number()),
    z.null(),
  ]),
});

/** Serialized to the `ruleConfiguration` JSON object at submit, see `rule-settings.ts`. No
 *  settings saves `{}`. A repeated key would silently overwrite the first once it becomes an object
 *  key; JSON keys are case-sensitive, so `Days` and `days` are distinct. */
export const ruleRowSchema = z.object({
  policyRuleTypeId: requiredId('Rule type'),
  ruleName: z.string().trim().min(1, 'Name is required'),
  settings: z.array(ruleSettingSchema).superRefine((settings, context) => {
    const seen = new Set<string>();
    settings.forEach((setting, index) => {
      const key = setting.key.trim();
      if (key && seen.has(key)) {
        context.addIssue({
          code: 'custom',
          path: [index, 'key'],
          message: 'This setting is already listed',
        });
      }
      seen.add(key);
    });
  }),
  leaveTypeIds: z.array(z.number()),
});

/** Nullable, no further validation — a lookup id the row either carries or doesn't. */
const optionalId = z.number().nullable();

export const applicabilityRowSchema = z.object({
  applicabilityMode: z.union([z.literal(1), z.literal(2)]),
  countryId: optionalId,
  stateId: optionalId,
  districtId: optionalId,
  localityId: optionalId,
  campusId: optionalId,
  staffEmploymentTypeId: optionalId,
  departmentId: optionalId,
  designationId: optionalId,
  /** Encoded id of the staffMember picked in the select. */
  staffMemberPublicId: z.string().nullable(),
  /** Numeric id the row was saved with. Detail responses carry no encoded id to preselect, so it is
   *  carried through unedited until the staffMember select changes. */
  savedStaffMemberId: optionalId,
  genderId: optionalId,
  minimumServiceDays: z
    .number()
    .int('Minimum service days must be a whole number')
    .min(0, 'Minimum service days cannot be negative')
    .nullable(),
  priority: requiredId('Priority'),
  effectiveFrom: requiredDate('Effective from'),
  effectiveTo: z.date().nullable(),
  // Still not editable in this UI — carried through unedited from an existing row rather than
  // dropped. Both are plain nullable `int32` in `PolicyApplicabilityInputDTO`, with no `$ref` enum
  // and no value legend anywhere in the swagger or in `docs/specs/`, so a select would be guessing
  // at its own option values. See the doc comment on `InstitutionPolicyApplicabilityInput`.
  workArrangementType: optionalId,
  employmentStatus: optionalId,
  leaveTypeIds: z.array(z.number()),
});

export const policyDefinitionSchema = z
  .object({
    policyTypeId: requiredId('Policy type'),
    policyCode: z
      .string()
      .trim()
      .min(1, 'Code is required')
      .max(50, 'Code must be 50 characters or fewer'),
    policyName: z.string().trim().min(1, 'Name is required'),
    summary: z.string().trim(),
    ownerDepartmentId: z.number().nullable(),
    defaultCurrencyCode: z.string().min(1, 'Currency is required'),
    effectiveFrom: requiredDate('Effective from'),
    effectiveTo: z.date().nullable(),
    changeSummary: z.string().trim().min(1, 'A change summary is required'),
    rules: z.array(ruleRowSchema),
    applicability: z.array(applicabilityRowSchema),
    leaveTypeIds: z.array(z.number()),
    requiresLeaveTypeTargets: z.boolean(),
    requiresAttendanceConfiguration: z.boolean(),
    attendanceConfiguration: z.object({
      attendanceLocationScope: z.nativeEnum(AttendanceLocationScope).nullable(),
      allowBiometric: z.boolean(),
      allowMobile: z.boolean(),
      allowWeb: z.boolean(),
      allowManualAttendance: z.boolean(),
      allowWorkFromHome: z.boolean(),
      requireGeoFenceForOffice: z.boolean(),
      requireGpsForRemote: z.boolean(),
      allowOutsideLocationWithApproval: z.boolean(),
    }),
  })
  .superRefine((model, context) => {
    if (model.requiresLeaveTypeTargets) {
      if (model.leaveTypeIds.length === 0) {
        context.addIssue({
          code: 'custom',
          path: ['leaveTypeIds'],
          message: 'Select at least one covered leave type',
        });
      }
      model.rules.forEach((rule, index) => {
        if (rule.leaveTypeIds.length === 0)
          context.addIssue({
            code: 'custom',
            path: ['rules', index, 'leaveTypeIds'],
            message: 'Select at least one leave type',
          });
      });
      model.applicability.forEach((row, index) => {
        if (row.leaveTypeIds.length === 0)
          context.addIssue({
            code: 'custom',
            path: ['applicability', index, 'leaveTypeIds'],
            message: 'Select at least one leave type',
          });
      });
    }
    if (model.requiresAttendanceConfiguration) {
      const configuration = model.attendanceConfiguration;
      if (configuration.attendanceLocationScope === null) {
        context.addIssue({
          code: 'custom',
          path: ['attendanceConfiguration', 'attendanceLocationScope'],
          message: 'Location scope is required',
        });
      }
      if (
        !configuration.allowBiometric &&
        !configuration.allowMobile &&
        !configuration.allowWeb &&
        !configuration.allowManualAttendance
      ) {
        context.addIssue({
          code: 'custom',
          path: ['attendanceConfiguration', 'allowBiometric'],
          message: 'Enable at least one attendance channel',
        });
      }
    }
  });

/** `z.input`, not `z.infer` — the `.refine`s narrow null out of the *output* type, but the model
 *  keeps holding null so the selects and date pickers show their placeholders. */
export type PolicyDefinitionModel = z.input<typeof policyDefinitionSchema>;
export type RuleRowModel = z.input<typeof ruleRowSchema>;
export type ApplicabilityRowModel = z.input<typeof applicabilityRowSchema>;
