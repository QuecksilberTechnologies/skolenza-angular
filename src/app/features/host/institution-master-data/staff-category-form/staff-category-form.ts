import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, FormField, submit, validateStandardSchema } from '@angular/forms/signals';
import { AutoFocusModule } from '@openng/optimus-ui/autofocus';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { finalize } from 'rxjs';

import { Common, StaffCategoriesAPI } from '@core/services';
import { HostStaffCategory } from '@shared/interfaces';

import {
  StaffCategoryCatalogueModel,
  staffCategoryCatalogueSchema,
} from './staff-category-form.schema';

/** Add/edit dialog for one Host Staff Category. Closes with `true` after a successful save. */
@Component({
  selector: 'app-staff-category-form',
  imports: [
    AutoFocusModule,
    ButtonModule,
    FormField,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    ToggleSwitchModule,
  ],
  templateUrl: './staff-category-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffCategoryForm {
  readonly #api = inject(StaffCategoriesAPI);
  readonly #common = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #category = inject(DynamicDialogConfig).data?.category as HostStaffCategory | undefined;

  readonly isEditMode = !!this.#category;
  readonly saving = signal(false);
  readonly submitted = signal(false);

  readonly model = signal<StaffCategoryCatalogueModel>({
    id: this.#category?.id ?? null,
    code: this.#category?.code ?? '',
    name: this.#category?.name ?? '',
    description: this.#category?.description ?? '',
    displayOrder: this.#category?.displayOrder ?? 100,
    isActive: this.#category?.isActive ?? true,
  });
  readonly f = form(this.model, (path) => {
    validateStandardSchema(path, staffCategoryCatalogueSchema);
  });

  onSubmit(): void {
    if (this.saving()) return;

    this.submitted.set(true);
    submit(this.f, async () => {
      const value = this.model();
      this.saving.set(true);
      this.#api
        .saveHostCategory({
          ...(value.id === null ? {} : { id: value.id }),
          code: value.code.trim().toUpperCase(),
          name: value.name.trim(),
          description: value.description.trim(),
          displayOrder: value.displayOrder,
          isActive: value.isActive,
        })
        .pipe(
          finalize(() => this.saving.set(false)),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: (response) => {
            this.#common.showMessage(response.message, response.isSucceeded ? 'success' : 'error');
            if (response.isSucceeded) this.#dialogRef.close(true);
          },
          error: (error: { message?: string }) => {
            this.#common.showMessage(
              error.message ?? 'Unable to save the Staff Category.',
              'error',
            );
          },
        });
    });
  }

  onCancel(): void {
    this.#dialogRef.close();
  }
}
