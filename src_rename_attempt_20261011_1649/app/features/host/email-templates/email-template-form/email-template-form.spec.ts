import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Common, EmailTemplateApi } from '@core/services';
import { EmailTemplateRow } from '@shared/interfaces';

import EmailTemplateForm from './email-template-form';

function createTemplate(overrides: Partial<EmailTemplateRow> = {}): EmailTemplateRow {
  return {
    id: 1,
    templateName: 'Welcome email',
    templateCode: 'WELCOME_EMAIL',
    subject: 'Welcome to Acme',
    body: '<p>Hello there</p>',
    fromEmail: 'no-reply@acme.com',
    fromName: 'Acme HR',
    ccEmail: null,
    bccEmail: null,
    category: 'Onboarding',
    languageCode: 'en',
    isActive: true,
    ...overrides,
  };
}

describe('EmailTemplateForm', () => {
  let component: EmailTemplateForm;
  let fixture: ComponentFixture<EmailTemplateForm>;

  const apiMock = {
    getEmailTemplate: vi.fn(),
    addEmailTemplate: vi.fn(),
    updateEmailTemplate: vi.fn(),
  };
  const commonMock = {
    showMessage: vi.fn(),
    setPageHeaderInfo: vi.fn(),
    setBreadcrumbItems: vi.fn(),
  };
  const routerMock = { navigate: vi.fn() };

  /** Every case here is an edit, so the id comes off the route the same way the component reads it. */
  const createForm = async (row: EmailTemplateRow) => {
    apiMock.getEmailTemplate.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: row }),
    );

    await TestBed.configureTestingModule({
      imports: [EmailTemplateForm],
      providers: [
        { provide: EmailTemplateApi, useValue: apiMock },
        { provide: Common, useValue: commonMock },
        { provide: Router, useValue: routerMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '1' } } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EmailTemplateForm);
    component = fixture.componentInstance;
    return component;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    routerMock.navigate.mockResolvedValue(true);
    TestBed.resetTestingModule();
  });

  describe('a template code this build does not know', () => {
    // The regression this guards: blanking the code meant a subject-only edit silently rewrote a
    // field the user never touched, because the schema then demanded a value.
    it('keeps the code the server sent', async () => {
      await createForm(createTemplate({ templateCode: 'PAYSLIP_READY' }));

      expect(component['model']().templateCode).toBe('PAYSLIP_READY');
    });

    it('offers it alongside the known codes, so the select can render it', async () => {
      await createForm(createTemplate({ templateCode: 'PAYSLIP_READY' }));

      expect(component['templateCodeOptions']()).toContainEqual({
        code: 'PAYSLIP_READY',
        label: 'PAYSLIP_READY',
      });
    });

    it('leaves the form clean, so an untouched row is not reported as edited', async () => {
      await createForm(createTemplate({ templateCode: 'PAYSLIP_READY' }));

      expect(component['isDirty']()).toBe(false);
      expect(component.canDeactivate()).toBe(true);
    });

    it('sends the code back unchanged when only another field is edited', async () => {
      await createForm(createTemplate({ templateCode: 'PAYSLIP_READY' }));
      apiMock.updateEmailTemplate.mockReturnValue(
        of({ isSucceeded: true, message: 'Saved.', errors: [], data: null }),
      );

      component['model'].update((model) => ({ ...model, subject: 'A new subject' }));
      component.onSubmit();

      expect(apiMock.updateEmailTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, templateCode: 'PAYSLIP_READY' }),
      );
    });
  });

  it('does not duplicate a known code in the options', async () => {
    await createForm(createTemplate({ templateCode: 'WELCOME_EMAIL' }));

    const matches = component['templateCodeOptions']().filter(
      (option) => option.code === 'WELCOME_EMAIL',
    );
    expect(matches).toHaveLength(1);
  });

  describe('the editing mode the form opens in', () => {
    // The editor has no table node, so a table-based body is flattened the moment it
    // propagates a keystroke. Such a template has to open in source.
    it('opens a table-based body in HTML source', async () => {
      await createForm(
        createTemplate({ body: '<table><tr><td>Hello {{UserName}}</td></tr></table>' }),
      );

      expect(component['bodyMode']()).toBe('source');
    });

    // The editor holds a fragment, so a record that is a whole document loses its doctype, its
    // `<head>` and the body's own styling the moment the editor writes back.
    it('opens a whole-document body in HTML source', async () => {
      await createForm(
        createTemplate({
          body: '<html><body style="font-family: Arial"><p>Hello {{UserName}}</p></body></html>',
        }),
      );

      expect(component['bodyMode']()).toBe('source');
    });

    // `TextStyleKit` carries colour as a mark on a `<span>`. The same declaration on a block
    // matches no node attribute, so the editor drops it - the preview shows a colour the editor
    // never does, and the first keystroke saves the colourless version.
    it('opens a body that styles its own blocks in HTML source', async () => {
      await createForm(
        createTemplate({ body: '<h2 style="color: #2E86C1">Dear {{UserName}},</h2>' }),
      );

      expect(component['bodyMode']()).toBe('source');
    });

    it('opens an ordinary body in rich text', async () => {
      await createForm(createTemplate({ body: '<p>Hello {{UserName}}</p>' }));

      expect(component['bodyMode']()).toBe('rich');
    });

    // The editor's own output: colour rides on a `<span>`, which survives the round trip.
    it('opens a body whose styling rides on a span in rich text', async () => {
      await createForm(
        createTemplate({ body: '<p>Hi <span style="color: #e74c3c">{{Otp}}</span></p>' }),
      );

      expect(component['bodyMode']()).toBe('rich');
    });

    // `TextAlign` writes `text-align` on the block itself, and a centred inline image is how the
    // toolbar centres a logo. Treating that as uneditable would lock the editor's own output out
    // of the editor.
    it('opens a body aligned by the toolbar in rich text', async () => {
      await createForm(
        createTemplate({ body: '<p style="text-align: center"><img src="logo.png" alt=""></p>' }),
      );

      expect(component['bodyMode']()).toBe('rich');
    });

    // The Quill compat layer maps a legacy `ql-font-*` onto the block's own `font-family`.
    it("opens a body carrying Quill's block font in rich text", async () => {
      await createForm(
        createTemplate({ body: `<p style='font-family: monospace; text-align: right'>Hi</p>` }),
      );

      expect(component['bodyMode']()).toBe('rich');
    });

    // Single quotes, because that is how the seeded templates are written.
    it('opens a single-quoted block style in HTML source', async () => {
      await createForm(createTemplate({ body: `<p style='color: gray'>Regards</p>` }));

      expect(component['bodyMode']()).toBe('source');
    });

    it('warns when someone switches a table-based body to rich text', async () => {
      await createForm(createTemplate({ body: '<table><tr><td>Hi</td></tr></table>' }));

      expect(component['warnsAboutRichMode']()).toBe(false);

      component['bodyMode'].set('rich');

      expect(component['warnsAboutRichMode']()).toBe(true);
    });

    it('keeps warning after the editor has flattened the body, which is when it matters most', async () => {
      await createForm(createTemplate({ body: '<table><tr><td>Hi</td></tr></table>' }));

      component['bodyMode'].set('rich');
      // What the editor writes back on the first keystroke: the table is gone from the model.
      component['model'].update((model) => ({ ...model, body: '<p>Hi</p>' }));

      expect(component['warnsAboutRichMode']()).toBe(true);
    });
  });
});
