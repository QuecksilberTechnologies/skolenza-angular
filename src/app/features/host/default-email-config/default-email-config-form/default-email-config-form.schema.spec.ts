import {
  DefaultEmailConfigFormModel,
  defaultEmailConfigSchema,
} from './default-email-config-form.schema';

const validModel: DefaultEmailConfigFormModel = {
  configName: 'Default Gmail',
  smtpHost: 'smtp.acme.com',
  smtpPort: 587,
  smtpUsername: 'no-reply@acme.com',
  smtpPassword: 'hunter2',
  fromEmail: 'no-reply@acme.com',
  fromName: 'Acme HR',
  isActive: true,
  isDefault: false,
};

const messagesFor = (model: DefaultEmailConfigFormModel, mode: 'create' | 'edit'): string[] => {
  const result = defaultEmailConfigSchema(mode).safeParse(model);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('defaultEmailConfigSchema', () => {
  it('accepts a filled form in both modes', () => {
    expect(messagesFor(validModel, 'create')).toEqual([]);
    expect(messagesFor(validModel, 'edit')).toEqual([]);
  });

  it('demands the password on create', () => {
    expect(messagesFor({ ...validModel, smtpPassword: '' }, 'create')).toContain(
      'SMTP password is required',
    );
  });

  it('rejects a spaces-only password on create, which would otherwise be sent as no password', () => {
    expect(messagesFor({ ...validModel, smtpPassword: '   ' }, 'create')).toContain(
      'SMTP password is required',
    );
  });

  it('lets the password stay blank on edit, because omitting it preserves the stored one', () => {
    expect(messagesFor({ ...validModel, smtpPassword: '' }, 'edit')).toEqual([]);
  });

  it('reports a blank port rather than reading it as zero', () => {
    expect(messagesFor({ ...validModel, smtpPort: null }, 'create')).toContain(
      'SMTP port is required',
    );
  });

  it('holds the port inside the valid range', () => {
    expect(messagesFor({ ...validModel, smtpPort: 70000 }, 'create')).toContain(
      'SMTP port must be between 1 and 65535',
    );
  });

  it('rejects a host that is a URL rather than a host name', () => {
    expect(messagesFor({ ...validModel, smtpHost: 'https://smtp.acme.com' }, 'create')).toContain(
      'Enter a host name, e.g. smtp.acme.com',
    );
  });

  it('rejects a malformed from email', () => {
    expect(messagesFor({ ...validModel, fromEmail: 'no-reply@acme' }, 'create')).toContain(
      'Enter a valid email address',
    );
  });

  it('requires the configuration name', () => {
    expect(messagesFor({ ...validModel, configName: '   ' }, 'edit')).toContain(
      'Configuration name is required',
    );
  });
});
