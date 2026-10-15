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
import { ConfirmationService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';
import { TagModule } from '@openng/optimus-ui/tag';
import { finalize } from 'rxjs';

import { HOST_MODULE } from '@core/host-modules';
import { Common, StaffCategoriesAPI } from '@core/services';
import { CurrentUserPermissionsStore, FeaturePageStore } from '@core/stores';
import { HostStaffCategory } from '@shared/interfaces';

import { StaffCategoryForm } from './staff-category-form/staff-category-form';

@Component({
  selector: 'app-staff-category-catalogue',
  imports: [ButtonModule, CardModule, ConfirmDialogModule, SkeletonModule, TagModule],
  templateUrl: './staff-category-catalogue.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffCategoryCatalogue implements OnInit {
  readonly #api = inject(StaffCategoriesAPI);
  readonly #common = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogService = inject(DialogService);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #permissionsStore = inject(CurrentUserPermissionsStore);

  /** Placeholder rows shown while the catalogue loads. */
  readonly skeletonRows = [1, 2, 3, 4, 5];

  readonly categories = signal<HostStaffCategory[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly canAdd = computed(() =>
    this.#permissionsStore.canPerform(HOST_MODULE.staffCategoryCatalogue, 'Add'),
  );
  readonly canUpdate = computed(() =>
    this.#permissionsStore.canPerform(HOST_MODULE.staffCategoryCatalogue, 'Update'),
  );

  ngOnInit(): void {
    const pageTitle =
      this.#featurePageStore.displayNameOf(HOST_MODULE.staffCategoryCatalogue) ??
      'Staff Category Catalogue';
    this.#common.setPageHeaderInfo({
      pageTitle,
      pageDescription: 'Manage the platform categories Institutions use in staff records.',
      pageIcon: 'pi pi-users',
      isBreadcrumbShow: true,
    });
    this.#common.setBreadcrumbItems([{ label: 'Institution Master Data' }, { label: pageTitle }]);
    this.load();
  }

  /** Opens the add/edit dialog; reloads the list when it closes after a save. */
  openForm(category?: HostStaffCategory): void {
    if (category ? !this.canUpdate() : !this.canAdd()) return;

    const ref = this.#dialogService.open(StaffCategoryForm, {
      header: category ? 'Edit Staff Category' : 'Add Staff Category',
      style: { width: '90vw', maxWidth: '32rem' },
      contentStyle: { overflow: 'auto' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { category },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((saved?: boolean) => {
      if (saved) this.load();
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  toggle(category: HostStaffCategory): void {
    if (!this.canUpdate()) return;

    if (!category.isActive) {
      this.persistToggle(category);
      return;
    }

    this.#confirmationService.confirm({
      header: 'Deactivate Staff Category',
      message: `Deactivate ${category.name}? Institutions can no longer assign it to staff.`,
      icon: 'pi pi-ban text-red-400! text-xl!',
      acceptLabel: 'Deactivate',
      rejectLabel: 'Keep Active',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.persistToggle(category),
    });
  }

  private persistToggle(category: HostStaffCategory): void {
    if (this.saving()) return;

    this.saving.set(true);
    this.#api
      .saveHostCategory({
        id: category.id,
        code: category.code,
        name: category.name,
        description: category.description,
        displayOrder: category.displayOrder,
        isActive: !category.isActive,
      })
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.#common.showMessage(response.message, response.isSucceeded ? 'success' : 'error');
          if (response.isSucceeded) this.load();
        },
        error: (error: { message?: string }) => {
          this.#common.showMessage(error.message ?? 'Unable to save the Staff Category.', 'error');
        },
      });
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
}
