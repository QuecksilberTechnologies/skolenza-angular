import * as z from 'zod';

/**
 * The same 8-20 character rule the host-user reset dialog enforces, expressed as the one
 * place validation lives for a Signal Form — see `.claude/docs/forms.md`.
 */
export const staffMemberResetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(20, 'Password cannot exceed 20 characters'),
    confirmPassword: z.string().min(1, 'Confirm password is required'),
  })
  .superRefine(({ newPassword, confirmPassword }, ctx) => {
    // Only once the user has typed something, so the mismatch message does not pre-empt the
    // "Confirm password is required" one on an untouched field.
    if (confirmPassword && newPassword !== confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'Passwords do not match',
      });
    }
  });

export type StaffMemberResetPasswordModel = z.input<typeof staffMemberResetPasswordSchema>;
