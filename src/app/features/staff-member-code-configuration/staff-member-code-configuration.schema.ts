import * as z from 'zod';

/** Letters only, 1 to 10 — the institution validation the backend already enforces. */
const PREFIX_PATTERN = /^[A-Za-z]{1,10}$/;

/** The three separators the backend accepts. An empty separator is not one of them. */
export const CODE_SEPARATORS = ['-', '_', '/'] as const;

/** Running-number length arrives and leaves as a string, but only 3 to 7 are legal. */
export const RUNNING_NUMBER_LENGTHS = ['3', '4', '5', '6', '7'] as const;

export const staffMemberCodePatternSchema = z.object({
  prefix: z
    .string()
    .trim()
    .min(1, 'Prefix is required')
    .regex(PREFIX_PATTERN, 'Prefix must be 1 to 10 letters, no digits or spaces'),
  separator: z.enum(CODE_SEPARATORS, { message: 'Separator must be -, _ or /' }),
  runningNumberLength: z.enum(RUNNING_NUMBER_LENGTHS, {
    message: 'Running number length must be between 3 and 7',
  }),
  includeYear: z.boolean(),
  includeMonth: z.boolean(),
  includeDepartment: z.boolean(),
});

export type StaffMemberCodePatternModel = z.input<typeof staffMemberCodePatternSchema>;
