import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { type FieldTree, form, submit, validateStandardSchema } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';
import { SelectButtonModule } from '@openng/optimus-ui/selectbutton';
import { finalize, Observable } from 'rxjs';

import { CanComponentDeactivate } from '@core/guards';
import { Common } from '@core/services';
import { FormActionBar } from '@shared/components/form-action-bar/form-action-bar';
import { FormEditor } from '@shared/components/form-inputs/form-editor/form-editor';
import { FormSelect } from '@shared/components/form-inputs/form-select/form-select';
import { FormSwitch } from '@shared/components/form-inputs/form-switch/form-switch';
import { FormText } from '@shared/components/form-inputs/form-text/form-text';
import { FormTextarea } from '@shared/components/form-inputs/form-textarea/form-textarea';
import { SkeletonField } from '@shared/components/form-skeleton/form-skeleton-field';
import { SectionCard } from '@shared/components/section-card/section-card';
import {
  CreateEmailTemplateReq,
  EmailTemplateMutationRes,
  EmailTemplateRow,
} from '@shared/interfaces';
import { showFieldError } from '@shared/utilities/field-error';

import { EMAIL_TEMPLATE_CODES } from '../email-template-codes';
import { EmailTemplatePreview } from '../email-template-preview/email-template-preview';
import { EMAIL_TEMPLATE_SCOPE } from '../email-template-scope';
import { EmailTemplateFormModel, emailTemplateSchema } from './email-template-form.schema';

/** The order the template renders the fields in, so a blocked submit lands on the first one. */
const FIELD_ORDER: readonly (keyof EmailTemplateFormModel)[] = [
  'templateName',
  'templateCode',
  'category',
  'languageCode',
  'fromEmail',
  'fromName',
  'ccEmail',
  'bccEmail',
  'subject',
  'body',
];

const emptyModel: EmailTemplateFormModel = {
  templateName: '',
  templateCode: '',
  subject: '',
  body: '',
  fromEmail: '',
  fromName: '',
  ccEmail: '',
  bccEmail: '',
  category: '',
  languageCode: '',
  isActive: true,
};

/** A block element's `style` attribute, either quoting style - old bodies use both. */
const BLOCK_STYLE_ATTR =
  /<(?:h[1-6]|p|div|td|tr|table|ul|ol|li|blockquote)\b[^>]*\sstyle=(?:"([^"]*)"|'([^']*)')/gi;

/**
 * The two declarations the editor writes on a block itself, and so reads back unharmed:
 * `TextAlign` is configured for `heading` and `paragraph`, and the Quill compat layer maps a
 * legacy `ql-font-*` onto `style.fontFamily`. Everything else on a block is a mark the editor has
 * nowhere to put.
 */
const EDITOR_BLOCK_DECLARATIONS = new Set(['text-align', 'font-family']);

const stylesBlocksBeyondTheEditor = (html: string): boolean =>
  [...html.matchAll(BLOCK_STYLE_ATTR)].some(([, doubleQuoted, singleQuoted]) =>
    (doubleQuoted ?? singleQuoted ?? '')
      .split(';')
      .map((declaration) => declaration.split(':')[0].trim().toLowerCase())
      .some((property) => property !== '' && !EDITOR_BLOCK_DECLARATIONS.has(property)),
  );

/**
 * Markup the rich-text editor cannot represent.
 *
 * Three constructs, each of which the editor silently drops the moment it propagates a keystroke,
 * so a body carrying any of them opens in source mode instead:
 *
 * - `table` has no node in the editor's extension set and no control on the toolbar.
 * - `html` / `body` mean the record is a whole document. The editor holds a fragment, so the
 *   doctype, the `<head>` and the body's own `style` are gone the moment it writes back.
 * - a block element styled past {@link EDITOR_BLOCK_DECLARATIONS}. `TextStyleKit` carries colour
 *   and font as a mark on a `<span>`; the same declarations sitting on an `<h2>`, `<p>` or `<td>`
 *   match no node attribute and are discarded on parse - which is why such a body previews in
 *   colours the editor never shows.
 */
const hasUneditableMarkup = (html: string): boolean =>
  /<table[\s>]/i.test(html) ||
  /<(?:html|body)[\s>]/i.test(html) ||
  stylesBlocksBeyondTheEditor(html);

/** Empty strings go to the API as `null`, which is what the nullable DTO fields expect. */
const nullable = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

@Component({
  selector: 'app-email-template-form',
  imports: [
    FormsModule,
    ButtonModule,
    SelectButtonModule,
    EmailTemplatePreview,
    SectionCard,
    FormActionBar,
    FormText,
    FormSelect,
    FormSwitch,
    FormEditor,
    FormTextarea,
    SkeletonField,
  ],
  templateUrl: './email-template-form.html',
  // Fills the router-outlet's leftover height so the page's own scroll box needs no 100vh math.
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class EmailTemplateForm implements CanComponentDeactivate {
  readonly #scope = inject(EMAIL_TEMPLATE_SCOPE);
  readonly #api = this.#scope.api;
  readonly #commonService = inject(Common);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #destroyRef = inject(DestroyRef);

  /** Create and edit are separate route configs, so the id cannot change under the component. */
  protected readonly templateId = Number(this.#route.snapshot.paramMap.get('templateId')) || null;
  protected readonly isEditMode = this.templateId !== null;

  /**
   * The known codes, plus whatever the server row already carries.
   *
   * A row seeded under a code added after this build must stay selectable, or editing any other
   * field on it would silently rewrite `templateCode` to something the mail flow never asked for.
   * The extra entry is labelled with the raw code, since this build has no name for it.
   */
  protected readonly templateCodeOptions = computed(() => {
    const current = this.model().templateCode;
    const isKnown = EMAIL_TEMPLATE_CODES.some((option) => option.code === current);
    return current !== '' && !isKnown
      ? [...EMAIL_TEMPLATE_CODES, { code: current, label: current }]
      : EMAIL_TEMPLATE_CODES;
  });

  /**
   * Rich text unless the loaded body needs otherwise - `#setModel` switches to source for a body
   * the editor would flatten. Both controls write the same field, so switching loses no value.
   */
  protected readonly bodyMode = signal<'rich' | 'source'>('rich');
  protected readonly bodyModes = [
    { label: 'Rich text', value: 'rich' },
    { label: 'HTML source', value: 'source' },
  ];

  /** The composed mail, drawn as the recipient's client would. Reads the live model. */
  protected readonly isPreviewVisible = signal(false);

  protected readonly isSaving = signal(false);
  protected readonly isLoading = signal(false);
  /** Flipped by the first submit attempt, so every outstanding error surfaces at once. */
  protected readonly submitted = signal(false);

  protected readonly model = signal<EmailTemplateFormModel>(emptyModel);
  /** What the server last told us; `canDeactivate` compares against it. */
  readonly #baseline = signal<EmailTemplateFormModel>(emptyModel);

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, emailTemplateSchema);
  });

  protected readonly isDirty = computed(
    () => JSON.stringify(this.model()) !== JSON.stringify(this.#baseline()),
  );

  /**
   * Read off the baseline rather than the live model: once the editor has flattened the body the
   * table is gone from the model, and the warning would disappear exactly when it came true.
   */
  protected readonly warnsAboutRichMode = computed(
    () => this.bodyMode() === 'rich' && hasUneditableMarkup(this.#baseline().body),
  );

  canDeactivate(): boolean {
    return !this.isDirty();
  }

  /** Templates call this per field; the rule itself lives in `@shared/utilities/field-error`. */
  protected showError<T>(field: FieldTree<T>): boolean {
    return showFieldError(field, this.submitted());
  }

  constructor() {
    this.#setPageHeaderInfo();

    if (this.templateId) {
      this.#hydrate(this.templateId);
    }
  }

  #setPageHeaderInfo(): void {
    const pageTitle = this.isEditMode ? 'Edit Email Template' : 'Add Email Template';

    this.#commonService.setPageHeaderInfo({
      pageTitle,
      pageDescription: this.isEditMode
        ? 'Update the wording the platform sends for this event'
        : 'Write the wording the platform sends for an event',
      pageIcon: 'pi pi-file-edit',
      isBreadcrumbShow: true,
    });
    this.#commonService.setBreadcrumbItems([
      { label: 'Email Templates', routerLink: this.#scope.listRoute },
      { label: pageTitle },
    ]);
  }

  /** Edits read the row back from the API so the form always reflects server state. */
  #hydrate(id: number): void {
    this.isLoading.set(true);

    this.#api
      .getEmailTemplate(id)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          const template = res.isSucceeded ? res.data : null;
          if (!template) {
            this.#commonService.showMessage(res.message || 'Template not found', 'error');
            this.#leave();
            return;
          }
          this.#setModel(this.#toModel(template));
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
          this.#leave();
        },
      });
  }

  #toModel(row: EmailTemplateRow): EmailTemplateFormModel {
    return {
      ...emptyModel,
      templateName: row.templateName ?? '',
      // Verbatim, including a code this build has no name for - `templateCodeOptions` makes it
      // selectable so an edit elsewhere on the row cannot rewrite it.
      templateCode: row.templateCode ?? '',
      subject: row.subject ?? '',
      body: row.body ?? '',
      fromEmail: row.fromEmail ?? '',
      fromName: row.fromName ?? '',
      ccEmail: row.ccEmail ?? '',
      bccEmail: row.bccEmail ?? '',
      category: row.category ?? '',
      languageCode: row.languageCode ?? '',
      isActive: row.isActive ?? false,
    };
  }

  onSubmit(): void {
    if (this.isSaving() || this.isLoading()) {
      return;
    }

    // The button stays enabled while the form is invalid, so submitting is how the user asks
    // what is wrong - reveal everything, then take them to the first field to fix.
    this.submitted.set(true);
    this.f().markAsTouched();

    if (this.f().invalid()) {
      this.#focusFirstInvalid();
      return;
    }

    submit(this.f, async () => {
      const body = this.#buildRequest(this.model());
      this.isSaving.set(true);

      const request$: Observable<EmailTemplateMutationRes> = this.templateId
        ? this.#api.updateEmailTemplate({ ...body, id: this.templateId })
        : this.#api.addEmailTemplate(body);

      request$
        .pipe(
          finalize(() => this.isSaving.set(false)),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: (res) => {
            this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            if (res.isSucceeded) {
              this.#leave();
            }
          },
          error: (err) => this.#commonService.showMessage(err.message, 'error'),
        });
    });
  }

  /** The schema validates the model in place, so the request body is where trimming happens. */
  #buildRequest(value: EmailTemplateFormModel): CreateEmailTemplateReq {
    return {
      templateName: nullable(value.templateName),
      templateCode: nullable(value.templateCode),
      subject: nullable(value.subject),
      body: nullable(value.body),
      fromEmail: nullable(value.fromEmail),
      fromName: nullable(value.fromName),
      ccEmail: nullable(value.ccEmail),
      bccEmail: nullable(value.bccEmail),
      category: nullable(value.category),
      languageCode: nullable(value.languageCode),
      isActive: value.isActive,
    };
  }

  onCancel(): void {
    this.#router.navigate([this.#scope.listRoute]);
  }

  /** DOM order of the fields, so a blocked submit lands on the first one that needs attention. */
  #focusFirstInvalid(): void {
    if (typeof document === 'undefined') {
      return;
    }

    // A `Record` rather than a list of pairs: it is the field set itself, so a field added to the
    // model is a compile error here rather than one the focus jump silently skips. `isActive` is a
    // switch with no error state, and says so.
    const hasError: Record<keyof EmailTemplateFormModel, boolean> = {
      templateName: this.showError(this.f.templateName),
      templateCode: this.showError(this.f.templateCode),
      category: this.showError(this.f.category),
      languageCode: this.showError(this.f.languageCode),
      fromEmail: this.showError(this.f.fromEmail),
      fromName: this.showError(this.f.fromName),
      ccEmail: this.showError(this.f.ccEmail),
      bccEmail: this.showError(this.f.bccEmail),
      subject: this.showError(this.f.subject),
      body: this.showError(this.f.body),
      isActive: false,
    };

    const id = FIELD_ORDER.find((field) => hasError[field]);
    const element = id ? document.getElementById(id) : null;
    element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    element?.focus({ preventScroll: true });
  }

  #setModel(model: EmailTemplateFormModel): void {
    this.model.set(model);
    this.#baseline.set(model);
    // Opening a table-based template in rich text would destroy it on the first keystroke, and
    // nothing on screen would say so. Start where the content is safe to edit.
    this.bodyMode.set(hasUneditableMarkup(model.body) ? 'source' : 'rich');
  }

  /** Leaves without tripping `unsavedChangesGuard`. */
  #leave(): void {
    this.#baseline.set(this.model());
    this.#router.navigate([this.#scope.listRoute]);
  }
}
