import * as z from 'zod';

const requiredId = (label: string) =>
  z
    .number()
    .nullable()
    .refine((value) => value !== null, `${label} is required`);

/** One checklist row: a capability or duty the position may require. */
const requirementRow = z.object({
  id: z.number(),
  name: z.string(),
  /** Inactive masters appear only when already linked, and stay locked. */
  inactive: z.boolean(),
  selected: z.boolean(),
  isMandatory: z.boolean(),
});

/** Validates the model in place; the submit handler trims values for the request body. */
export const staffPositionSchema = z.object({
  institutionStaffCategoryMasterId: requiredId('Category'),
  staffJobFamilyMasterId: requiredId('Job family'),
  code: z.string().trim().min(1, 'Code is required'),
  name: z.string().trim().min(1, 'Name is required'),
  isActive: z.boolean(),
  capabilities: z.array(requirementRow),
  duties: z.array(requirementRow),
});

export type StaffPositionFormModel = z.input<typeof staffPositionSchema>;
export type RequirementRow = z.infer<typeof requirementRow>;
