import { FormControl } from '@angular/forms';

export interface GetAssetsReq {
  AssetId?: number;
  AssetTypeId?: number;
  SerialNumber?: string;
  PurchasedDateTime?: string;
  InBetweenPurchaseDate?: string;
  WarrantyExpiryDateTime?: string;
  ModelNumber?: string;
  AssetStatusId?: number;
  IsAssigned?: boolean;
  TypeId?: number;
  CategoryId?: number;
  IsActive: boolean;
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string | string[] | null;
  SortOrder?: string | null;
}

export interface AssetRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: Asset[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface Asset {
  assetId: number;
  assetImageId: number;
  categoryId: number;
  categoryName: string;
  assetName: string;
  assetTypeId: number;
  typeName: string;
  company: string;
  modelNo: string;
  size: string;
  weight: string;
  color: string;
  price: number;
  serialNumber: string;
  barcode: string;
  qrCode: string;
  modelNumber: string;
  assetImagePath?: string;
  assetImageType: number;
  purchaseDate: string;
  warrantyExpiryDate: string;
  assetStatusId: number;
  colorKey: string;
  statusName: string;
  hasMultipleUser: boolean;
  isRepairable: boolean;
  isAssigned: boolean;
  isActive: boolean;
  isDeleting?: boolean; // NG
}

export interface IAssetFilter {
  assetTypeId?: number;
  assetStatusId?: number;
  category?: number;
}

export interface AssetDeleteReq {
  Id: number;
}

export interface AssignAssetReq {
  AssetId: number;
  StaffMemberIds: string[];
}

export interface AssignAssetRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: boolean;
}

export interface AssetForm {
  assetName: FormControl<string>;
  category: FormControl<number | null>;
  assetType: FormControl<number | null>;
  status: FormControl<number | null>;
  company: FormControl<string>;
  assetImage: FormControl<string>;
  color: FormControl<string>;
  price: FormControl<string>;
  modelNo: FormControl<string>;
  size: FormControl<string>;
  weight: FormControl<string>;
  serialNumber: FormControl<string>;
  purchaseDate: FormControl<string | Date>; // ISO string
  warrantyExpiry: FormControl<string | Date>; // ISO string
  isRepairable: FormControl<boolean>;
  isActive: FormControl<boolean>;
}
