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
