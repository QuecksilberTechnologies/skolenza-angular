import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AutoFocusModule } from '@openng/optimus-ui/autofocus';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { catchError, finalize, map, of, tap } from 'rxjs';

import { AssetCategoriesApi } from '@core/services/asset-categories-api';
import { AssetTypesApi } from '@core/services/asset-types-api';
import { Common } from '@core/services/common';
import {
  AssetType,
  AssetTypeForm,
  CreateAssetTypeRequest,
  GetAssetCategoryReq,
  LoginInfo,
  UpdateAssetTypeRequest,
} from '@shared/interfaces';

@Component({
  selector: 'app-asset-type-manage-dialog',
  imports: [
    ButtonModule,
    TextareaModule,
    InputTextModule,
    SelectModule,
    ReactiveFormsModule,
    MessageModule,
    AutoFocusModule,
  ],
  templateUrl: './asset-type-manage-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetTypeManageDialog implements OnInit {
  readonly #commonService = inject(Common);
  readonly #assetTypesApi = inject(AssetTypesApi);
  readonly #assetCategoriesApi = inject(AssetCategoriesApi);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dynamicDialogConfig = inject(DynamicDialogConfig);
  readonly #fb = inject(FormBuilder);
  protected loginInfo!: LoginInfo;
  protected assetTypeForm!: FormGroup;
  protected assetType!: AssetType;
  protected isSubmitting = signal(false);

  readonly #categoriesResource = rxResource({
    params: () => ({}),
    stream: () => {
      const body: GetAssetCategoryReq = { IsActive: true };
      return this.#assetCategoriesApi.getAllAssetCategory(body).pipe(
        tap((res) => {
          if (!res.isSucceeded) {
            this.#commonService.showMessage(res.message, 'error');
          }
        }),
        map((res) => (res.isSucceeded ? res.data : [])),
        // `handleError` rethrows; an errored resource makes `value()` throw, which aborts
        // change detection for the whole view — not just this control.
        catchError((err) => {
          this.#commonService.showMessage(err.message, 'error');
          return of([]);
        }),
      );
    },
  });

  protected assetCategories = computed(() => this.#categoriesResource.value() ?? []);
  protected isLoadingCategories = computed(() => this.#categoriesResource.isLoading());

  constructor() {
    this.assetType = this.#dynamicDialogConfig.data.assetType;
    this.initForm();
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
  }

  initForm() {
    this.assetTypeForm = this.#fb.group({
      typeName: [this.assetType?.typeName || '', [Validators.required, Validators.minLength(3)]],
      categroy: [this.assetType?.assetCategoryId || null, [Validators.required]],
      description: [this.assetType?.description],
    });
  }

  isInvalid(controlName: string) {
    const control = this.assetTypeForm.get(controlName);
    return control?.invalid && control.touched;
  }

  async onSubmit() {
    const formValue = this.assetTypeForm.value;
    if (this.assetType?.id) {
      this.updateType(formValue);
    } else {
      this.addType(formValue);
    }
  }

  addType(form: AssetTypeForm) {
    const body: CreateAssetTypeRequest = {
      assetCategoryId: +form.categroy,
      typeName: form.typeName,
      description: form.description,
      isActive: true,
    };

    this.isSubmitting.set(true);
    this.#assetTypesApi
      .createAssetType(body)
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) {
            this.#dialogRef.close(res);
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  updateType(form: AssetTypeForm) {
    const body: UpdateAssetTypeRequest = {
      id: this.assetType.id,
      categoryId: +form.categroy,
      typeName: form.typeName,
      description: form.description,
      isActive: true,
    };

    this.isSubmitting.set(true);
    this.#assetTypesApi
      .updateAssetType(body)
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) {
            this.#dialogRef.close(res);
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
