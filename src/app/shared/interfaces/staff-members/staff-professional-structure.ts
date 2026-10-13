export enum StaffProfessionalMasterType {
  JobFamily = 1,
  Capability = 2,
  DutyDefinition = 3,
}

export interface StaffProfessionalMaster {
  id: number;
  code: string;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  requiresCertification: boolean;
  certificationValidityRequired: boolean;
  defaultFrequency?: string;
  requiresEvidence: boolean;
}

export type SaveStaffProfessionalMaster = Omit<StaffProfessionalMaster, 'id'> & { id?: number };

export interface InstitutionStaffCategory {
  id: number;
  staffCategoryTypeId: number;
  staffCategoryTypeName: string;
  code: string;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  activeJobFamilyCount: number;
  staffJobFamilyMasterIds: number[];
  activePositionCount: number;
  activeStaffCount: number;
}

export type SaveInstitutionStaffCategory = Pick<
  InstitutionStaffCategory,
  'staffCategoryTypeId' | 'code' | 'name' | 'description' | 'displayOrder' | 'isActive'
> & { id?: number; staffJobFamilyMasterIds: number[] };

export interface StaffPositionRequirement extends StaffProfessionalMaster {
  isMandatory: boolean;
}

export interface StaffPositionMaster {
  id: number;
  staffJobFamilyMasterId: number;
  institutionStaffCategoryMasterId?: number;
  jobFamilyName: string;
  staffCategoryId: number;
  staffCategoryName: string;
  departmentId?: number;
  designationId?: number;
  code: string;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  capabilities: StaffPositionRequirement[];
  duties: StaffPositionRequirement[];
}

export interface SaveStaffPositionMaster {
  id?: number;
  staffJobFamilyMasterId: number;
  institutionStaffCategoryMasterId: number;
  departmentId?: number;
  designationId?: number;
  code: string;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  capabilities: { id: number; isMandatory: boolean; displayOrder: number }[];
  duties: { id: number; isMandatory: boolean; displayOrder: number }[];
}

export interface StaffProfessionalProfile {
  positionAssignmentId?: number;
  staffPositionMasterId?: number;
  positionName?: string;
  staffJobFamilyMasterId?: number;
  jobFamilyName?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  isPrimary: boolean;
  capabilities: StaffCapabilityAssignment[];
  duties: StaffDutyAssignment[];
}

export interface StaffCapabilityAssignment {
  id: number;
  staffCapabilityMasterId: number;
  name: string;
  verificationStatus: number;
  verificationStatusName: string;
  isRequired: boolean;
  verifiedDateTime?: string;
  verificationRemark?: string;
}

export interface StaffDutyAssignment {
  id: number;
  staffDutyDefinitionMasterId: number;
  name: string;
  frequency?: string;
  isActive: boolean;
}

export interface ApiDataResponse<T> {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: T;
}
