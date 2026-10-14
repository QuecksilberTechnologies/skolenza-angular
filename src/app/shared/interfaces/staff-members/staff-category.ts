export interface StaffCategory {
  id: number;
  code: string;
  label: string;
  description?: string | null;
}

export interface StaffCategoryOptionsResponse {
  isSucceeded: boolean;
  message: string;
  errors: string[];
  data: StaffCategory[];
}

export interface HostStaffCategory {
  id: number;
  code: string;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  isSystemDefined: boolean;
}

export type SaveHostStaffCategory = Omit<HostStaffCategory, 'id' | 'isSystemDefined'> & {
  id?: number;
};
