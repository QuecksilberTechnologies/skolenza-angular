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

export type SaveStaffProfessionalMaster = Omit<
  StaffProfessionalMaster,
  'id'
> & { id?: number };

export interface StaffPositionMaster {
  id: number;
  staffJobFamilyMasterId: number;
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
  capabilities: StaffProfessionalMaster[];
  duties: StaffProfessionalMaster[];
}

export interface SaveStaffPositionMaster {
  id?: number;
  staffJobFamilyMasterId: number;
  staffCategoryId: number;
  departmentId?: number;
  designationId?: number;
  code: string;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  capabilityIds: number[];
  dutyDefinitionIds: number[];
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
