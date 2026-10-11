import { FormControl } from '@angular/forms';

export interface GetAssetCategoryReq {
  Id?: number;
  IsActive: boolean;
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string;
  SortOrder?: string;
}

export interface GetAssetCategoryRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: IAssetCategory[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface UpsertAssetCategoryReq {
  categoryName: string;
  remark: string;
  isActive: boolean;
  hasMultipleUser: true;
  id?: number;
}

export interface UpsertAssetCategoryRes {
  isSucceeded: boolean;
  message: string;
  errors: [];
  data: IAssetCategory;
}

export interface DeleteAssetCategoryReq {
  id: number;
}

export interface DeleteAssetCategoryRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: boolean;
}

export interface IAssetCategory {
  id: number;
  categoryName: string;
  remark: string;
  isActive: boolean;
  userStaffMemberId: string;
  hasMultipleUser: boolean;
  pageNumber: number;
  pageSize: number;
  sortBy: string;
  sortOrder: string;
  isDeleting?: boolean; // NG
}

export interface AssetCategoryForm {
  categoryName: FormControl<string>;
  remark: FormControl<string>;
  hasMultipleUser: FormControl<boolean>;
}
