import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  disabled,
  type FieldTree,
  form,
  FormField,
  submit,
  validateStandardSchema,
} from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { AutoFocusModule } from '@openng/optimus-ui/autofocus';
import { IconFieldModule } from '@openng/optimus-ui/iconfield';
import { InputGroupModule } from '@openng/optimus-ui/inputgroup';
import { InputGroupAddonModule } from '@openng/optimus-ui/inputgroupaddon';
import { InputIconModule } from '@openng/optimus-ui/inputicon';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { catchError, finalize, map, Observable, of, switchMap } from 'rxjs';

import { CanComponentDeactivate } from '@core/guards';
import { Common, IndustriesApi, SubscriptionsApi, InstitutionsApi } from '@core/services';
import { LookupStore } from '@core/stores';
import { FormActionBar } from '@shared/components/form-action-bar/form-action-bar';
import { FormColor } from '@shared/components/form-inputs/form-color/form-color';
import { FormNumber } from '@shared/components/form-inputs/form-number/form-number';
import { FormSelect } from '@shared/components/form-inputs/form-select/form-select';
import { FormSwitch } from '@shared/components/form-inputs/form-switch/form-switch';
import { FormText } from '@shared/components/form-inputs/form-text/form-text';
import { FormTextarea } from '@shared/components/form-inputs/form-textarea/form-textarea';
import { SkeletonField } from '@shared/components/form-skeleton/form-skeleton-field';
import { SkeletonToggle } from '@shared/components/form-skeleton/form-skeleton-toggle';
import { SectionCard } from '@shared/components/section-card/section-card';
import { ToggleField } from '@shared/components/toggle-field/toggle-field';
import {
  CreateInstitutionByHostReq,
  StaffMemberCodePattern,
  Industry,
  InstitutionProfileOption,
  SubscriptionPlan,
  InstitutionInitialLocationPayload,
  CampusType,
  InstitutionMutationRes,
  InstitutionProfilePayload,
  InstitutionSubscriptionRow,
  UpdateInstitutionByHostReq,
} from '@shared/interfaces';
import { contrastRatio } from '@shared/utilities/color';
import { showFieldError } from '@shared/utilities/field-error';
import { generateInstitutionCode } from '@shared/utilities/institution-code';
import { browserTimeZone, IANA_TIME_ZONES } from '@shared/utilities/time-zones';

import { InstitutionFormModel, institutionCreateSchema, institutionEditSchema } from './institution-form.schema';

const emptyModel: InstitutionFormModel = {
  companyName: '',
  institutionCode: '',
  companyEmailDomain: '',
  institutionEmail: '',
  contactPersonName: '',
  contactNumber: '',
  countryId: null,
  genderId: null,
  subscriptionPlanId: null,
  institutionTypeId: null,
  defaultCurrency: null,
  isActive: true,
  profile: {
    businessType: '',
    websiteUrl: '',
    logoUrl: '',
    themeColor: '#2563eb',
    totalStaffMembers: null,
    totalCampuses: null,
    foundedYear: null,
  },
  initialLocation: {
    locationCode: '',
    locationName: '',
    locationType: CampusType.HeadOffice,
    stateId: null,
    districtId: null,
    localityId: null,
    address: '',
    landmark: '',
    postalCode: '',
    latitude: null,
    longitude: null,
    isGeoFenceEnabled: false,
    geoFenceRadiusMeters: null,
    timeZoneId: '',
    isAttendanceAllowed: true,
    isBiometricEnabled: false,
  },
  staffMemberCodePattern: {
    prefix: '',
    separator: '-',
    runningNumberLength: '4',
    includeYear: false,
    includeMonth: false,
    includeDepartment: false,
  },
};

const SAMPLE_DEPARTMENT_CODE = 'HR';

/** Mirrors how the API assembles an staffMember code, so the pattern fields show what they produce. */
function composeStaffMemberCode(pattern: StaffMemberCodePattern): string {
  const now = new Date();
  const parts = [pattern.prefix?.trim() || 'EMP'];

  if (pattern.includeYear) {
    parts.push(String(now.getFullYear()));
  }
  if (pattern.includeMonth) {
    parts.push(String(now.getMonth() + 1).padStart(2, '0'));
  }
  if (pattern.includeDepartment) {
    parts.push(SAMPLE_DEPARTMENT_CODE);
  }

  const length = Number(pattern.runningNumberLength) || 4;
  parts.push('1'.padStart(length, '0'));

  return parts.join(pattern.separator ?? '');
}

@Component({
  selector: 'app-institution-form',
  imports: [
    FormField,
    AutoFocusModule,
    IconFieldModule,
    InputIconModule,
    InputGroupModule,
    InputGroupAddonModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    SkeletonModule,
    ToggleSwitchModule,
    SectionCard,
    FormActionBar,
    SkeletonField,
    SkeletonToggle,
    ToggleField,
    FormColor,
    FormNumber,
    FormSelect,
    FormSwitch,
    FormText,
    FormTextarea,
  ],
  templateUrl: './institution-form.html',
  // Fills the router-outlet's leftover height so the page's own scroll box needs no 100vh math.
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class InstitutionForm implements CanComponentDeactivate {
  readonly #institutionsApi = inject(InstitutionsApi);
  readonly #subscriptionsApi = inject(SubscriptionsApi);
  readonly #industriesApi = inject(IndustriesApi);
  readonly #commonService = inject(Common);
  readonly #lookupStore = inject(LookupStore);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #destroyRef = inject(DestroyRef);

  /** Create and edit are separate route configs, so the id cannot change under the component.
   *  The id is an opaque token, so it is read as-is rather than parsed. */
  protected readonly institutionId = this.#route.snapshot.paramMap.get('institutionId') || null;
  protected readonly isEditMode = this.institutionId !== null;

  protected readonly countries = this.#lookupStore.countries;
  protected readonly isLoadingCountries = this.#lookupStore.isLoadingCountries;
  protected readonly genders = this.#lookupStore.genders;
  protected readonly isLoadingGenders = this.#lookupStore.isLoadingGenders;
  protected readonly currencies = this.#lookupStore.currencies;
  protected readonly isLoadingCurrencies = this.#lookupStore.isLoadingCurrencies;
  /** `CODE - Name (symbol)`, the label shape the subscription-plan currency select already uses. */
  protected readonly currencyOptions = computed(() =>
    this.currencies().map((currency) => ({
      label: `${currency.code} - ${currency.name} (${currency.symbol})`,
      value: currency.id,
    })),
  );
  protected readonly states = this.#lookupStore.states;
  protected readonly isLoadingStates = this.#lookupStore.isLoadingStates;
  protected readonly districts = this.#lookupStore.districts;
  protected readonly isLoadingDistricts = this.#lookupStore.isLoadingDistricts;
  protected readonly localities = this.#lookupStore.localities;
  protected readonly isLoadingLocalities = this.#lookupStore.isLoadingLocalities;

  protected readonly timeZoneOptions = IANA_TIME_ZONES;
  /** Upper bound on the founded-year input, matching the rule in the schema. */
  protected readonly currentYear = new Date().getFullYear();

  protected readonly isSaving = signal(false);
  protected readonly isLoading = signal(false);
  /** Flipped by the first submit attempt, so every outstanding error surfaces at once. */
  protected readonly submitted = signal(false);

  protected readonly model = signal<InstitutionFormModel>(emptyModel);
  /** What the server last told us; `canDeactivate` compares against it. */
  readonly #baseline = signal<InstitutionFormModel>(emptyModel);
  /** The location row the update replaces. `0` when the institution has none, which asks for a new one. */
  readonly #campusId = signal(0);

  /**
   * The institution's current plan, as `get-institution-by-id` reports it. The plan is write-once so the edit
   * form only displays it — but knowing its id is what lets the plan-scoped industry list load.
   */
  readonly #hydratedPlan = signal<InstitutionSubscriptionRow | null>(null);
  protected readonly hydratedPlan = this.#hydratedPlan.asReadonly();

  /**
   * The industry label as the institution already has it. `profile.industry` is normally derived from
   * the selected industry, but the list is plan-scoped: an industry later unmapped from the plan
   * would not be in it, and deriving would blank a label the institution still has.
   */
  readonly #hydratedIndustryName = signal('');

  /** The phone rule is country-aware, so the schema is rebuilt when the country changes — not on
   *  every keystroke. */
  readonly #countryCode = computed(
    () => this.#findCountry(this.model().countryId)?.countryCode ?? '',
  );

  readonly #schema = computed(() =>
    this.isEditMode
      ? institutionEditSchema(this.#countryCode())
      : institutionCreateSchema(this.#countryCode()),
  );

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, () => this.#schema());

    // A select with no options yet is not something to open, so each one stays disabled until its
    // lookup lands. `get-industries` is plan-scoped on top of that: nothing to pick until a plan is.
    disabled(p.countryId, { when: () => this.isLoadingCountries() });
    disabled(p.genderId, { when: () => this.isLoadingGenders() });
    disabled(p.defaultCurrency, { when: () => this.isLoadingCurrencies() });
    disabled(p.subscriptionPlanId, { when: () => this.isLoadingPlans() });
    disabled(p.institutionTypeId, {
      // On an edit the plan comes from the hydrated institution rather than a select, so the gate reads
      // the resolved id rather than the form field.
      when: () => !this.#selectedPlanId() || this.isLoadingIndustries(),
    });
    disabled(p.profile.businessType, { when: () => this.isLoadingInstitutionCategories() });
    disabled(p.initialLocation.locationType, { when: () => this.isLoadingCampusTypes() });

    // The head office sits in the institution's country, so the state, district and locality cascade
    // off the root country select rather than one of their own.
    disabled(p.initialLocation.stateId, {
      when: ({ valueOf }) => !valueOf(p.countryId) || this.isLoadingStates(),
    });
    disabled(p.initialLocation.districtId, {
      when: ({ valueOf }) => !valueOf(p.initialLocation.stateId) || this.isLoadingDistricts(),
    });
    disabled(p.initialLocation.localityId, {
      when: ({ valueOf }) => !valueOf(p.initialLocation.districtId) || this.isLoadingLocalities(),
    });
    // Behaviour, not validation: a radius means nothing without a fence to apply it to.
    disabled(p.initialLocation.geoFenceRadiusMeters, {
      when: ({ valueOf }) => !valueOf(p.initialLocation.isGeoFenceEnabled),
    });
  });

  readonly #plansResource = rxResource({
    params: () => (this.isEditMode ? undefined : true),
    stream: () =>
      this.#subscriptionsApi.getAllSubscriptionPlan({ IsActive: true }).pipe(
        map((res) => {
          if (!res.isSucceeded) {
            this.#commonService.showMessage(res.message, 'error');
          }
          return res.isSucceeded ? (res.data ?? []) : [];
        }),
        catchError((err) => {
          this.#commonService.showMessage(err.message, 'error');
          return of([] as SubscriptionPlan[]);
        }),
      ),
  });

  /**
   * The plan the industry list hangs off: the create form's select, or the plan the institution is
   * already on when editing.
   *
   * A resource reloads on every `params` re-run, even when the value is identical, so `params` must
   * not read the whole model - it would refire on every keystroke and toggle.
   */
  readonly #selectedPlanId = computed(
    () => this.model().subscriptionPlanId ?? this.#hydratedPlan()?.subscriptionPlanId ?? undefined,
  );

  /** `get-industries` is plan-scoped, so the industry list only exists once a plan is chosen. */
  readonly #industriesResource = rxResource({
    params: () => this.#selectedPlanId(),
    stream: ({ params }) =>
      this.#industriesApi.getIndustries(params).pipe(
        map((res) => {
          if (!res.isSucceeded) {
            this.#commonService.showMessage(res.message, 'error');
          }
          return res.isSucceeded ? (res.data ?? []) : [];
        }),
        catchError((err) => {
          this.#commonService.showMessage(err.message, 'error');
          return of([] as Industry[]);
        }),
      ),
  });

  readonly #institutionCategoriesResource = rxResource({
    stream: () =>
      this.#industriesApi.getInstitutionCategoryOptions().pipe(
        map((res) => {
          if (!res.isSucceeded) {
            this.#commonService.showMessage(res.message, 'error');
          }
          return res.isSucceeded ? (res.data ?? []) : [];
        }),
        catchError((err) => {
          this.#commonService.showMessage(err.message, 'error');
          return of([] as InstitutionProfileOption[]);
        }),
      ),
  });

  readonly #campusTypesResource = rxResource({
    stream: () =>
      this.#industriesApi.getInstitutionCampusTypeOptions().pipe(
        map((res) => {
          if (!res.isSucceeded) {
            this.#commonService.showMessage(res.message, 'error');
          }
          return res.isSucceeded ? (res.data ?? []) : [];
        }),
        catchError((err) => {
          this.#commonService.showMessage(err.message, 'error');
          return of([] as InstitutionProfileOption[]);
        }),
      ),
  });

  protected readonly plans = computed(() => this.#plansResource.value() ?? []);
  protected readonly isLoadingPlans = computed(() => this.#plansResource.isLoading());
  protected readonly industries = computed(() => this.#industriesResource.value() ?? []);
  protected readonly isLoadingIndustries = computed(() => this.#industriesResource.isLoading());
  protected readonly institutionCategories = computed(
    () => this.#institutionCategoriesResource.value() ?? [],
  );
  protected readonly isLoadingInstitutionCategories = computed(() =>
    this.#institutionCategoriesResource.isLoading(),
  );
  protected readonly campusTypeOptions = computed(() => this.#campusTypesResource.value() ?? []);
  protected readonly isLoadingCampusTypes = computed(() => this.#campusTypesResource.isLoading());

  /** The pattern is editable in both modes now, so the preview always reads the live form. */
  protected readonly staffMemberCodePreview = computed(() => {
    const pattern = this.model().staffMemberCodePattern;
    return composeStaffMemberCode({
      prefix: pattern.prefix,
      separator: pattern.separator,
      runningNumberLength: pattern.runningNumberLength,
      includeYear: !!pattern.includeYear,
      includeMonth: !!pattern.includeMonth,
      includeDepartment: !!pattern.includeDepartment,
    });
  });

  /**
   * The accent is drawn on the workspace's white surfaces, so below the WCAG non-text
   * minimum every button built from it fails AA. Advisory rather than a schema rule:
   * institutions already carry light brand colours, and a host has to stay able to save one
   * while fixing something else.
   */
  protected readonly themeColorHint = computed(() => {
    const ratio = contrastRatio(this.model().profile.themeColor, '#ffffff');
    return ratio !== null && ratio < 3
      ? 'Very light on white. Buttons and links using it may be hard to read.'
      : "Accent colour for the institution's workspace";
  });

  protected readonly dialCode = computed(
    () => this.#findCountry(this.model().countryId)?.stdCode ?? '',
  );

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

    if (this.institutionId) {
      this.#hydrate(this.institutionId);
    } else {
      this.#seedBrowserTimeZone();
    }
  }

  /** A new head office is almost always in the browser's own zone, so start there, not blank. */
  #seedBrowserTimeZone(): void {
    const zone = browserTimeZone();
    if (!zone) {
      return;
    }
    // Through `#setModel` so the default does not read as an unsaved change.
    this.#setModel({
      ...this.model(),
      initialLocation: { ...this.model().initialLocation, timeZoneId: zone },
    });
  }

  #setPageHeaderInfo(): void {
    const pageTitle = this.isEditMode ? 'Edit Institution' : 'Create Institution';

    this.#commonService.setPageHeaderInfo({
      pageTitle,
      pageDescription: this.isEditMode
        ? 'Update the Institution profile, campus and contact details'
        : 'Onboard an Institution onto a subscription plan',
      pageIcon: 'pi pi-building',
      isBreadcrumbShow: true,
    });
    this.#commonService.setBreadcrumbItems([
      { label: 'Institutions', routerLink: '/app/institutions' },
      { label: pageTitle },
    ]);
  }

  /**
   * Edits read the institution back from the API so the form always reflects server state.
   * `get-institution-by-id` answers with the whole aggregate — profile, head office, code pattern and
   * the subscription — so one call fills every section and `#baseline` is set exactly once.
   */
  #hydrate(id: string): void {
    this.isLoading.set(true);

    this.#institutionsApi
      .getInstitutionById(id)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          const institution = res.isSucceeded ? res.data : null;
          if (!institution) {
            this.#commonService.showMessage(res.message || 'Institution not found', 'error');
            this.#leave();
            return;
          }

          // Every child is an array even where only one row is meaningful.
          const profile = institution.profiles?.[0] ?? null;
          const pattern = institution.staffMemberCodePatterns?.[0] ?? null;
          const location =
            institution.campuses?.find((row) => row.isHeadOffice) ?? institution.campuses?.[0] ?? null;

          // The plan is write-once, but knowing it is what lets the industry list load on an edit.
          this.#hydratedPlan.set(institution.subscriptions?.[0] ?? null);
          this.#hydratedIndustryName.set(institution.institutionTypeName ?? '');
          this.#campusId.set(location?.id ?? 0);

          this.#setModel({
            ...emptyModel,
            companyName: institution.companyName ?? '',
            institutionCode: institution.institutionCode ?? '',
            companyEmailDomain: institution.companyEmailDomain ?? '',
            institutionEmail: institution.institutionEmail ?? '',
            contactPersonName: institution.contactPersonName ?? '',
            contactNumber: this.#stripDialCode(institution.contactNumber ?? '', institution.countryId),
            countryId: institution.countryId,
            genderId: institution.genderId ?? null,
            institutionTypeId: institution.institutionTypeId ?? null,
            defaultCurrency: institution.defaultCurrency,
            isActive: institution.isActive,
            profile: profile
              ? {
                  businessType: profile.businessType ?? '',
                  websiteUrl: profile.websiteUrl ?? '',
                  logoUrl: profile.logoUrl ?? '',
                  themeColor: profile.themeColor ?? emptyModel.profile.themeColor,
                  totalStaffMembers: profile.totalStaffMembers ?? null,
                  totalCampuses: profile.totalCampuses ?? null,
                  foundedYear: profile.foundedYear ?? null,
                }
              : emptyModel.profile,
            staffMemberCodePattern: pattern
              ? {
                  prefix: pattern.prefix ?? '',
                  separator: pattern.separator ?? '',
                  // Returned as a number; both write DTOs take a string.
                  runningNumberLength: String(
                    pattern.runningNumberLength ??
                      emptyModel.staffMemberCodePattern.runningNumberLength,
                  ),
                  includeYear: !!pattern.includeYear,
                  includeMonth: !!pattern.includeMonth,
                  includeDepartment: !!pattern.includeDepartment,
                }
              : emptyModel.staffMemberCodePattern,
            initialLocation: location
              ? {
                  locationCode: location.locationCode ?? '',
                  locationName: location.locationName ?? '',
                  locationType: location.locationType ?? CampusType.HeadOffice,
                  stateId: location.stateId ?? null,
                  districtId: location.districtId ?? null,
                  localityId: location.localityId ?? null,
                  address: location.address ?? '',
                  landmark: location.landmark ?? '',
                  postalCode: location.postalCode ?? '',
                  latitude: location.latitude ?? null,
                  longitude: location.longitude ?? null,
                  isGeoFenceEnabled: location.isGeoFenceEnabled ?? false,
                  geoFenceRadiusMeters: location.geoFenceRadiusMeters ?? null,
                  timeZoneId: location.timeZoneId ?? '',
                  isAttendanceAllowed: location.isAttendanceAllowed ?? true,
                  isBiometricEnabled: location.isBiometricEnabled ?? false,
                }
              : // A institution with no location yet still needs a sensible zone to start from.
                { ...emptyModel.initialLocation, timeZoneId: browserTimeZone() },
          });

          // The cascade is keyed off the hydrated values, or the downstream selects open empty.
          this.#lookupStore.loadStates(institution.countryId);
          this.#lookupStore.loadDistricts(location?.stateId ?? undefined);
          this.#lookupStore.loadLocalities(location?.districtId ?? undefined);
        },
        error: (err) => this.#commonService.showMessage(err.message, 'error'),
      });
  }

  /** Fills the institution code from the company initials, the way self-service registration does. */
  onCompanyNameBlur(): void {
    const { companyName, institutionCode } = this.model();
    if (institutionCode.trim()) {
      return;
    }
    this.model.update((m) => ({ ...m, institutionCode: generateInstitutionCode(companyName) }));
  }

  /** Each level belongs to exactly one parent, so the cascade clears downstream. */
  onCountryChange(): void {
    const countryId = this.model().countryId;
    this.model.update((m) => ({
      ...m,
      initialLocation: { ...m.initialLocation, stateId: null, districtId: null, localityId: null },
    }));
    this.#lookupStore.loadStates(countryId ?? undefined);
    this.#lookupStore.loadDistricts(undefined);
    this.#lookupStore.loadLocalities(undefined);
  }

  onStateChange(): void {
    const stateId = this.model().initialLocation.stateId;
    this.model.update((m) => ({
      ...m,
      initialLocation: { ...m.initialLocation, districtId: null, localityId: null },
    }));
    this.#lookupStore.loadDistricts(stateId ?? undefined);
    this.#lookupStore.loadLocalities(undefined);
  }

  onDistrictChange(): void {
    const districtId = this.model().initialLocation.districtId;
    this.model.update((m) => ({
      ...m,
      initialLocation: { ...m.initialLocation, localityId: null },
    }));
    this.#lookupStore.loadLocalities(districtId ?? undefined);
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
      const value = this.model();
      this.isSaving.set(true);

      const institutionId = this.institutionId;
      // The host update DTO has no `isActive` field, so the status change is a second call.
      const statusChanged = !!institutionId && !!value.isActive !== !!this.#baseline().isActive;

      const request$: Observable<{ isSucceeded: boolean; message: string }> = institutionId
        ? this.#institutionsApi
            .updateInstitutionByHost(institutionId, this.#buildHostUpdateRequest(value))
            .pipe(
              switchMap((res) =>
                res.isSucceeded && statusChanged
                  ? this.#setActive(institutionId, !!value.isActive)
                  : of(res),
              ),
            )
        : this.#institutionsApi.createInstitutionByHost(this.#buildHostCreateRequest(value));

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

  /**
   * The schema validates the model in place, so the request body is where trimming happens.
   *
   * The plan is the only write-once field the update DTO does not carry, so it is displayed rather
   * than collected.
   */
  #buildHostUpdateRequest(value: InstitutionFormModel): UpdateInstitutionByHostReq {
    const { profile, initialLocation, staffMemberCodePattern } = value;

    return {
      institutionTypeId: value.institutionTypeId ?? 0,
      companyName: value.companyName.trim(),
      institutionCode: value.institutionCode.trim(),
      companyEmailDomain: value.companyEmailDomain.trim(),
      institutionEmail: value.institutionEmail.trim(),
      contactPersonName: value.contactPersonName.trim(),
      genderId: value.genderId ?? 0,
      contactNumber: this.#prependDialCode(value.contactNumber),
      countryId: value.countryId ?? 0,
      // `null` where the institution has none: the PUT rejects `0` as an invalid configuration
      // reference, and the reads answer `null` for the same field.
      defaultCurrency: value.defaultCurrency,
      profile: this.#buildProfile(profile, value.institutionTypeId ?? null),
      selectedLocation: {
        ...this.#buildLocation(initialLocation),
        campusId: this.#campusId(),
        // The head office sits in the institution's country, which the root of the request already has.
        countryId: value.countryId ?? 0,
      },
      staffMemberCodePattern: this.#buildCodePattern(staffMemberCodePattern),
    };
  }

  #setActive(id: string, isActive: boolean): Observable<InstitutionMutationRes> {
    const body = { institutionId: id };
    return isActive
      ? this.#institutionsApi.activateInstitution(body)
      : this.#institutionsApi.deactivateInstitution(body);
  }

  #buildHostCreateRequest(value: InstitutionFormModel): CreateInstitutionByHostReq {
    const { profile, initialLocation, staffMemberCodePattern } = value;

    return {
      // The schema has already ruled out null; the fallbacks only narrow the type.
      subscriptionPlanId: value.subscriptionPlanId ?? 0,
      institutionTypeId: value.institutionTypeId ?? 0,
      companyName: value.companyName.trim(),
      institutionCode: value.institutionCode.trim(),
      companyEmailDomain: value.companyEmailDomain.trim(),
      genderId: value.genderId ?? 0,
      institutionEmail: value.institutionEmail.trim(),
      contactPersonName: value.contactPersonName.trim(),
      contactNumber: this.#prependDialCode(value.contactNumber),
      countryId: value.countryId ?? 0,
      profile: this.#buildProfile(profile, value.institutionTypeId),
      initialLocation: this.#buildLocation(initialLocation),
      staffMemberCodePattern: this.#buildCodePattern(staffMemberCodePattern),
    };
  }

  // The two host DTOs share these three blocks; only their wrappers differ.

  #buildProfile(
    profile: InstitutionFormModel['profile'],
    industryId: number | null,
  ): InstitutionProfilePayload {
    return {
      logoUrl: profile.logoUrl.trim(),
      themeColor: profile.themeColor.trim(),
      businessType: profile.businessType.trim(),
      // The DTO carries the Institution type twice - as `institutionTypeId` and as its label here. The list
      // is plan-scoped, so an industry the plan no longer maps falls back to the hydrated label
      // rather than blanking one the institution still has.
      industry:
        this.#findIndustry(industryId)?.institutionTypeName ?? this.#hydratedIndustryName(),
      totalStaffMembers: profile.totalStaffMembers ?? 0,
      totalCampuses: profile.totalCampuses ?? 0,
      foundedYear: profile.foundedYear ?? 0,
      websiteUrl: profile.websiteUrl.trim(),
    };
  }

  #buildLocation(location: InstitutionFormModel['initialLocation']): InstitutionInitialLocationPayload {
    return {
      locationCode: location.locationCode.trim(),
      locationName: location.locationName.trim(),
      locationType: (location.locationType ?? CampusType.HeadOffice) as CampusType,
      stateId: location.stateId,
      districtId: location.districtId,
      localityId: location.localityId,
      address: location.address.trim(),
      landmark: location.landmark.trim(),
      postalCode: location.postalCode.trim(),
      latitude: location.latitude,
      longitude: location.longitude,
      // The radius input is only *disabled* when the fence is off, so it keeps whatever was typed.
      // Persisting that would silently restore a radius nobody re-confirmed the next time the fence
      // is switched on. Same rule as `campus-form.ts`.
      geoFenceRadiusMeters: location.isGeoFenceEnabled ? location.geoFenceRadiusMeters : null,
      timeZoneId: location.timeZoneId.trim(),
      isGeoFenceEnabled: location.isGeoFenceEnabled,
      isAttendanceAllowed: location.isAttendanceAllowed,
      isBiometricEnabled: location.isBiometricEnabled,
    };
  }

  #buildCodePattern(pattern: InstitutionFormModel['staffMemberCodePattern']): StaffMemberCodePattern {
    return {
      prefix: pattern.prefix.trim(),
      separator: pattern.separator,
      runningNumberLength: pattern.runningNumberLength,
      includeYear: pattern.includeYear,
      includeMonth: pattern.includeMonth,
      includeDepartment: pattern.includeDepartment,
    };
  }

  onCancel(): void {
    this.#router.navigate(['/app/institutions']);
  }

  /** DOM order of the fields, so a blocked submit lands on the first one that needs attention. */
  #focusFirstInvalid(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const ordered: readonly (readonly [string, boolean])[] = [
      ['companyName', this.showError(this.f.companyName)],
      ['institutionCode', this.showError(this.f.institutionCode)],
      ['companyEmailDomain', this.showError(this.f.companyEmailDomain)],
      ['contactPersonName', this.showError(this.f.contactPersonName)],
      ['institutionEmail', this.showError(this.f.institutionEmail)],
      ['countryId', this.showError(this.f.countryId)],
      ['contactNumber', this.showError(this.f.contactNumber)],
      ['genderId', this.showError(this.f.genderId)],
      ['subscriptionPlanId', this.showError(this.f.subscriptionPlanId)],
      ['institutionTypeId', this.showError(this.f.institutionTypeId)],
      ['profile-businessType', this.showError(this.f.profile.businessType)],
      ['profile-websiteUrl', this.showError(this.f.profile.websiteUrl)],
      ['profile-logoUrl', this.showError(this.f.profile.logoUrl)],
      ['profile-themeColor', this.showError(this.f.profile.themeColor)],
      ['profile-totalStaffMembers', this.showError(this.f.profile.totalStaffMembers)],
      ['profile-totalCampuses', this.showError(this.f.profile.totalCampuses)],
      ['profile-foundedYear', this.showError(this.f.profile.foundedYear)],
      ['location-locationCode', this.showError(this.f.initialLocation.locationCode)],
      ['location-locationName', this.showError(this.f.initialLocation.locationName)],
      ['location-locationType', this.showError(this.f.initialLocation.locationType)],
      ['location-timeZoneId', this.showError(this.f.initialLocation.timeZoneId)],
      ['location-stateId', this.showError(this.f.initialLocation.stateId)],
      ['location-districtId', this.showError(this.f.initialLocation.districtId)],
      ['location-localityId', this.showError(this.f.initialLocation.localityId)],
      ['location-postalCode', this.showError(this.f.initialLocation.postalCode)],
      ['location-landmark', this.showError(this.f.initialLocation.landmark)],
      ['location-address', this.showError(this.f.initialLocation.address)],
      ['location-latitude', this.showError(this.f.initialLocation.latitude)],
      ['location-longitude', this.showError(this.f.initialLocation.longitude)],
      [
        'location-geoFenceRadiusMeters',
        this.showError(this.f.initialLocation.geoFenceRadiusMeters),
      ],
      ['pattern-prefix', this.showError(this.f.staffMemberCodePattern.prefix)],
      ['pattern-separator', this.showError(this.f.staffMemberCodePattern.separator)],
      [
        'pattern-runningNumberLength',
        this.showError(this.f.staffMemberCodePattern.runningNumberLength),
      ],
    ];

    const id = ordered.find(([, hasError]) => hasError)?.[0];
    const element = id ? document.getElementById(id) : null;
    element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    element?.focus({ preventScroll: true });
  }

  #setModel(model: InstitutionFormModel): void {
    this.model.set(model);
    this.#baseline.set(model);
  }

  /** Leaves without tripping `unsavedChangesGuard`. */
  #leave(): void {
    this.#baseline.set(this.model());
    this.#router.navigate(['/app/institutions']);
  }

  #findCountry(countryId: number | null) {
    return this.countries().find((c) => c.id === countryId);
  }

  #findIndustry(industryId: number | null) {
    return this.industries().find((i) => i.id === industryId);
  }

  #prependDialCode(number: string): string {
    const trimmed = number?.trim() || '';
    const dialCode = this.dialCode();
    return dialCode && trimmed ? `${dialCode}${trimmed}` : trimmed;
  }

  /**
   * The API stores the number with its dial code; the field edits the local part only.
   *
   * Stored numbers are also observed to carry spaces (`"+9198765 43210"`), which the country phone
   * rule rejects — so whitespace goes too, or a freshly hydrated form reports an error the user
   * never caused.
   */
  #stripDialCode(number: string, countryId: number): string {
    const stored = (number ?? '').replace(/\s+/g, '');
    const dialCode = this.#findCountry(countryId)?.stdCode ?? '';
    return dialCode && stored.startsWith(dialCode) ? stored.slice(dialCode.length) : stored;
  }
}
