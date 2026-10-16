import { ChangeDetectionStrategy, Component, effect, inject, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DatePickerModule } from '@openng/optimus-ui/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { IconFieldModule } from '@openng/optimus-ui/iconfield';
import { InputIconModule } from '@openng/optimus-ui/inputicon';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectChangeEvent } from '@openng/optimus-ui/select';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { formatISO, parseISO } from 'date-fns';

import { Common } from '@core/services/common';
import { FormFileUpload } from '@shared/components/profile/form-file-upload/form-file-upload';
import { Asset, AssetForm, LoginInfo } from '@shared/interfaces';
import { FileTypes } from '@shared/types';

import { SelectField } from '../../select-field/select-field';
import { AssetStatusSelect } from '../asset-status-select/asset-status-select';
import { UpsertAssetDialogStore } from './upsert-asset-dialog.store';

@Component({
  selector: 'app-upsert-asset-dialog',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    SelectField,
    AssetStatusSelect,
    DatePickerModule,
    ToggleSwitchModule,
    MessageModule,
    IconFieldModule,
    InputIconModule,
    FormFileUpload,
  ],
  providers: [UpsertAssetDialogStore],
  templateUrl: './upsert-asset-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertAssetDialog implements OnInit {
  readonly store = inject(UpsertAssetDialogStore);
  readonly #commonService = inject(Common);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dynamicDialogConfig = inject(DynamicDialogConfig);
  readonly #fb = inject(NonNullableFormBuilder);
  protected selectedFile: File | null = null;
  protected imageBase64: string | null = null;
  protected today = new Date();
  protected asset!: Asset;
  protected loginInfo!: LoginInfo;
  protected assetForm!: FormGroup<AssetForm>;

  constructor() {
    this.asset = this.#dynamicDialogConfig.data?.asset;
    this.initForm();

    effect(() => {
      if (this.store.isLoadingTypes()) {
        this.assetForm.get('assetType')?.disable();
      } else {
        this.assetForm.get('assetType')?.enable();
      }
    });

    effect(() => {
      if (this.store.isLoadingStatus()) {
        this.assetForm.get('status')?.disable();
      } else {
        this.assetForm.get('status')?.enable();
      }
    });

    effect(() => {
      if (this.store.isLoadingCategories()) {
        this.assetForm.get('categroy')?.disable();
      } else {
        this.assetForm.get('categroy')?.enable();
      }
    });
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();

    if (this.asset) {
      this.patchForm();
    }
  }

  initForm() {
    this.assetForm = this.#fb.group({
      assetName: ['', [Validators.required, Validators.minLength(3)]],
      category: new FormControl<number | null>(null, {
        validators: [Validators.required],
      }),
      assetType: new FormControl<number | null>(
        { value: null, disabled: true },
        { validators: [Validators.required] },
      ),
      status: new FormControl<number | null>(null, {
        validators: [Validators.required],
      }),
      company: ['', [Validators.required]],
      assetImage: [''],
      color: [''],
      price: [''],
      modelNo: [''],
      size: [''],
      weight: [''],
      serialNumber: [''],
      purchaseDate: new FormControl<string | Date>('', { nonNullable: true }),
      warrantyExpiry: new FormControl<string | Date>('', { nonNullable: true }),
      isRepairable: [false],
      isActive: [true],
    });
  }

  patchForm() {
    const purchaseDate = this.asset?.purchaseDate ? parseISO(this.asset.purchaseDate!) : '';

    const warrantyExpiryDate = this.asset?.warrantyExpiryDate
      ? parseISO(this.asset!.warrantyExpiryDate!)
      : '';

    this.assetForm.patchValue({
      assetName: this.asset?.assetName ?? '',
      category: this.asset?.categoryId ?? null,
      assetType: this.asset?.assetTypeId ?? null,
      status: this.asset?.assetStatusId ?? null,
      assetImage: this.asset?.assetImagePath ?? '',
      company: this.asset?.company ?? '',
      color: this.asset?.color ?? '',
      price:
        this.asset?.price !== undefined && this.asset?.price !== null
          ? this.asset.price.toString()
          : '',
      modelNo: this.asset?.modelNo ?? '',
      size: this.asset?.size ?? '',
      weight: this.asset?.weight ?? '',
      serialNumber: this.asset?.serialNumber ?? '',
      purchaseDate: purchaseDate,
      warrantyExpiry: warrantyExpiryDate,
      isRepairable: this.asset?.isRepairable ?? false,
      isActive: this.asset?.isActive ?? true,
    });

    this.assetForm.get('assetImage')?.disable();

    if (this.asset?.categoryId) {
      this.store.setCategoryIdForTypes(this.asset.categoryId);
    }
  }

  isInvalid(controlName: string) {
    const control = this.assetForm.get(controlName);
    return control?.invalid && control.touched;
  }

  onCategory(event: SelectChangeEvent) {
    this.store.setCategoryIdForTypes(event.value);
  }

  onSelectFile(file: File | null) {
    if (file) {
      if (!(file.type.startsWith('image/') || file.type === 'application/pdf')) {
        this.#commonService.showMessage('Only image files are allowed!', 'error');
        return;
      }

      const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!file.type || !validTypes.includes(file.type)) {
        const msg = 'Invalid file format. Allowed: JPG, PNG only.';
        this.#commonService.showMessage(msg, 'error');
        return;
      }
    }

    this.selectedFile = file;
  }

  onSubmit() {
    const form = this.assetForm.value;

    const fd = new FormData();
    fd.append('AssetName', form.assetName ?? '');
    fd.append('AssetTypeId', String(form.assetType ?? ''));
    fd.append('Company', form.company ?? '');
    fd.append('ModelNo', form.modelNo ?? '');
    fd.append('Size', form.size ?? '');
    fd.append('Weight', form.weight ?? '');
    fd.append('Color', form.color ?? '');
    fd.append('Price', form.price ? String(form.price) : '0');
    fd.append('SerialNumber', form.serialNumber ?? '');
    fd.append('Barcode', '');
    fd.append('PurchaseDate', form?.purchaseDate ? formatISO(form.purchaseDate) : '');
    fd.append('WarrantyExpiryDate', form?.warrantyExpiry ? formatISO(form.warrantyExpiry) : '');
    fd.append('AssetImageFile', this.selectedFile ? this.selectedFile : '');
    fd.append('AssetImagePath', form.assetImage ?? '');
    fd.append('AssetImageType', FileTypes.Image);
    fd.append('AssetStatusId', String(form.status ?? ''));
    fd.append('IsRepairable', String(form.isRepairable ?? ''));
    fd.append('IsAssigned', 'false');
    fd.append('IsActive', 'true');

    if (this.asset && this.asset.assetId) {
      fd.append('Id', String(this.asset.assetId));
    }

    this.store.saveAsset(fd, this.asset, (data) => {
      this.#dialogRef.close(data);
    });
  }

  onCancel() {
    this.#dialogRef.close();
  }
}
