export interface GetAssetTypesRequest {
  TypeId?: number;
  CategoryId?: number;
  IsActive: boolean;
}

export interface GetAssetTypesResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: AssetType[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface CreateAssetTypeRequest {
  assetCategoryId: number;
  typeName: string;
  description: string;
  isActive: boolean;
}

export interface CreateAssetTypeResponse {
  isSucceeded: boolean;
  message: string;
  errors: [];
  data: AssetType;
}

export interface UpdateAssetTypeRequest {
  id: number;
  categoryId: number;
  typeName: string;
  description: string;
  isActive: boolean;
}

export interface UpdateAssetTypeResponse {
  isSucceeded: boolean;
  message: string;
  errors: [];
  data: AssetType;
}

export interface DeleteAssetTypeRequest {
  Id: number;
}

export interface DeleteAssetTypeResponse {
  isSucceeded: boolean;
  message: string;
  errors: [];
  data: AssetType;
}

export interface AssetType {
  id: number;
  institutionId: number;
  assetCategoryId: number;
  categoryName: unknown;
  typeName: string;
  description: unknown;
  isActive: boolean;
  addedById: number;
  addedDateTime: string;
  updatedById: unknown;
  updatedDateTime: unknown;
}

export interface AssetTypeForm {
  typeName: string;
  description: string;
  categroy: string;
}
