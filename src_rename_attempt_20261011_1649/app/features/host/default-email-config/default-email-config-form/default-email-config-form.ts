import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { type FieldTree, form, submit, validateStandardSchema } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, Observable } from 'rxjs';

import { CanComponentDeactivate } from '@core/guards';
import { Common, DefaultEmailConfigApi } from '@core/services';
import { FormActionBar } from '@shared/components/form-action-bar/form-action-bar';
import { FormNumber } from '@shared/components/form-inputs/form-number/form-number';
import { FormPassword } from '@shared/components/form-inputs/form-password/form-password';
import { FormSwitch } from '@shared/components/form-inputs/form-switch/form-switch';
import { FormText } from '@shared/components/form-inputs/form-text/form-text';
import { SkeletonField } from '@shared/components/form-skeleton/form-skeleton-field';
import { SectionCard } from '@shared/components/section-card/section-card';
import {
  CreateDefaultEmailConfigReq,
  DefaultEmailConfigMutationRes,
  DefaultEmailConfigRow,
} from '@shared/interfaces';
import { showFieldError } from '@shared/utilities/field-error';

import {
  DefaultEmailConfigFormModel,
  defaultEmailConfigSchema,
} from './default-email-config-form.schema';

const LIST_ROUTE = '/app/default-email-config';

const emptyModel: DefaultEmailConfigFormModel = {
  configName: '',
  smtpHost: '',
  smtpPort: 587,
  smtpUsername: '',
  smtpPassword: '',
  fromEmail: '',
  fromName: '',
  isActive: true,
  isDefault: false,
};

/** Empty strings go to the API as `null`, which is what the nullable DTO fields expect. */
const nullable = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

@Component({
  selector: 'app-default-email-config-form',
  imports: [
    SectionCard,
    FormActionBar,
    FormText,
    FormNumber,
    FormPassword,
    FormSwitch,
    SkeletonField,
  ],
  templateUrl: './default-email-config-form.html',
  // Fills the router-outlet's leftover height so the page's own scroll box needs no 100vh math.
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DefaultEmailConfigForm implements CanComponentDeactivate {
  readonly #api = inject(DefaultEmailConfigApi);
  readonly #commonService = inject(Common);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #destroyRef = inject(DestroyRef);

  /** Create and edit are separate route configs, so the id cannot change under the component. */
  protected readonly configId = Number(this.#route.snapshot.paramMap.get('configId')) || null;
  protected readonly isEditMode = this.configId !== null;

  protected readonly isSaving = signal(false);
  protected readonly isLoading = signal(false);
  /** Flipped by the first submit attempt, so every outstanding error surfaces at once. */
  protected readonly submitted = signal(false);

  protected readonly model = signal<DefaultEmailConfigFormModel>(emptyModel);
  /** What the server last told us; `canDeactivate` compares against it. */
  readonly #baseline = signal<DefaultEmailConfigFormModel>(emptyModel);

  /**
   * The password is the one rule that differs by mode: `/create` has to carry it, while `/update`
   * preserves the stored secret whenever the key is absent.
   */
  readonly #schema = defaultEmailConfigSchema(this.isEditMode ? 'edit' : 'create');

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, this.#schema);
  });

  protected readonly isDirty = computed(
    () => JSON.stringify(this.model()) !== JSON.stringify(this.#baseline()),
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

    if (this.configId) {
      this.#hydrate(this.configId);
    }
  }

  #setPageHeaderInfo(): void {
    const pageTitle = this.isEditMode ? 'Edit Email Configuration' : 'Add Email Configuration';

    this.#commonService.setPageHeaderInfo({
      pageTitle,
      pageDescription: this.isEditMode
        ? 'Update the SMTP account the platform sends mail from'
        : 'Set the SMTP account the platform sends mail from',
      pageIcon: 'pi pi-envelope',
      isBreadcrumbShow: true,
    });
    this.#commonService.setBreadcrumbItems([
      { label: 'Default Email Configuration', routerLink: LIST_ROUTE },
      { label: pageTitle },
    ]);
  }

  /** Edits read the row back from the API so the form always reflects server state. */
  #hydrate(id: number): void {
    this.isLoading.set(true);

    this.#api
      .getDefaultEmailConfig(id)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          const config = res.isSucceeded ? res.data : null;
          if (!config) {
            this.#commonService.showMessage(res.message || 'Configuration not found', 'error');
            this.#leave();
            return;
          }
          this.#setModel(this.#toModel(config));
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
          this.#leave();
        },
      });
  }

  #toModel(row: DefaultEmailConfigRow): DefaultEmailConfigFormModel {
    return {
      ...emptyModel,
      configName: row.configName ?? '',
      smtpHost: row.smtpHost ?? '',
      smtpPort: row.smtpPort ?? null,
      smtpUsername: row.smtpUsername ?? '',
      // Never returned. On an edit the schema lets it stay blank, and a blank one is not sent.
      smtpPassword: '',
      fromEmail: row.fromEmail ?? '',
      fromName: row.fromName ?? '',
      isActive: row.isActive ?? false,
      isDefault: row.isDefault ?? false,
    };
  }

  onSubmit(): void {
    if (this.isSaving() || this.isLoading()) {
      return;
    }

    // The button stays enabled while the form is invalid, so submitting is how the user asks
    // "what is wrong?" — reveal everything, then take them to the first field to fix.
    this.submitted.set(true);
    this.f().markAsTouched();

    if (this.f().invalid()) {
      this.#focusFirstInvalid();
      return;
    }

    submit(this.f, async () => {
      const body = this.#buildRequest(this.model());
      this.isSaving.set(true);

      const request$: Observable<DefaultEmailConfigMutationRes> = this.configId
        ? this.#api.updateDefaultEmailConfig({ ...body, id: this.configId })
        : this.#api.addDefaultEmailConfig(body);

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
  #buildRequest(value: DefaultEmailConfigFormModel): CreateDefaultEmailConfigReq {
    // Sent as typed — a password's own leading or trailing spaces are part of it. Only the
    // keep-or-replace decision reads the trimmed form.
    const password = value.smtpPassword;

    return {
      configName: nullable(value.configName),
      smtpHost: nullable(value.smtpHost),
      // The schema has already ruled out null; the fallback only narrows the type.
      smtpPort: value.smtpPort ?? 0,
      smtpUsername: nullable(value.smtpUsername),
      // Omitted, not blanked: an absent key is what tells `/update` to keep the stored secret.
      ...(password.trim() === '' ? {} : { smtpPassword: password }),
      fromEmail: nullable(value.fromEmail),
      fromName: nullable(value.fromName),
      isActive: value.isActive,
      isDefault: value.isDefault,
    };
  }

  onCancel(): void {
    this.#router.navigate([LIST_ROUTE]);
  }

  /** DOM order of the fields, so a blocked submit lands on the first one that needs attention. */
  #focusFirstInvalid(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const ordered: readonly (readonly [string, boolean])[] = [
      ['configName', this.showError(this.f.configName)],
      ['smtpHost', this.showError(this.f.smtpHost)],
      ['smtpPort', this.showError(this.f.smtpPort)],
      ['smtpUsername', this.showError(this.f.smtpUsername)],
      ['smtpPassword', this.showError(this.f.smtpPassword)],
      ['fromEmail', this.showError(this.f.fromEmail)],
      ['fromName', this.showError(this.f.fromName)],
    ];

    const id = ordered.find(([, hasError]) => hasError)?.[0];
    const element = id ? document.getElementById(id) : null;
    element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    element?.focus({ preventScroll: true });
  }

  #setModel(model: DefaultEmailConfigFormModel): void {
    this.model.set(model);
    this.#baseline.set(model);
  }

  /** Leaves without tripping `unsavedChangesGuard`. */
  #leave(): void {
    this.#baseline.set(this.model());
    this.#router.navigate([LIST_ROUTE]);
  }
}
