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
  type FieldTree,
  form,
  FormField,
  submit,
  validateStandardSchema,
} from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { AutoFocusModule } from '@openng/optimus-ui/autofocus';
import { DatePickerModule } from '@openng/optimus-ui/datepicker';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { catchError, finalize, map, Observable, of } from 'rxjs';

import { CanComponentDeactivate } from '@core/guards';
import {
  Common,
  DeviceMasterApi,
  InstitutionDeviceApi,
  InstitutionLocationApi,
  InstitutionsApi,
} from '@core/services';
import { FormActionBar } from '@shared/components/form-action-bar/form-action-bar';
import { SkeletonField } from '@shared/components/form-skeleton/form-skeleton-field';
import { SectionCard } from '@shared/components/section-card/section-card';
import { ToggleField } from '@shared/components/toggle-field/toggle-field';
import {
  CreateInstitutionDeviceReq,
  DeviceMasterRow,
  DeviceMutationRes,
  IInstitution,
  InstitutionDeviceRow,
  InstitutionLocationRow,
} from '@shared/interfaces';
import { showFieldError } from '@shared/utilities/field-error';

import { InstitutionDeviceFormModel, institutionDeviceSchema } from './institution-device-form.schema';

const emptyModel: InstitutionDeviceFormModel = {
  institutionId: null,
  institutionLocationId: null,
  deviceMasterId: null,

  deviceCode: '',
  deviceName: '',

  installedDateTime: null,
  installedBy: null,
  installationRemark: '',

  isAttendanceDevice: true,

  description: '',
  remark: '',

  isActive: true,
};

/** One page big enough to hold every lookup row — these feed dropdowns, not a grid. */
const LOOKUP_PAGE_SIZE = 500;

/** Empty strings go to the API as `null`, which is what the nullable DTO fields expect. */
const nullable = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/** What the Location select needs. `InstitutionLocationRow` already satisfies it. */
interface LocationOption {
  id: number;
  locationName: string | null;
  institutionId?: string | null;
}

interface ToggleConfig {
  id: string;
  label: string;
  field: FieldTree<boolean>;
  hint?: string;
}

/** `pTextarea` bypasses `FormField`, so these are bound by hand through `onTextareaInput`. */
type TextareaKey = 'installationRemark' | 'description' | 'remark';

@Component({
  selector: 'app-institution-device-form',
  imports: [
    FormField,
    AutoFocusModule,
    DatePickerModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TextareaModule,
    ToggleSwitchModule,
    SectionCard,
    FormActionBar,
    SkeletonField,
    ToggleField,
  ],
  templateUrl: './institution-device-form.html',
  // Fills the router-outlet's leftover height so the page's own scroll box needs no 100vh math.
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class InstitutionDeviceForm implements CanComponentDeactivate {
  readonly #institutionDeviceApi = inject(InstitutionDeviceApi);
  readonly #institutionsApi = inject(InstitutionsApi);
  readonly #institutionLocationApi = inject(InstitutionLocationApi);
  readonly #deviceMasterApi = inject(DeviceMasterApi);
  readonly #commonService = inject(Common);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #destroyRef = inject(DestroyRef);

  /** Create and edit are separate route configs, so the id cannot change under the component.
   *  The id is an opaque token, so it is read as-is rather than parsed. */
  protected readonly institutionDeviceId = this.#route.snapshot.paramMap.get('institutionDeviceId') || null;
  protected readonly isEditMode = this.institutionDeviceId !== null;
  /** `get-by-id` answers 400 without the institution, so the list hands it over on the query string.
   *  On create, the same param arrives from the Institution List's "Device Assignment" action. */
  readonly #routeInstitutionId = this.#route.snapshot.queryParamMap.get('institutionId');

  protected readonly isSaving = signal(false);
  protected readonly isLoading = signal(false);
  /** Flipped by the first submit attempt, so every outstanding error surfaces at once. */
  protected readonly submitted = signal(false);

  /** Edit mode overwrites this from `#hydrate`; seeding it here too would just be discarded. */
  readonly #initialModel: InstitutionDeviceFormModel =
    !this.isEditMode && this.#routeInstitutionId
      ? { ...emptyModel, institutionId: this.#routeInstitutionId }
      : emptyModel;

  protected readonly model = signal<InstitutionDeviceFormModel>(this.#initialModel);
  /** What the server last told us; `canDeactivate` compares against it. */
  readonly #baseline = signal<InstitutionDeviceFormModel>(this.#initialModel);
  /**
   * The location this device already points at. The lookup answers `401 "Inactive user."` for a
   * host session, so without this an edit would render the required select blank — and the first
   * touch of the Institution select would clear the id and leave the form unfixable.
   */
  readonly #hydratedLocation = signal<LocationOption | null>(null);

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, institutionDeviceSchema);
  });

  readonly #institutionsResource = rxResource({
    stream: () =>
      this.#institutionsApi.getInstitutions({ IsActive: true }).pipe(
        map((res) => {
          if (!res.isSucceeded) {
            this.#commonService.showMessage(res.message, 'error');
          }
          return res.isSucceeded ? (res.data ?? []) : [];
        }),
        catchError((err) => {
          this.#commonService.showMessage(err.message, 'error');
          return of([] as IInstitution[]);
        }),
      ),
  });

  /** A resource reloads on every `params` re-run, even when the value is identical, so `params`
   *  must not read the whole model - it would refire on every keystroke. */
  readonly #selectedInstitutionId = computed(() => this.model().institutionId ?? undefined);

  /**
   * Locations are institution-scoped, so `undefined` params keep this idle until the institution is picked —
   * on an edit, `#hydrate` sets it and the lookup starts itself.
   *
   * `ModuleId` / `OperationId` are `moduleOperationInterceptor`'s job: a host tree publishes work
   * sites as `HOST_CAMPUS_LIST` rather than `INSTITUTION_CAMPUSES`, and the `institutionlocation`
   * row names both so the session's own menu resolves whichever it carries.
   */
  readonly #institutionLocationsResource = rxResource({
    params: () => this.#selectedInstitutionId(),
    stream: ({ params: InstitutionId }) =>
      this.#institutionLocationApi
        .getInstitutionLocations({ InstitutionId, IsActive: true, PageSize: LOOKUP_PAGE_SIZE })
        .pipe(
          map((res) => {
            if (!res.isSucceeded) {
              this.#commonService.showMessage(res.message, 'error');
            }
            return res.isSucceeded ? (res.data ?? []) : [];
          }),
          catchError((err) => {
            this.#commonService.showMessage(err.message, 'error');
            return of([] as InstitutionLocationRow[]);
          }),
        ),
  });

  readonly #deviceMastersResource = rxResource({
    stream: () =>
      this.#deviceMasterApi.getDeviceMasters({ IsActive: true, PageSize: LOOKUP_PAGE_SIZE }).pipe(
        map((res) => {
          if (!res.isSucceeded) {
            this.#commonService.showMessage(res.message, 'error');
          }
          return res.isSucceeded ? (res.data ?? []) : [];
        }),
        catchError((err) => {
          this.#commonService.showMessage(err.message, 'error');
          return of([] as DeviceMasterRow[]);
        }),
      ),
  });

  protected readonly institutions = computed(() => this.#institutionsResource.value() ?? []);
  protected readonly isLoadingInstitutions = computed(() => this.#institutionsResource.isLoading());
  protected readonly deviceMasters = computed(() => this.#deviceMastersResource.value() ?? []);
  protected readonly isLoadingDeviceMasters = computed(() =>
    this.#deviceMastersResource.isLoading(),
  );
  protected readonly isLoadingLocations = computed(() => this.#institutionLocationsResource.isLoading());
  /** Gates the Location select — locations are listed one institution at a time. */
  protected readonly hasInstitution = computed(() => this.model().institutionId !== null);

  /**
   * The request already carries `InstitutionId`; this repeats the narrowing in case the server ignores
   * it. Rows that carry no `institutionId` stay selectable rather than disappearing from the dropdown,
   * and the record's own location is re-added so an edit can always show and re-save it.
   */
  protected readonly institutionLocations = computed<LocationOption[]>(() => {
    const fetched: LocationOption[] = this.#institutionLocationsResource.value() ?? [];
    const institutionId = this.model().institutionId;
    const scoped =
      institutionId === null
        ? fetched
        : fetched.filter((location) => location.institutionId === institutionId || location.institutionId == null);

    const hydrated = this.#hydratedLocation();
    return hydrated && !scoped.some((location) => location.id === hydrated.id)
      ? [hydrated, ...scoped]
      : scoped;
  });

  protected readonly behaviourToggles: ToggleConfig[] = [
    {
      id: 'isAttendanceDevice',
      label: 'Attendance device',
      field: this.f.isAttendanceDevice,
      hint: 'Punches from this device count as attendance',
    },
    {
      id: 'isActive',
      label: 'Active',
      field: this.f.isActive,
      hint: 'Inactive devices stop syncing',
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

    if (this.institutionDeviceId) {
      this.#hydrate(this.institutionDeviceId);
    }
  }

  #setPageHeaderInfo(): void {
    const pageTitle = this.isEditMode ? 'Edit Institution Device' : 'Add Institution Device';

    this.#commonService.setPageHeaderInfo({
      pageTitle,
      pageDescription: this.isEditMode
        ? 'Update the device installed at this institution campus'
        : 'Assign a device from the catalogue to an institution campus',
      pageIcon: 'pi pi-sitemap',
      isBreadcrumbShow: true,
    });
    this.#commonService.setBreadcrumbItems([
      { label: 'Institution Devices', routerLink: '/app/institution-devices' },
      { label: pageTitle },
    ]);
  }

  /** Edits read the row back from the API so the form always reflects server state. */
  #hydrate(id: string): void {
    this.isLoading.set(true);

    this.#institutionDeviceApi
      .getInstitutionDevice(id, this.#routeInstitutionId)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          const device = res.isSucceeded ? res.data : null;
          if (!device) {
            this.#commonService.showMessage(res.message || 'Device not found', 'error');
            this.#leave();
            return;
          }
          if (device.institutionLocationId) {
            this.#hydratedLocation.set({
              id: device.institutionLocationId,
              // The detail page falls back to the id the same way; a blank option would read as
              // the very bug this guards against.
              locationName: device.institutionLocationName ?? `Location ${device.institutionLocationId}`,
              institutionId: device.institutionId,
            });
          }
          this.#setModel(this.#toModel(device));
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
          this.#leave();
        },
      });
  }

  #toModel(device: InstitutionDeviceRow): InstitutionDeviceFormModel {
    const date = (value: string | null | undefined) => (value ? new Date(value) : null);

    return {
      ...emptyModel,
      institutionId: device.institutionId ?? null,
      institutionLocationId: device.institutionLocationId ?? null,
      deviceMasterId: device.deviceMasterId ?? null,

      deviceCode: device.deviceCode ?? '',
      deviceName: device.deviceName ?? '',

      installedDateTime: date(device.installedDateTime),
      installedBy: device.installedBy ?? null,
      installationRemark: device.installationRemark ?? '',

      isAttendanceDevice: device.isAttendanceDevice ?? false,

      description: device.description ?? '',
      remark: device.remark ?? '',

      isActive: device.isActive ?? true,
    };
  }

  /** A location belongs to one institution, so switching institutions invalidates the chosen location. */
  onInstitutionChange(): void {
    this.model.update((m) => ({ ...m, institutionLocationId: null }));
  }

  /**
   * `pTextarea` subscribes to `ngControl.valueChanges`, which Signal Forms does not provide, so the
   * value is written back by hand instead of through `[formField]`.
   */
  onTextareaInput(key: TextareaKey, event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.model.update((m) => ({ ...m, [key]: value }));
    const field = this.f[key] as FieldTree<string>;
    field().markAsDirty();
    field().markAsTouched();
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

      const request$: Observable<DeviceMutationRes> = this.institutionDeviceId
        ? this.#institutionDeviceApi.updateInstitutionDevice({ ...body, id: this.institutionDeviceId })
        : this.#institutionDeviceApi.addInstitutionDevice(body);

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
  #buildRequest(value: InstitutionDeviceFormModel): CreateInstitutionDeviceReq {
    return {
      // The schema has already ruled out null; the fallbacks only narrow the type.
      institutionId: value.institutionId ?? '',
      institutionLocationId: value.institutionLocationId ?? 0,
      deviceMasterId: value.deviceMasterId ?? 0,

      deviceCode: nullable(value.deviceCode),
      deviceName: nullable(value.deviceName),

      // The installation stamp is a full date-time.
      installedDateTime: value.installedDateTime ? value.installedDateTime.toISOString() : null,
      // No control writes this; `/update` replaces the record, so it is resent as it came back.
      installedBy: value.installedBy,
      installationRemark: nullable(value.installationRemark),

      isAttendanceDevice: value.isAttendanceDevice,

      description: nullable(value.description),
      remark: nullable(value.remark),

      isActive: value.isActive,
    };
  }

  onCancel(): void {
    this.#router.navigate(['/app/institution-devices']);
  }

  /** DOM order of the fields, so a blocked submit lands on the first one that needs attention. */
  #focusFirstInvalid(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const ordered: readonly (readonly [string, boolean])[] = [
      ['institutionId', this.showError(this.f.institutionId)],
      ['institutionLocationId', this.showError(this.f.institutionLocationId)],
      ['deviceMasterId', this.showError(this.f.deviceMasterId)],
      ['deviceCode', this.showError(this.f.deviceCode)],
      ['deviceName', this.showError(this.f.deviceName)],
    ];

    const id = ordered.find(([, hasError]) => hasError)?.[0];
    const element = id ? document.getElementById(id) : null;
    element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    element?.focus({ preventScroll: true });
  }

  #setModel(model: InstitutionDeviceFormModel): void {
    this.model.set(model);
    this.#baseline.set(model);
  }

  /** Leaves without tripping `unsavedChangesGuard`. */
  #leave(): void {
    this.#baseline.set(this.model());
    this.#router.navigate(['/app/institution-devices']);
  }
}
