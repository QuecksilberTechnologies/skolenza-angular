import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AutoFocusModule } from '@openng/optimus-ui/autofocus';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CheckboxModule } from '@openng/optimus-ui/checkbox';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { finalize } from 'rxjs';

import { AssetCategoriesApi } from '@core/services/asset-categories-api';
import { Common } from '@core/services/common';
import {
  AssetCategoryForm,
  IAssetCategory,
  LoginInfo,
  UpsertAssetCategoryReq,
} from '@shared/interfaces';

@Component({
  selector: 'app-asset-category-manage-dialog',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    MessageModule,
    AutoFocusModule,
    CheckboxModule,
  ],
  templateUrl: './asset-category-manage-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetCategoryManageDialog implements OnInit {
  readonly #commonService = inject(Common);
  readonly #assetCategoriesApi = inject(AssetCategoriesApi);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dynamicDialogConfig = inject(DynamicDialogConfig);
  readonly #fb = inject(NonNullableFormBuilder);
  protected assetCategoryForm!: FormGroup<AssetCategoryForm>;
  protected assetCategory!: IAssetCategory;
  protected loginInfo!: LoginInfo;
  protected isSubmitting = signal(false);

  constructor() {
    this.assetCategory = this.#dynamicDialogConfig.data.assetCategory;
    this.initForm();
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();

    if (this.assetCategory) {
      this.patchForm();
    }
  }

  initForm() {
    this.assetCategoryForm = this.#fb.group({
      categoryName: ['', [Validators.required, Validators.minLength(3)]],
      remark: [''],
      hasMultipleUser: [false, [Validators.required]],
    });
  }

  patchForm() {
    this.assetCategoryForm.patchValue({
      categoryName: this.assetCategory.categoryName,
      remark: this.assetCategory.remark,
      hasMultipleUser: this.assetCategory.hasMultipleUser,
    });
  }

  isInvalid(controlName: string) {
    const control = this.assetCategoryForm.get(controlName);
    return control?.invalid && control.touched;
  }

  async onSubmit() {
    const form = this.assetCategoryForm.getRawValue();
    const body: UpsertAssetCategoryReq = {
      categoryName: form.categoryName,
      remark: form.remark,
      isActive: true,
      hasMultipleUser: true,
    };

    if (this.assetCategory?.id) {
      const id = this.assetCategory.id;
      if (id != null) body.id = id;
    }

    const saveRequest$ = this.assetCategory?.id
      ? this.#assetCategoriesApi.updateAssetCategory(body)
      : this.#assetCategoriesApi.createAssetCategory(body);

    this.isSubmitting.set(true);
    saveRequest$
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        finalize(() => this.isSubmitting.set(false)),
      )
      .subscribe({
        next: async (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) {
            this.#dialogRef.close(res.data);
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  onCancel() {
    this.#dialogRef.close();
  }
}
