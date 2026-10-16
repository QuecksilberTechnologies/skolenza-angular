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
import { AutoFocusModule } from '@openng/optimus-ui/autofocus';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DatePickerModule } from '@openng/optimus-ui/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { catchError, finalize, map, Observable, of, tap } from 'rxjs';

import { Common, HolidayCalandarApi, InstitutionLocationApi } from '@core/services';
import { SkeletonField } from '@shared/components/form-skeleton/form-skeleton-field';
import { SkeletonToggle } from '@shared/components/form-skeleton/form-skeleton-toggle';
import { ToggleField } from '@shared/components/toggle-field/toggle-field';
import { HolidayFields, HolidayMutationRes, InstitutionLocationRow } from '@shared/interfaces';
import { localDateKey } from '@shared/utilities/date-key';
import { showFieldError } from '@shared/utilities/field-error';

import { HolidayFormModel, holidayFormSchema } from './holiday-form.schema';

/** One page big enough to hold every location — this feeds a dropdown, not a grid. */
const LOOKUP_PAGE_SIZE = 500;

/** Swagger types `icon` as a free string; the form offers a fixed PrimeIcons set and stores the class. */
const HOLIDAY_ICONS = [
  { label: 'Star', value: 'pi pi-star' },
  { label: 'Sparkles', value: 'pi pi-sparkles' },
  { label: 'Flag', value: 'pi pi-flag' },
  { label: 'Gift', value: 'pi pi-gift' },
  { label: 'Heart', value: 'pi pi-heart' },
  { label: 'Sun', value: 'pi pi-sun' },
  { label: 'Moon', value: 'pi pi-moon' },
  { label: 'Globe', value: 'pi pi-globe' },
  { label: 'Crown', value: 'pi pi-crown' },
  { label: 'Calendar', value: 'pi pi-calendar' },
];

const emptyModel: HolidayFormModel = {
  institutionLocationId: null,
  holidayName: '',
  holidayDate: null,
  isOptional: false,
  description: '',
  icon: null,
};

@Component({
  selector: 'app-holiday-form',
  imports: [
    FormField,
    AutoFocusModule,
    ButtonModule,
    DatePickerModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    SkeletonField,
    SkeletonToggle,
    TextareaModule,
    ToggleField,
    ToggleSwitchModule,
  ],
  templateUrl: './holiday-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HolidayForm {
  readonly #holidayCalandarApi = inject(HolidayCalandarApi);
  readonly #institutionLocationApi = inject(InstitutionLocationApi);
  readonly #commonService = inject(Common);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dynamicDialogConfig = inject(DynamicDialogConfig);
  readonly #destroyRef = inject(DestroyRef);

  readonly #holiday = this.#dynamicDialogConfig.data?.holiday as
    | (HolidayFields & { id: number })
    | undefined;

  protected readonly iconOptions = HOLIDAY_ICONS;
  protected readonly isEditMode = !!this.#holiday;
  protected readonly isSaving = signal(false);
  /** Flipped by the first submit attempt, so every outstanding error surfaces at once. */
  protected readonly submitted = signal(false);

  protected readonly model = signal<HolidayFormModel>(
    this.#holiday ? this.#toModel(this.#holiday) : emptyModel,
  );

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, holidayFormSchema);
  });

  readonly #locationsResource = rxResource({
    stream: () =>
      this.#institutionLocationApi
        .getInstitutionLocations({ IsActive: true, PageSize: LOOKUP_PAGE_SIZE })
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

  protected readonly locations = computed(() => this.#locationsResource.value() ?? []);
  protected readonly isLoadingLocations = computed(() => this.#locationsResource.isLoading());

  /** Edit reads the record fresh, so the dialog never saves over a change made since the list
   *  loaded — `GET /{id}` also returns an inactive row the (active-only) list never would. */
  readonly #holidayResource = rxResource({
    params: () => (this.#holiday ? { id: this.#holiday.id } : undefined),
    stream: ({ params }) =>
      this.#holidayCalandarApi.getHoliday(params.id).pipe(
        tap((res) => {
          if (res.isSucceeded && res.data) {
            this.model.set(this.#toModel(res.data));
          } else if (!res.isSucceeded) {
            this.#commonService.showMessage(res.message, 'error');
          }
        }),
        // The row passed in still seeds the form, so a failed read leaves it editable.
        catchError((err) => {
          this.#commonService.showMessage(err.message, 'error');
          return of(null);
        }),
      ),
  });

  protected readonly isLoadingHoliday = computed(() => this.#holidayResource.isLoading());
  /** Edit waits on the locations too — until they land, the select can't label the saved id. */
  protected readonly isLoadingForm = computed(
    () => this.isLoadingHoliday() || (this.isEditMode && this.isLoadingLocations()),
  );

  /** Templates call this per field; the rule itself lives in `@shared/utilities/field-error`. */
  protected showError<T>(field: FieldTree<T>): boolean {
    return showFieldError(field, this.submitted());
  }

  /** `pTextarea` subscribes to `ngControl.valueChanges`, which Signal Forms does not provide, so the
   *  description field is bound by hand instead of through `[formField]`. */
  onDescriptionInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.model.update((m) => ({ ...m, description: value }));
    this.f.description().markAsDirty();
    this.f.description().markAsTouched();
  }

  #toModel(holiday: HolidayFields): HolidayFormModel {
    return {
      institutionLocationId: holiday.institutionLocationId,
      holidayName: holiday.holidayName,
      holidayDate: holiday.holidayDate ? new Date(holiday.holidayDate) : null,
      isOptional: holiday.isOptional,
      description: holiday.description ?? '',
      icon: holiday.icon ?? null,
    };
  }

  onSubmit(): void {
    if (this.isSaving() || this.isLoadingForm()) {
      return;
    }

    this.submitted.set(true);
    this.f().markAsTouched();

    if (this.f().invalid()) {
      return;
    }

    submit(this.f, async () => {
      const value = this.model();
      // The schema has already ruled out the nulls; the fallbacks only narrow the type.
      const body: HolidayFields = {
        institutionLocationId: value.institutionLocationId ?? 0,
        holidayName: value.holidayName.trim(),
        holidayDate: value.holidayDate ? localDateKey(value.holidayDate) : '',
        isOptional: value.isOptional,
        description: value.description.trim() || null,
        icon: value.icon,
      };

      this.isSaving.set(true);

      const request$: Observable<HolidayMutationRes> = this.#holiday
        ? this.#holidayCalandarApi.updateHoliday(this.#holiday.id, {
            ...body,
            id: this.#holiday.id,
          })
        : this.#holidayCalandarApi.addHoliday(body);

      request$
        .pipe(
          finalize(() => this.isSaving.set(false)),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: (res) => {
            this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            if (res.isSucceeded) {
              this.#dialogRef.close(true);
            }
          },
          error: (err) => {
            this.#commonService.showMessage(err.message, 'error');
          },
        });
    });
  }

  onCancel(): void {
    this.#dialogRef.close();
  }
}
