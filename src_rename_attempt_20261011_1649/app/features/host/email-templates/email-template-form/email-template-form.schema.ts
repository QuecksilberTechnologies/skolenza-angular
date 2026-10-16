import { z } from 'zod';

import { EMAIL_PATTERN } from '@shared/utilities/validation-regex';

/**
 * Every address in a CC or BCC list is valid, or the list is empty.
 *
 * Both `,` and `;` separate. The seeded rows the API serves use `;`, the Outlook convention, so a
 * comma-only rule rejected records the form had just loaded and made them unsavable. Empty parts
 * are dropped rather than failed, so a trailing separator is not an error.
 *
 * The submit handler sends the list back exactly as typed: the backend served `;`, so it parses
 * `;`, and rewriting the separator would be a guess about parsing that swagger cannot settle -
 * every string on this DTO is untyped.
 */
const isAddressList = (value: string): boolean =>
  value
    .split(/[,;]/)
    .map((address) => address.trim())
    .filter((address) => address !== '')
    .every((address) => EMAIL_PATTERN.test(address));

/**
 * Validation for the Host mail-template form.
 *
 * The API declares no `maxLength`, `pattern` or `required` on any field — every string is a bare
 * nullable string — so every cap below is a frontend guard chosen to match the sibling forms, not a
 * mirrored server rule.
 */
export const emailTemplateSchema = z.object({
  templateName: z
    .string()
    .trim()
    .min(1, 'Template name is required')
    .max(100, 'Template name must be at most 100 characters'),
  /**
   * Presence only. The vocabulary is enforced by the select, which offers nothing else - and the
   * one way an off-list value reaches this model is hydration, where a server row carries a code
   * added after this build. Rejecting it there made a subject-only edit force the user to
   * overwrite a code they never touched, so the rule the select already enforces is not repeated
   * here. See `email-template-codes.ts`.
   */
  templateCode: z.string().min(1, 'Template code is required'),
  subject: z
    .string()
    .trim()
    .min(1, 'Subject is required')
    .max(200, 'Subject must be at most 200 characters'),
  /**
   * HTML, stored verbatim. Written either through the rich-text editor or as source, and this
   * rule has to hold for both.
   *
   * The emptiness test strips tags rather than trimming, because the editor keeps its root
   * paragraph: clearing every character leaves `'<p></p>'`, which is truthy and eight characters
   * long, so `.min(1)` would pass on a visibly empty field. The cap is generous because an
   * inline-styled email is mostly attributes.
   */
  body: z
    .string()
    .max(200000, 'Body must be at most 200000 characters')
    .refine((html) => html.replace(/<[^>]*>/g, '').trim().length > 0, 'Body is required'),
  // Blank means "fall back to the sending SMTP account", which is what the mail flow already does.
  fromEmail: z
    .string()
    .trim()
    .max(150, 'From email must be at most 150 characters')
    .refine((value) => value === '' || EMAIL_PATTERN.test(value), 'Enter a valid email address'),
  fromName: z.string().trim().max(100, 'From name must be at most 100 characters'),
  ccEmail: z
    .string()
    .trim()
    .max(500, 'CC must be at most 500 characters')
    .refine(isAddressList, 'Enter one email address, or several separated by commas or semicolons'),
  bccEmail: z
    .string()
    .trim()
    .max(500, 'BCC must be at most 500 characters')
    .refine(isAddressList, 'Enter one email address, or several separated by commas or semicolons'),
  category: z.string().trim().max(100, 'Category must be at most 100 characters'),
  languageCode: z.string().trim().max(10, 'Language code must be at most 10 characters'),
  isActive: z.boolean(),
});

/** `z.input`, not `z.infer` — the `.refine` calls narrow the output type the model has to keep. */
export type EmailTemplateFormModel = z.input<typeof emailTemplateSchema>;
