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
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { catchError, finalize, map, Observable, of } from 'rxjs';

import { CanComponentDeactivate } from '@core/guards';
import {
  Common,
  DeviceDdlOptionsApi,
  LocationsApi,
  InstitutionCardMasterApi,
  InstitutionsApi,
} from '@core/services';
import { LookupStore } from '@core/stores';
import { FormActionBar } from '@shared/components/form-action-bar/form-action-bar';
import { SkeletonField } from '@shared/components/form-skeleton/form-skeleton-field';
import { SectionCard } from '@shared/components/section-card/section-card';
import { ToggleField } from '@shared/components/toggle-field/toggle-field';
import {
  CreateInstitutionCardMasterReq,
  DeviceDdlOptionValue,
  IInstitution,
  State,
  InstitutionCardMasterMutationRes,
  InstitutionCardMasterRow,
} from '@shared/interfaces';
import { showFieldError } from '@shared/utilities/field-error';

import {
  InstitutionCardInventoryFormModel,
  institutionCardInventorySchema,
} from './institution-card-inventory-form.schema';

const emptyModel: InstitutionCardInventoryFormModel = {
  institutionId: null,

  cardNumber: '',
  cardReference: '',

  purchaseCurrencyCode: '',
  unitPurchasePriceExcludingTax: null,
  purchaseInvoiceNumber: '',
  purchaseInvoiceDate: null,

  supplierName: '',
  supplierTaxRegistrationNumber: '',
  supplierCountryId: null,
  supplierStateId: null,
  placeOfSupplyCountryId: null,
  placeOfSupplyStateId: null,

  taxTreatment: '',
  cgstRate: null,
  cgstAmount: null,
  sgstRate: null,
  sgstAmount: null,
  igstRate: null,
  igstAmount: null,
  foreignTaxLabel: '',
  foreignTaxRate: null,
  foreignTaxAmount: null,

  customsDutyAmount: null,
  freightAmount: null,

  isActive: true,
};

interface NumberFieldConfig {
  id: string;
  label: string;
  field: FieldTree<number | null>;
}

/** Empty strings go to the API as `null`, which is what the nullable DTO fields expect. */
const nullable = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

@Component({
  selector: 'app-institution-card-inventory-form',
  imports: [
    FormField,
    AutoFocusModule,
    DatePickerModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    ToggleSwitchModule,
    SectionCard,
    FormActionBar,
    SkeletonField,
    ToggleField,
  ],
  templateUrl: './institution-card-inventory-form.html',
  // Fills the router-outlet's leftover height so the page's own scroll box needs no 100vh math.
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class InstitutionCardInventoryForm implements CanComponentDeactivate {
  readonly #institutionCardMasterApi = inject(InstitutionCardMasterApi);
  readonly #institutionsApi = inject(InstitutionsApi);
  readonly #locationsApi = inject(LocationsApi);
  readonly #deviceDdlOptionsApi = inject(DeviceDdlOptionsApi);
  readonly #lookupStore = inject(LookupStore);
  readonly #commonService = inject(Common);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #destroyRef = inject(DestroyRef);

  /** Create and edit are separate route configs, so the id cannot change under the component. */
  protected readonly cardId = this.#route.snapshot.paramMap.get('cardId');
  protected readonly isEditMode = this.cardId !== null;
  /** `get-by-id` is institution-scoped; the list hands it over on the query string. */
  readonly #routeInstitutionId = this.#route.snapshot.queryParamMap.get('institutionId');

  protected readonly isSaving = signal(false);
  protected readonly isLoading = signal(false);
  /** Flipped by the first submit attempt, so every outstanding error surfaces at once. */
  protected readonly submitted = signal(false);

  protected readonly model = signal<InstitutionCardInventoryFormModel>({
    ...emptyModel,
    institutionId: this.#routeInstitutionId,
  });
  /** What the server last told us; `canDeactivate` compares against it. */
  readonly #baseline = signal<InstitutionCardInventoryFormModel>(this.model());

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, institutionCardInventorySchema);
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

  readonly #ddlOptionsResource = rxResource({
    stream: () =>
      this.#deviceDdlOptionsApi.getInstitutionCardInventory().pipe(
        map((res) => (res.isSucceeded ? (res.data ?? []) : [])),
        catchError(() => of([])),
      ),
  });

  /** A resource reloads on every `params` re-run, even when the value is identical, so `params`
   *  must not read the whole model - it would refire on every keystroke. */
  readonly #selectedSupplierCountryId = computed(() => this.model().supplierCountryId ?? undefined);
  readonly #selectedPlaceOfSupplyCountryId = computed(
    () => this.model().placeOfSupplyCountryId ?? undefined,
  );

  /** Two independent state lookups — the form has two country pickers live at once (supplier,
   *  place of supply), so they cannot share `LookupStore`'s single `statesCountryId` gate. */
  readonly #supplierStatesResource = rxResource({
    params: () => this.#selectedSupplierCountryId(),
    stream: ({ params: countryId }) =>
      this.#locationsApi
        .getStates({
          UserStaffMemberId: '0',
          CountryId: countryId,
          TodaysDate: new Date().toISOString(),
        })
        .pipe(
          map((res) => (res.isSucceeded ? (res.data ?? []) : [])),
          catchError(() => of([] as State[])),
        ),
  });

  readonly #placeOfSupplyStatesResource = rxResource({
    params: () => this.#selectedPlaceOfSupplyCountryId(),
    stream: ({ params: countryId }) =>
      this.#locationsApi
        .getStates({
          UserStaffMemberId: '0',
          CountryId: countryId,
          TodaysDate: new Date().toISOString(),
        })
        .pipe(
          map((res) => (res.isSucceeded ? (res.data ?? []) : [])),
          catchError(() => of([] as State[])),
        ),
  });

  protected readonly institutions = computed(() => this.#institutionsResource.value() ?? []);
  protected readonly isLoadingInstitutions = computed(() => this.#institutionsResource.isLoading());
  protected readonly countries = computed(() => this.#lookupStore.countries());
  protected readonly isLoadingCountries = computed(() => this.#lookupStore.isLoadingCountries());
  protected readonly supplierStates = computed(() => this.#supplierStatesResource.value() ?? []);
  protected readonly isLoadingSupplierStates = computed(() =>
    this.#supplierStatesResource.isLoading(),
  );
  protected readonly placeOfSupplyStates = computed(
    () => this.#placeOfSupplyStatesResource.value() ?? [],
  );
  protected readonly isLoadingPlaceOfSupplyStates = computed(() =>
    this.#placeOfSupplyStatesResource.isLoading(),
  );
  protected readonly taxTreatmentOptions = computed<DeviceDdlOptionValue[]>(
    () =>
      (this.#ddlOptionsResource.value() ?? []).find((section) => section.key === 'taxTreatment')
        ?.options ?? [],
  );

  /** The status the edit read came back with, so the form can refuse to rewrite a bound card. */
  readonly #loadedCardStatus = signal<number | null>(null);

  /**
   * An assigned card is frozen — the enrollment holding it would be stranded. The route guard only
   * checks the `Update` operation, so a pasted URL reaches this form and this is where it stops.
   *
   * Fails closed while the ddl is still loading: refusing a write that turns out to be legal is
   * recoverable, rewriting one that turns out to be bound is not.
   */
  protected readonly isAssignedCard = computed(() => {
    const cardStatus = this.#loadedCardStatus();
    if (cardStatus === null) {
      return false;
    }

    const assigned = (this.#ddlOptionsResource.value() ?? [])
      .flatMap((section) => section.options)
      .find((option) => option.label.trim().toLowerCase() === 'assigned');

    return assigned === undefined || cardStatus === Number(assigned.value);
  });

  protected readonly taxFields: NumberFieldConfig[] = [
    { id: 'cgstRate', label: 'CGST Rate', field: this.f.cgstRate },
    { id: 'cgstAmount', label: 'CGST Amount', field: this.f.cgstAmount },
    { id: 'sgstRate', label: 'SGST Rate', field: this.f.sgstRate },
    { id: 'sgstAmount', label: 'SGST Amount', field: this.f.sgstAmount },
    { id: 'igstRate', label: 'IGST Rate', field: this.f.igstRate },
    { id: 'igstAmount', label: 'IGST Amount', field: this.f.igstAmount },
    { id: 'foreignTaxRate', label: 'Foreign Tax Rate', field: this.f.foreignTaxRate },
    { id: 'foreignTaxAmount', label: 'Foreign Tax Amount', field: this.f.foreignTaxAmount },
  ];

  protected readonly costFields: NumberFieldConfig[] = [
    { id: 'customsDutyAmount', label: 'Customs Duty', field: this.f.customsDutyAmount },
    { id: 'freightAmount', label: 'Freight', field: this.f.freightAmount },
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

    if (this.cardId) {
      this.#hydrate(this.cardId);
    }
  }

  #setPageHeaderInfo(): void {
    const pageTitle = this.isEditMode ? 'Edit Card' : 'Add Card';

    this.#commonService.setPageHeaderInfo({
      pageTitle,
      pageDescription: this.isEditMode
        ? 'Update this card inventory record'
        : 'Add a card to the institution procurement inventory',
      pageIcon: 'pi pi-id-card',
      isBreadcrumbShow: true,
    });
    this.#commonService.setBreadcrumbItems([
      { label: 'Card Inventory', routerLink: '/app/institution-card-inventory' },
      { label: pageTitle },
    ]);
  }

  /** Edits read the row back from the API so the form always reflects server state. */
  #hydrate(id: string): void {
    this.isLoading.set(true);

    this.#institutionCardMasterApi
      .getInstitutionCardMaster(id, this.#routeInstitutionId)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          const card = res.isSucceeded ? res.data : null;
          if (!card) {
            this.#commonService.showMessage(res.message || 'Card not found', 'error');
            this.#leave();
            return;
          }
          this.#loadedCardStatus.set(card.cardStatus ?? null);
          this.#setModel(this.#toModel(card));
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
          this.#leave();
        },
      });
  }

  #toModel(card: InstitutionCardMasterRow): InstitutionCardInventoryFormModel {
    const date = (value: string | null | undefined) => (value ? new Date(value) : null);

    return {
      ...emptyModel,
      institutionId: card.institutionId ?? null,

      cardNumber: card.cardNumber ?? '',
      cardReference: card.cardReference ?? '',

      purchaseCurrencyCode: card.purchaseCurrencyCode ?? '',
      unitPurchasePriceExcludingTax: card.unitPurchasePriceExcludingTax ?? null,
      purchaseInvoiceNumber: card.purchaseInvoiceNumber ?? '',
      purchaseInvoiceDate: date(card.purchaseInvoiceDate),

      supplierName: card.supplierName ?? '',
      supplierTaxRegistrationNumber: card.supplierTaxRegistrationNumber ?? '',
      supplierCountryId: card.supplierCountryId ?? null,
      supplierStateId: card.supplierStateId ?? null,
      placeOfSupplyCountryId: card.placeOfSupplyCountryId ?? null,
      placeOfSupplyStateId: card.placeOfSupplyStateId ?? null,

      taxTreatment:
        card.taxTreatment !== null && card.taxTreatment !== undefined
          ? String(card.taxTreatment)
          : '',
      cgstRate: card.cgstRate ?? null,
      cgstAmount: card.cgstAmount ?? null,
      sgstRate: card.sgstRate ?? null,
      sgstAmount: card.sgstAmount ?? null,
      igstRate: card.igstRate ?? null,
      igstAmount: card.igstAmount ?? null,
      foreignTaxLabel: card.foreignTaxLabel ?? '',
      foreignTaxRate: card.foreignTaxRate ?? null,
      foreignTaxAmount: card.foreignTaxAmount ?? null,

      customsDutyAmount: card.customsDutyAmount ?? null,
      freightAmount: card.freightAmount ?? null,

      isActive: card.isActive ?? true,
    };
  }

  /** A state belongs to one country, so switching countries invalidates the chosen state. */
  onSupplierCountryChange(): void {
    this.model.update((m) => ({ ...m, supplierStateId: null }));
  }

  onPlaceOfSupplyCountryChange(): void {
    this.model.update((m) => ({ ...m, placeOfSupplyStateId: null }));
  }

  onSubmit(): void {
    if (this.isSaving() || this.isLoading()) {
      return;
    }

    if (this.isAssignedCard()) {
      this.#commonService.showMessage(
        'This card is assigned to an staffMember device and cannot be edited.',
        'error',
      );
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

      const request$: Observable<InstitutionCardMasterMutationRes> = this.cardId
        ? this.#institutionCardMasterApi.updateInstitutionCardMaster({ ...body, id: this.cardId })
        : this.#institutionCardMasterApi.addInstitutionCardMaster(body);

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
  #buildRequest(value: InstitutionCardInventoryFormModel): CreateInstitutionCardMasterReq {
    return {
      // The schema has already ruled out null; the fallbacks only narrow the type.
      institutionId: value.institutionId ?? '',

      cardNumber: nullable(value.cardNumber),
      cardReference: nullable(value.cardReference),

      purchaseCurrencyCode: nullable(value.purchaseCurrencyCode),
      unitPurchasePriceExcludingTax: value.unitPurchasePriceExcludingTax,
      purchaseInvoiceNumber: nullable(value.purchaseInvoiceNumber),
      purchaseInvoiceDate: value.purchaseInvoiceDate
        ? value.purchaseInvoiceDate.toISOString()
        : null,

      supplierName: nullable(value.supplierName),
      supplierTaxRegistrationNumber: nullable(value.supplierTaxRegistrationNumber),
      supplierCountryId: value.supplierCountryId,
      supplierStateId: value.supplierStateId,
      placeOfSupplyCountryId: value.placeOfSupplyCountryId,
      placeOfSupplyStateId: value.placeOfSupplyStateId,

      taxTreatment: Number(value.taxTreatment),
      cgstRate: value.cgstRate ?? 0,
      cgstAmount: value.cgstAmount ?? 0,
      sgstRate: value.sgstRate ?? 0,
      sgstAmount: value.sgstAmount ?? 0,
      igstRate: value.igstRate ?? 0,
      igstAmount: value.igstAmount ?? 0,
      foreignTaxLabel: nullable(value.foreignTaxLabel),
      foreignTaxRate: value.foreignTaxRate ?? 0,
      foreignTaxAmount: value.foreignTaxAmount ?? 0,

      customsDutyAmount: value.customsDutyAmount ?? 0,
      freightAmount: value.freightAmount ?? 0,

      isActive: value.isActive,
    };
  }

  onCancel(): void {
    this.#router.navigate(['/app/institution-card-inventory']);
  }

  /** DOM order of the fields, so a blocked submit lands on the first one that needs attention. */
  #focusFirstInvalid(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const ordered: readonly (readonly [string, boolean])[] = [
      ['institutionId', this.showError(this.f.institutionId)],
      ['cardNumber', this.showError(this.f.cardNumber)],
      ['unitPurchasePriceExcludingTax', this.showError(this.f.unitPurchasePriceExcludingTax)],
      ['taxTreatment', this.showError(this.f.taxTreatment)],
    ];

    const id = ordered.find(([, hasError]) => hasError)?.[0];
    const element = id ? document.getElementById(id) : null;
    element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    element?.focus({ preventScroll: true });
  }

  #setModel(model: InstitutionCardInventoryFormModel): void {
    this.model.set(model);
    this.#baseline.set(model);
  }

  /** Leaves without tripping `unsavedChangesGuard`. */
  #leave(): void {
    this.#baseline.set(this.model());
    this.#router.navigate(['/app/institution-card-inventory']);
  }
}
