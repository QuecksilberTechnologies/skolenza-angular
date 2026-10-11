import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from '@openng/optimus-ui/button';
import { finalize } from 'rxjs';

import { AssetStatusApi } from '@core/services/asset-status-api';
import { AssetTypesApi } from '@core/services/asset-types-api';
import { Common } from '@core/services/common';
import {
  AssetStatus,
  AssetType,
  GetAssetStatusRequest,
  GetAssetTypesRequest,
  IAssetFilter,
  LoginInfo,
} from '@shared/interfaces';

import { SelectField } from '../../select-field/select-field';
import { AssetStatusSelect } from '../asset-status-select/asset-status-select';

@Component({
  selector: 'app-asset-filter',
  imports: [ButtonModule, ReactiveFormsModule, SelectField, AssetStatusSelect],
  templateUrl: './asset-filter.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetFilter implements OnInit {
  readonly appliedFilters = input<IAssetFilter | null>();
  readonly applyFiltersEvent = output<IAssetFilter | null>();
  readonly closePopup = output();
  readonly #assetTypesApi = inject(AssetTypesApi);
  readonly #assetStatusApi = inject(AssetStatusApi);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #fb = inject(FormBuilder);
  protected loginInfo!: LoginInfo;
  protected assetFilterForm!: FormGroup;
  protected assetTypes = signal<AssetType[]>([]);
  protected assetStatuses = signal<AssetStatus[]>([]);
  protected isLoadingStatus = signal(false);
  protected isLoadingTypes = signal(false);
  protected isSaving = signal<boolean>(false);

  constructor() {
    this.initForm();
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
    this.fetchAssetsTypes();
    this.fetchAssetsStatus();
    const existing = this.appliedFilters();
    if (existing) {
      this.assetFilterForm.patchValue({
        assetType: existing.assetTypeId ?? '',
        status: existing.assetStatusId ?? '',
      });
    }
  }

  initForm() {
    this.assetFilterForm = this.#fb.group({
      assetType: [''],
      status: [''],
    });
  }

  fetchAssetsStatus() {
    const body: GetAssetStatusRequest = { IsActive: true };

    this.isLoadingStatus.set(true);
    if (this.isLoadingStatus()) {
      this.assetFilterForm.get('status')?.disable();
    }

    this.#assetStatusApi
      .fetchAssetsStatus(body)
      .pipe(
        finalize(() => {
          this.isLoadingStatus.set(false);
          this.assetFilterForm.get('status')?.enable();
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.assetStatuses.set(response.data);
        },
        error: () => {
          this.#commonService.showMessage('Failed to load asset statuses', 'error');
        },
      });
  }

  fetchAssetsTypes() {
    const body: GetAssetTypesRequest = { IsActive: true };

    this.isLoadingTypes.set(true);
    if (this.isLoadingTypes()) {
      this.assetFilterForm.get('assetType')?.disable();
    }

    this.#assetTypesApi
      .fetchAssetsTypes(body)
      .pipe(
        finalize(() => {
          this.isLoadingTypes.set(false);
          this.assetFilterForm.get('assetType')?.enable();
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.assetTypes.set(response.data);
        },
        error: () => {
          this.#commonService.showMessage('Failed to load asset types', 'error');
        },
      });
  }

  onCancel() {
    this.closePopup.emit();
  }

  onReset() {
    this.assetFilterForm.reset();
    this.applyFilters();
  }

  async onApply() {
    this.applyFilters();
  }

  applyFilters() {
    const { assetType, status } = this.assetFilterForm.getRawValue();
    const filters: IAssetFilter | null =
      assetType || status
        ? { assetTypeId: assetType || undefined, assetStatusId: status || undefined }
        : null;
    this.applyFiltersEvent.emit(filters);
  }
}
