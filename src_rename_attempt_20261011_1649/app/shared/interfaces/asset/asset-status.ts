export interface GetAssetStatusRequest {
  Id?: number;
  IsActive: boolean;
}

export interface GetAssetStatusResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: AssetStatus[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface CreateAssetStatusRequest {
  statusName: string;
  colorKey: string;
  description: string;
}

export interface CreateAssetStatusResponse {
  isSucceeded: boolean;
  message: string;
  errors: [];
  data: AssetStatus;
}

export interface UpdateAssetStatusRequest {
  id: number;
  statusName: string;
  colorKey: string;
  description: string;
  isActive: boolean;
}

export interface UpdateAssetStatusResponse {
  isSucceeded: boolean;
  message: string;
  errors: [];
  data: AssetStatus;
}

export interface DeleteAssetStatusRequest {
  Id: number;
}

export interface DeleteAssetStatusResponse {
  isSucceeded: boolean;
  message: string;
  errors: [];
  data: AssetStatus;
}

export interface AssetStatus {
  id: number;
  institutionId: number;
  isActive: boolean;
  statusName: string;
  colorKey?: string;
  description: string;
  addedById: number;
  updateById: unknown;
  updatedDateTime?: string;
  addedDateTime: string;
}

export interface AssetStatusForm {
  statusName: string;
  description: string;
  color: string;
}
