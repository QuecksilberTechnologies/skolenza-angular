import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  disabled,
  type FieldTree,
  form,
  submit,
  validateStandardSchema,
} from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';
import { catchError, finalize, map, of } from 'rxjs';

import { AuthApi, Common, IndustriesApi, InstitutionsApi } from '@core/services';
import { LookupStore } from '@core/stores';
import AuthCard from '@shared/components/auth-card/auth-card';
import { FormCountry } from '@shared/components/form-inputs/form-country/form-country';
import { FormPhone } from '@shared/components/form-inputs/form-phone/form-phone';
import { FormSelect } from '@shared/components/form-inputs/form-select/form-select';
import { FormText } from '@shared/components/form-inputs/form-text/form-text';
import {
  Industry,
  RegisterInstitutionRequest,
  RegisterInstitutionResponse,
} from '@shared/interfaces';
import { showFieldError } from '@shared/utilities/field-error';
import { generateInstitutionCode } from '@shared/utilities/institution-code';

import { RegistrationModel, registrationSchema } from './registration.schema';

const emptyModel: RegistrationModel = {
  companyName: '',
  companyEmailDomain: '',
  institutionEmail: '',
  contactPersonName: '',
  contactNumber: '',
  countryId: null,
  genderId: null,
  institutionTypeId: null,
  prefix: '',
};

@Component({
  selector: 'app-register',
  imports: [RouterModule, ButtonModule, AuthCard, FormText, FormSelect, FormCountry, FormPhone],
  templateUrl: './registration.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Registration {
  readonly #institutionsApi = inject(InstitutionsApi);
  readonly #industriesApi = inject(IndustriesApi);
  readonly #authApi = inject(AuthApi);
  readonly #commonService = inject(Common);
  readonly #lookupStore = inject(LookupStore);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #destroyRef = inject(DestroyRef);

  /** Read as a signal rather than off the snapshot: the plan picker navigates to this same route,
   *  which reuses the component, so a snapshot would pin the first plan the page ever saw. */
  readonly #queryParams = toSignal(this.#route.queryParamMap);
  protected readonly planId = computed(() => Number(this.#queryParams()?.get('planId')) || 0);

  protected readonly countries = this.#lookupStore.countries;
  protected readonly isLoadingCountries = this.#lookupStore.isLoadingCountries;
  protected readonly genders = this.#lookupStore.genders;
  protected readonly isLoadingGenders = this.#lookupStore.isLoadingGenders;

  protected readonly isLoading = signal(false);
  /** Flipped by the first submit attempt, so every outstanding error surfaces at once. */
  protected readonly submitted = signal(false);

  protected readonly model = signal<RegistrationModel>(emptyModel);

  /** The phone rule is country-aware, so the schema is rebuilt when the country changes — not on
   *  every keystroke. */
  readonly #countryCode = computed(() => this.#findCountry()?.countryCode ?? '');
  readonly #schema = computed(() => registrationSchema(this.#countryCode()));

  protected readonly dialCode = computed(() => this.#findCountry()?.stdCode ?? '');

  /**
   * `get-industries` is plan-scoped, so the list hangs off the plan this registration is for.
   *
   * `IndustriesApi` also carries `industries` / `isLoading` signals of its own; they are a
   * layering violation its other callers still rely on, so this reads the endpoint directly.
   */
  readonly #industriesResource = rxResource({
    params: () => this.planId(),
    stream: ({ params }) =>
      this.#industriesApi.getIndustries(params).pipe(
        map((res) => {
          if (!res.isSucceeded) {
            this.#commonService.showMessage(res.message, 'error');
          }
          return res.isSucceeded ? (res.data ?? []) : [];
        }),
        catchError((err: Error) => {
          this.#commonService.showMessage(err.message, 'error');
          return of([] as Industry[]);
        }),
      ),
  });

  protected readonly industries = computed(() => this.#industriesResource.value() ?? []);
  protected readonly isLoadingIndustries = computed(() => this.#industriesResource.isLoading());

  /** Signal Forms skips validation on a disabled field, so while a lookup is in flight its select
   *  reports no error and a submit would post `0` for it. Nothing leaves until all three land. */
  protected readonly isLoadingLookups = computed(
    () => this.isLoadingCountries() || this.isLoadingGenders() || this.isLoadingIndustries(),
  );

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, () => this.#schema());

    // A select with no options yet is not something to open, so each one stays disabled until
    // its lookup lands.
    disabled(p.countryId, { when: () => this.isLoadingCountries() });
    disabled(p.genderId, { when: () => this.isLoadingGenders() });
    disabled(p.institutionTypeId, { when: () => this.isLoadingIndustries() });
  });

  constructor() {
    this.#authApi.isAuthenticatedUser();
    // Countries and genders are global reference data, and nobody is signed in yet. `'0'` is the
    // staffMember id this page has always sent for both; the host path passes none at all.
    this.#lookupStore.initializeGlobalOptions('0');
  }

  /** Templates call this per field; the rule itself lives in `@shared/utilities/field-error`. */
  protected showError<T>(field: FieldTree<T>): boolean {
    return showFieldError(field, this.submitted());
  }

  onRegister(): void {
    if (this.isLoading() || this.isLoadingLookups()) {
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
      const value = this.model();
      const institutionEmail = value.institutionEmail.trim();

      this.isLoading.set(true);
      this.#institutionsApi
        .registerInstitution(this.#buildRequest(value, institutionEmail))
        .pipe(
          finalize(() => this.isLoading.set(false)),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: (response) => {
            if (response.isSucceeded) {
              this.#router.navigate(['/auth/registration-email-check'], {
                queryParams: {
                  email: institutionEmail,
                  emailSent: response.data?.emailSent !== false,
                },
              });
            } else {
              this.#commonService.showMessage(this.#registrationFailureMessage(response), 'error');
            }
          },
          error: (error: unknown) => {
            this.#commonService.showMessage(this.#requestFailureMessage(error), 'error');
          },
        });
    });
  }

  /**
   * The schema validates the model in place, so the request body is where trimming happens.
   *
   * The institution code is derived rather than collected: the company name is the only thing it has
   * ever been built from, so the form used to carry a hidden field for it.
   */
  #buildRequest(value: RegistrationModel, institutionEmail: string): RegisterInstitutionRequest {
    const companyName = value.companyName.trim();

    return {
      subscriptionPlanId: this.planId(),
      institutionTypeId: value.institutionTypeId ?? 0,
      institutionName: companyName,
      institutionCode: generateInstitutionCode(companyName),
      staffCodePrefix: value.prefix.trim(),
      institutionEmailDomain: value.companyEmailDomain.trim(),
      genderId: value.genderId ?? 0,
      institutionEmail,
      contactPersonName: value.contactPersonName.trim(),
      contactNumber: this.#prependDialCode(value.contactNumber),
      countryId: value.countryId ?? 0,
    };
  }

  /** Keeps application failures readable when the API returns HTTP 200 with a failed envelope. */
  #registrationFailureMessage(response: RegisterInstitutionResponse): string {
    const messages = [response.message, ...(response.errors ?? [])]
      .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
      .map((value) => value.trim());
    const distinctMessages = [...new Set(messages)];

    return (
      distinctMessages.join(' ') ||
      'Institution account could not be created. Review the information and try again.'
    );
  }

  /** Transport failures already carry a safe message from BaseService; unknown failures get a fallback. */
  #requestFailureMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message.trim();
    }

    return 'Unable to create the institution account. Check the connection and try again.';
  }

  /** DOM order of the fields, so a blocked submit lands on the first one that needs attention. */
  #focusFirstInvalid(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const ordered: readonly (readonly [string, boolean])[] = [
      ['companyName', this.showError(this.f.companyName)],
      ['companyEmailDomain', this.showError(this.f.companyEmailDomain)],
      ['institutionEmail', this.showError(this.f.institutionEmail)],
      ['contactPersonName', this.showError(this.f.contactPersonName)],
      ['countryId', this.showError(this.f.countryId)],
      ['contactNumber', this.showError(this.f.contactNumber)],
      ['genderId', this.showError(this.f.genderId)],
      ['institutionTypeId', this.showError(this.f.institutionTypeId)],
      ['prefix', this.showError(this.f.prefix)],
    ];

    const id = ordered.find(([, hasError]) => hasError)?.[0];
    const element = id ? document.getElementById(id) : null;
    element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    element?.focus({ preventScroll: true });
  }

  #findCountry() {
    return this.countries().find((country) => country.id === this.model().countryId);
  }

  #prependDialCode(number: string): string {
    const trimmed = number.trim();
    const dialCode = this.dialCode();
    return dialCode && trimmed ? `${dialCode}${trimmed}` : trimmed;
  }
}
