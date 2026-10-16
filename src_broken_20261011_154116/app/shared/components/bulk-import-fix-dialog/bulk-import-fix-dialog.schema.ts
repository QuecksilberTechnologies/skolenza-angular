import { z } from 'zod';

import { BulkImportFieldConfig } from '@shared/interfaces';
import { EMAIL_PATTERN } from '@shared/utilities/validation-regex';

/**
 * A row under correction. The shape is the sheet's columns, which are only known at runtime, so
 * the schema is built rather than written — see {@link buildFixSchema}.
 *
 * Values are not all strings: a date column binds a `Date` to `p-datepicker` and a flag binds a
 * `boolean` to `p-toggleswitch`. They are marshalled back to the sheet's own string forms on save
 * (`toSheetValue` in the component).
 */
export type BulkImportFixModel = Record<string, string | boolean | Date | null>;

/**
 * The client half of the rules, built from the field metadata the importing feature supplied.
 *
 * Shape only: blank required fields, a malformed address, a date that is not a date. Everything
 * cross-entity — the designation belonging to the department, the id being active in this institution,
 * the address already existing — stays the server's, and comes back as row errors on the re-check.
 * A master that describes no fields therefore validates nothing here and relies wholly on that
 * re-check, which is the same single code path.
 */
export function buildFixSchema(fields: readonly BulkImportFieldConfig[]) {
  const shape: Record<string, z.ZodType> = {};

  for (const field of fields) {
    shape[field.column] = ruleFor(field);
  }

  return z.object(shape);
}

function ruleFor(field: BulkImportFieldConfig): z.ZodType {
  const required = field.required ?? false;

  switch (field.type) {
    case 'switch':
      return z.boolean();

    case 'date': {
      const date = z.date({ error: `${field.label} must be a valid date` }).nullable();

      return required ? date.refine((value) => value !== null, `${field.label} is required`) : date;
    }

    case 'email': {
      const email = z
        .string()
        .trim()
        .refine(
          (value) => value === '' || EMAIL_PATTERN.test(value),
          `${field.label} must be a valid email address`,
        );

      return required ? email.refine((value) => value !== '', `${field.label} is required`) : email;
    }

    default: {
      // `select` included: the value is the id the sheet carries, as a string.
      const text = z.string().trim();

      return required ? text.min(1, `${field.label} is required`) : text;
    }
  }
}
