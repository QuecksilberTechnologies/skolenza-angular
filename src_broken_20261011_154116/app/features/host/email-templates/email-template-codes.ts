/**
 * The template codes the platform's mail flows resolve by.
 *
 * A closed list rather than free text: each code names the event that sends the template, so one
 * saved under a code no flow asks for is a template nothing ever sends. The API declares
 * `templateCode` as a plain nullable string and enforces nothing, which is why the vocabulary has
 * to live on the client.
 *
 * It lives in the feature folder rather than in `@shared/utilities/common-data` on purpose - that
 * file is in the initial bundle and this feature is lazy - and beside the form rather than in its
 * schema, because `forms.md` has a schema file export the schema and the model type, nothing else.
 *
 * **Not exhaustive, and deliberately not enforced on hydration.** A row the server already holds
 * may carry a code added after this build. `email-template-form.ts` keeps that value and offers it
 * alongside the list rather than blanking it, so editing an unrelated field cannot silently
 * rewrite the code. See `templateCodeOptions` there.
 */
export const EMAIL_TEMPLATE_CODES: { code: string; label: string }[] = [
  { code: 'WELCOME_EMAIL', label: 'Welcome Email' },
  { code: 'FORGOT_PASSWORD', label: 'Forgot Password' },
  { code: 'BIRTHDAY_WISH', label: 'Birthday Wish' },
  { code: 'LEAVE_APPROVAL', label: 'Leave Approval' },
  { code: 'ACCOUNT_VERIFICATION', label: 'Account Verification' },
];
