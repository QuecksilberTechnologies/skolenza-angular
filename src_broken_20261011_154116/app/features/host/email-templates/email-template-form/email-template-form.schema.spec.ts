import { EmailTemplateFormModel, emailTemplateSchema } from './email-template-form.schema';

const validModel: EmailTemplateFormModel = {
  templateName: 'Welcome email',
  templateCode: 'WELCOME_EMAIL',
  subject: 'Welcome to Acme',
  body: '<table><tr><td>Hello {{UserName}}</td></tr></table>',
  fromEmail: 'no-reply@acme.com',
  fromName: 'Acme HR',
  ccEmail: '',
  bccEmail: '',
  category: 'Onboarding',
  languageCode: 'en',
  isActive: true,
};

const messagesFor = (model: EmailTemplateFormModel): string[] => {
  const result = emailTemplateSchema.safeParse(model);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('emailTemplateSchema', () => {
  it('accepts a filled form', () => {
    expect(messagesFor(validModel)).toEqual([]);
  });

  it('demands a template name', () => {
    expect(messagesFor({ ...validModel, templateName: '   ' })).toContain(
      'Template name is required',
    );
  });

  it('demands a subject', () => {
    expect(messagesFor({ ...validModel, subject: '' })).toContain('Subject is required');
  });

  it('demands a template code', () => {
    expect(messagesFor({ ...validModel, templateCode: '' })).toContain('Template code is required');
  });

  // The select is what constrains the vocabulary. Hydration is the only way an off-list code
  // reaches the model, and rejecting it there made a subject-only edit force the user to
  // overwrite a code they never touched.
  it('keeps a code the build does not know, so hydrating a newer row cannot rewrite it', () => {
    expect(messagesFor({ ...validModel, templateCode: 'SOMETHING_ELSE' })).toEqual([]);
  });

  it('accepts every code the list publishes', () => {
    for (const code of [
      'WELCOME_EMAIL',
      'FORGOT_PASSWORD',
      'BIRTHDAY_WISH',
      'LEAVE_APPROVAL',
      'ACCOUNT_VERIFICATION',
    ]) {
      expect(messagesFor({ ...validModel, templateCode: code })).toEqual([]);
    }
  });

  it('demands a body', () => {
    expect(messagesFor({ ...validModel, body: '   ' })).toContain('Body is required');
  });

  // ProseMirror keeps its root paragraph, so this is what an emptied editor actually stores.
  it('reports an emptied editor, whose markup is truthy and eight characters long', () => {
    expect(messagesFor({ ...validModel, body: '<p></p>' })).toContain('Body is required');
  });

  it('reports a body that is only whitespace inside its markup', () => {
    expect(messagesFor({ ...validModel, body: '<p>   <br></p>' })).toContain('Body is required');
  });

  it('accepts a table-based email with inline styles, which is what these bodies are', () => {
    const body =
      '<table style="width:600px"><tr><td style="padding:16px">' +
      '<h1 style="color:#111">Welcome {{UserName}}</h1></td></tr></table>';

    expect(messagesFor({ ...validModel, body })).toEqual([]);
  });

  it('leaves placeholder runs untouched, because nothing here parses the markup', () => {
    const body = '<p>{{InstitutionName}} - {{LinkExpiryMinutes}} minutes</p>';
    const result = emailTemplateSchema.safeParse({ ...validModel, body });

    expect(result.success && result.data.body).toBe(body);
  });

  it('lets the sender fields stay blank, because the SMTP account supplies them', () => {
    expect(messagesFor({ ...validModel, fromEmail: '', fromName: '' })).toEqual([]);
  });

  it('rejects a malformed from email', () => {
    expect(messagesFor({ ...validModel, fromEmail: 'not-an-address' })).toContain(
      'Enter a valid email address',
    );
  });

  it('accepts a comma-separated CC list', () => {
    expect(messagesFor({ ...validModel, ccEmail: 'hr@acme.com, ops@acme.com' })).toEqual([]);
  });

  // What the API actually serves. A comma-only rule made a freshly loaded record unsavable.
  it('accepts a semicolon-separated CC list, which is what the seeded rows use', () => {
    expect(messagesFor({ ...validModel, ccEmail: 'hr@acme.com;ops@acme.com' })).toEqual([]);
  });

  it('accepts the two separators mixed', () => {
    expect(
      messagesFor({ ...validModel, ccEmail: 'hr@acme.com, ops@acme.com; legal@acme.com' }),
    ).toEqual([]);
  });

  it('does not fail a trailing separator', () => {
    expect(messagesFor({ ...validModel, ccEmail: 'hr@acme.com;' })).toEqual([]);
  });

  it('rejects a CC list with one bad address in it', () => {
    expect(messagesFor({ ...validModel, ccEmail: 'hr@acme.com, nope' })).toContain(
      'Enter one email address, or several separated by commas or semicolons',
    );
  });

  it('applies the same rule to BCC', () => {
    expect(messagesFor({ ...validModel, bccEmail: 'nope' })).toContain(
      'Enter one email address, or several separated by commas or semicolons',
    );
  });

  it('lets category and language code stay blank', () => {
    expect(messagesFor({ ...validModel, category: '', languageCode: '' })).toEqual([]);
  });
});
