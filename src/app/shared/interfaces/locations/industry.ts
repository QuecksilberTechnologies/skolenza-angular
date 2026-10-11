export interface GetAllIndustryResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: Industry[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface Industry {
  id: number;
  institutionTypeName: string;
  description: string;
  remark: null | string;
  isActive: boolean;
}

export interface InstitutionProfileOption {
  id: number;
  code: string;
  name: string;
  description: string;
}

export interface InstitutionProfileOptionsResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: InstitutionProfileOption[];
}
