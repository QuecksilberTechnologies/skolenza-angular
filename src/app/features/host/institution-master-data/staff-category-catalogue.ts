import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, FormField, submit, validateStandardSchema } from '@angular/forms/signals';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { finalize } from 'rxjs';

import { HOST_MODULE } from '@core/host-modules';
import { Common, StaffCategoriesAPI } from '@core/services';
import { CurrentUserPermissionsStore, FeaturePageStore } from '@core/stores';
import { HostStaffCategory, SaveHostStaffCategory } from '@shared/interfaces';

import {
  StaffCategoryCatalogueModel,
  staffCategoryCatalogueSchema,
} from './staff-category-catalogue.schema';

@Component({
  selector: 'app-staff-category-catalogue',
  imports: [
    ButtonModule,
    CardModule,
    FormField,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    ToggleSwitchModule,
  ],
  templateUrl: './staff-category-catalogue.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffCategoryCatalogue implements OnInit {
  readonly #api = inject(StaffCategoriesAPI);
  readonly #common = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #permissionsStore = inject(CurrentUserPermissionsStore);

  readonly categories = signal<HostStaffCategory[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly canAdd = computed(() =>
    this.#permissionsStore.canPerform(HOST_MODULE.staffCategoryCatalogue, 'Add'),
  );
  readonly canUpdate = computed(() =>
    this.#permissionsStore.canPerform(HOST_MODULE.staffCategoryCatalogue, 'Update'),
  );

  readonly model = signal<StaffCategoryCatalogueModel>(this.emptyForm());
  readonly f = form(this.model, (path) => {
    validateStandardSchema(path, staffCategoryCatalogueSchema);
  });

  ngOnInit(): void {
    this.#common.setPageHeaderInfo({
      pageTitle:
        this.#featurePageStore.displayNameOf(HOST_MODULE.staffCategoryCatalogue) ??
        'Staff Category Catalogue',
      pageDescription: 'Manage the platform categories Institutions use in staff records.',
      pageIcon: 'pi pi-users',
      isBreadcrumbShow: true,
    });
    this.load();
  }

  edit(category: HostStaffCategory): void {
    if (!this.canUpdate()) return;

    this.submitted.set(false);
    this.model.set({
      id: category.id,
      code: category.code,
      name: category.name,
      description: category.description ?? '',
      displayOrder: category.displayOrder,
      isActive: category.isActive,
    });
  }

  toggle(category: HostStaffCategory): void {
    if (!this.canUpdate()) return;

    this.persist({
      id: category.id,
      code: category.code,
      name: category.name,
      description: category.description,
      displayOrder: category.displayOrder,
      isActive: !category.isActive,
    });
  }

  onSubmit(): void {
    if (this.saving()) return;

    this.submitted.set(true);
    submit(this.f, async () => {
      const value = this.model();
      this.persist({
        ...(value.id === null ? {} : { id: value.id }),
        code: value.code.trim().toUpperCase(),
        name: value.name.trim(),
        description: value.description.trim(),
        displayOrder: value.displayOrder,
        isActive: value.isActive,
      });
    });
  }

  reset(): void {
    this.submitted.set(false);
    this.model.set(this.emptyForm());
  }

  private load(): void {
    this.loading.set(true);
    this.#api
      .getHostCatalogue()
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (response) => {
          if (response.isSucceeded) {
            this.categories.set(response.data);
          } else {
            this.#common.showMessage(response.message, 'error');
          }
        },
        error: (error: { message?: string }) => {
          this.#common.showMessage(error.message ?? 'Unable to load Staff Categories.', 'error');
        },
      });
  }

  private persist(value: SaveHostStaffCategory): void {
    if (this.saving()) return;

    this.saving.set(true);
    this.#api
      .saveHostCategory(value)
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.#common.showMessage(response.message, response.isSucceeded ? 'success' : 'error');
          if (!response.isSucceeded) return;

          this.reset();
          this.load();
        },
        error: (error: { message?: string }) => {
          this.#common.showMessage(error.message ?? 'Unable to save the Staff Category.', 'error');
        },
      });
  }

  private emptyForm(): StaffCategoryCatalogueModel {
    return {
      id: null,
      code: '',
      name: '',
      description: '',
      displayOrder: 100,
      isActive: true,
    };
  }
}
