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
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { catchError, finalize, map, Observable, of } from 'rxjs';

import { CanComponentDeactivate } from '@core/guards';
import { Common, IndustriesApi, InstitutionLocationApi } from '@core/services';
import { LookupStore } from '@core/stores';
import { FormActionBar } from '@shared/components/form-action-bar/form-action-bar';
import { SkeletonField } from '@shared/components/form-skeleton/form-skeleton-field';
import { SkeletonToggle } from '@shared/components/form-skeleton/form-skeleton-toggle';
import { SectionCard } from '@shared/components/section-card/section-card';
import { ToggleField } from '@shared/components/toggle-field/toggle-field';
import {
  AttendanceConfigMutationRes,
  CreateInstitutionLocationReq,
  InstitutionProfileOption,
  InstitutionLocationRow,
  InstitutionLocationType,
} from '@shared/interfaces';
import { showFieldError } from '@shared/utilities/field-error';
import { flagUrl } from '@shared/utilities/flag-url';
import { browserTimeZone, IANA_TIME_ZONES } from '@shared/utilities/time-zones';

import { InstitutionLocationFormModel, institutionLocationSchema } from './institution-location-form.schema';

const emptyModel: InstitutionLocationFormModel = {
  locationCode: '',
  locationName: '',
  locationType: null,
  isHeadOffice: false,

  countryId: null,
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

  isActive: true,
};

/** Empty strings go to the API as `null`, which is what the nullable DTO fields expect. */
const nullable = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

interface ToggleConfig {
  id: string;
  label: string;
  field: FieldTree<boolean>;
  hint?: string;
}

@Component({
  selector: 'app-institution-location-form',
  imports: [
    FormField,
    AutoFocusModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TextareaModule,
    ToggleSwitchModule,
    SectionCard,
    FormActionBar,
    SkeletonField,
    SkeletonToggle,
    ToggleField,
  ],
  templateUrl: './institution-location-form.html',
  // Fills the router-outlet's leftover height so the page's own scroll box needs no 100vh math.
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class InstitutionLocationForm implements CanComponentDeactivate {
  readonly #institutionLocationApi = inject(InstitutionLocationApi);
  readonly #industriesApi = inject(IndustriesApi);
  readonly #lookupStore = inject(LookupStore);
  readonly #commonService = inject(Common);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #destroyRef = inject(DestroyRef);

  /** Create and edit are separate route configs, so the id cannot change under the component. */
  protected readonly institutionLocationId =
    Number(this.#route.snapshot.paramMap.get('institutionLocationId')) || null;
  protected readonly isEditMode = this.institutionLocationId !== null;

  protected readonly flagUrl = flagUrl;

  protected readonly countries = this.#lookupStore.countries;
  protected readonly isLoadingCountries = this.#lookupStore.isLoadingCountries;
  protected readonly states = this.#lookupStore.states;
  protected readonly isLoadingStates = this.#lookupStore.isLoadingStates;
  protected readonly districts = this.#lookupStore.districts;
  protected readonly isLoadingDistricts = this.#lookupStore.isLoadingDistricts;
  protected readonly localities = this.#lookupStore.localities;
  protected readonly isLoadingLocalities = this.#lookupStore.isLoadingLocalities;

  protected readonly isSaving = signal(false);
  protected readonly isLoading = signal(false);
  /** Flipped by the first submit attempt, so every outstanding error surfaces at once. */
  protected readonly submitted = signal(false);

  protected readonly model = signal<InstitutionLocationFormModel>(emptyModel);
  /** What the server last told us; `canDeactivate` compares against it. */
  readonly #baseline = signal<InstitutionLocationFormModel>(emptyModel);

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, institutionLocationSchema);

    // Each level of the address cascade waits on the one above it.
    disabled(p.stateId, { when: ({ valueOf }) => valueOf(p.countryId) === null });
    disabled(p.districtId, { when: ({ valueOf }) => valueOf(p.stateId) === null });
    disabled(p.localityId, { when: ({ valueOf }) => valueOf(p.districtId) === null });
    disabled(p.locationType, { when: () => this.isLoadingCampusTypes() });
    // Behaviour, not validation: a radius means nothing without a fence to apply it to.
    disabled(p.geoFenceRadiusMeters, { when: ({ valueOf }) => !valueOf(p.isGeoFenceEnabled) });
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

  protected readonly campusTypeOptions = computed(() => this.#campusTypesResource.value() ?? []);
  protected readonly isLoadingCampusTypes = computed(() => this.#campusTypesResource.isLoading());

  /** A stored zone this runtime does not list still has to be selectable, or saving would wipe it. */
  protected readonly timeZoneOptions = signal<string[]>(IANA_TIME_ZONES);

  protected readonly attendanceToggles: ToggleConfig[] = [
    {
      id: 'isAttendanceAllowed',
      label: 'Attendance allowed',
      field: this.f.isAttendanceAllowed,
      hint: 'StaffMembers may mark attendance from this location',
    },
    {
      id: 'isBiometricEnabled',
      label: 'Biometric enabled',
      field: this.f.isBiometricEnabled,
      hint: 'Devices at this location accept biometric punches',
    },
  ];

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

    if (this.institutionLocationId) {
      this.#hydrate(this.institutionLocationId);
    } else {
      this.#seedBrowserTimeZone();
    }
  }

  /** A new site is almost always in the browser's own zone, so start there rather than blank. */
  #seedBrowserTimeZone(): void {
    const zone = browserTimeZone();
    if (zone) {
      // Through `#setModel` so the default does not read as an unsaved change.
      this.#setModel({ ...this.model(), timeZoneId: zone });
    }
  }

  #setPageHeaderInfo(): void {
    const pageTitle = this.isEditMode ? 'Edit Campus' : 'Add Campus';

    this.#commonService.setPageHeaderInfo({
      pageTitle,
      pageDescription: this.isEditMode
        ? 'Update this campus and its attendance settings'
        : 'Add an Institution campus and configure its attendance settings',
      pageIcon: 'pi pi-map-marker',
      isBreadcrumbShow: true,
    });
    this.#commonService.setBreadcrumbItems([
      { label: 'Campuses', routerLink: '/app/institution-locations' },
      { label: pageTitle },
    ]);
  }

  /** Edits read the row back from the API so the form always reflects server state. */
  #hydrate(id: number): void {
    this.isLoading.set(true);

    this.#institutionLocationApi
      .getInstitutionLocation(id)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          const location = res.isSucceeded ? res.data : null;
          if (!location) {
            this.#commonService.showMessage(res.message || 'Location not found', 'error');
            this.#leave();
            return;
          }
          this.#setModel(this.#toModel(location));
          this.#ensureTimeZoneOption(location.timeZoneId);
          // The saved geography has to be in the dropdowns before the selects can show it.
          this.#lookupStore.loadStates(location.countryId ?? undefined);
          this.#lookupStore.loadDistricts(location.stateId ?? undefined);
          this.#lookupStore.loadLocalities(location.districtId ?? undefined);
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
          this.#leave();
        },
      });
  }

  #ensureTimeZoneOption(zone: string | null | undefined): void {
    if (zone && !this.timeZoneOptions().includes(zone)) {
      this.timeZoneOptions.update((zones) => [zone, ...zones]);
    }
  }

  #toModel(location: InstitutionLocationRow): InstitutionLocationFormModel {
    return {
      ...emptyModel,
      locationCode: location.locationCode ?? '',
      locationName: location.locationName ?? '',
      locationType: location.locationType ?? null,
      isHeadOffice: location.isHeadOffice ?? false,

      countryId: location.countryId ?? null,
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

      isAttendanceAllowed: location.isAttendanceAllowed ?? false,
      isBiometricEnabled: location.isBiometricEnabled ?? false,

      isActive: location.isActive ?? true,
    };
  }

  /** Each level belongs to exactly one parent, so the cascade clears everything downstream. */
  onCountryChange(): void {
    const countryId = this.model().countryId;
    this.model.update((m) => ({ ...m, stateId: null, districtId: null, localityId: null }));
    this.#lookupStore.loadStates(countryId ?? undefined);
    this.#lookupStore.loadDistricts(undefined);
    this.#lookupStore.loadLocalities(undefined);
  }

  onStateChange(): void {
    const stateId = this.model().stateId;
    this.model.update((m) => ({ ...m, districtId: null, localityId: null }));
    this.#lookupStore.loadDistricts(stateId ?? undefined);
    this.#lookupStore.loadLocalities(undefined);
  }

  onDistrictChange(): void {
    const districtId = this.model().districtId;
    this.model.update((m) => ({ ...m, localityId: null }));
    this.#lookupStore.loadLocalities(districtId ?? undefined);
  }

  /**
   * `pTextarea` subscribes to `ngControl.valueChanges`, which Signal Forms does not provide, so the
   * value is written back by hand instead of through `[formField]`.
   */
  onAddressInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.model.update((m) => ({ ...m, address: value }));
    this.f.address().markAsDirty();
    this.f.address().markAsTouched();
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

      const request$: Observable<AttendanceConfigMutationRes> = this.institutionLocationId
        ? this.#institutionLocationApi.updateInstitutionLocation({ ...body, id: this.institutionLocationId })
        : this.#institutionLocationApi.addInstitutionLocation(body);

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
  #buildRequest(value: InstitutionLocationFormModel): CreateInstitutionLocationReq {
    return {
      locationCode: nullable(value.locationCode),
      locationName: nullable(value.locationName),
      // The schema has already ruled out null; the fallbacks only narrow the type.
      locationType: (value.locationType ?? InstitutionLocationType.Branch) as InstitutionLocationType,
      countryId: value.countryId ?? 0,
      stateId: value.stateId,
      districtId: value.districtId,
      localityId: value.localityId,
      address: nullable(value.address),
      landmark: nullable(value.landmark),
      postalCode: nullable(value.postalCode),

      latitude: value.latitude,
      longitude: value.longitude,
      geoFenceRadiusMeters: value.isGeoFenceEnabled ? value.geoFenceRadiusMeters : null,
      timeZoneId: nullable(value.timeZoneId),

      isHeadOffice: value.isHeadOffice,
      isGeoFenceEnabled: value.isGeoFenceEnabled,
      isAttendanceAllowed: value.isAttendanceAllowed,
      isBiometricEnabled: value.isBiometricEnabled,

      isActive: value.isActive,
    };
  }

  onCancel(): void {
    this.#router.navigate(['/app/institution-locations']);
  }

  /** DOM order of the fields, so a blocked submit lands on the first one that needs attention. */
  #focusFirstInvalid(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const ordered: readonly (readonly [string, boolean])[] = [
      ['locationCode', this.showError(this.f.locationCode)],
      ['locationName', this.showError(this.f.locationName)],
      ['locationType', this.showError(this.f.locationType)],
      ['countryId', this.showError(this.f.countryId)],
      ['postalCode', this.showError(this.f.postalCode)],
      ['landmark', this.showError(this.f.landmark)],
      ['address', this.showError(this.f.address)],
      ['latitude', this.showError(this.f.latitude)],
      ['longitude', this.showError(this.f.longitude)],
      ['geoFenceRadiusMeters', this.showError(this.f.geoFenceRadiusMeters)],
      ['timeZoneId', this.showError(this.f.timeZoneId)],
    ];

    const id = ordered.find(([, hasError]) => hasError)?.[0];
    const element = id ? document.getElementById(id) : null;
    element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    element?.focus({ preventScroll: true });
  }

  #setModel(model: InstitutionLocationFormModel): void {
    this.model.set(model);
    this.#baseline.set(model);
  }

  /** Leaves without tripping `unsavedChangesGuard`. */
  #leave(): void {
    this.#baseline.set(this.model());
    this.#router.navigate(['/app/institution-locations']);
  }
}
