import { FormArray, FormControl, FormGroup } from '@angular/forms';

// StaffMember Experience

export enum ExperienceDocumentType {
  Payslip = 1,
  ExperienceLetter = 2,
  JoiningLetter = 3,
  OfferLetter = 4,
  BankStatement = 5,
  TaxDocument = 6,
  GapCertificate = 7,
  Visa = 8,
  WorkPermit = 9,
  ImmigrationStamp = 10,
  ForeignContract = 11,
}

export const EXPERIENCE_DOCUMENT_TYPE_LABELS: Record<ExperienceDocumentType, string> = {
  [ExperienceDocumentType.Payslip]: 'Payslip',
  [ExperienceDocumentType.ExperienceLetter]: 'Experience Letter',
  [ExperienceDocumentType.JoiningLetter]: 'Joining Letter',
  [ExperienceDocumentType.OfferLetter]: 'Offer Letter',
  [ExperienceDocumentType.BankStatement]: 'Bank Statement',
  [ExperienceDocumentType.TaxDocument]: 'Tax Document',
  [ExperienceDocumentType.GapCertificate]: 'Gap Certificate',
  [ExperienceDocumentType.Visa]: 'Visa',
  [ExperienceDocumentType.WorkPermit]: 'Work Permit',
  [ExperienceDocumentType.ImmigrationStamp]: 'Immigration Stamp',
  [ExperienceDocumentType.ForeignContract]: 'Foreign Contract',
};

export interface GetStaffMemberExperienceReq {
  StaffMemberId: string;
  UserStaffMemberId: string;
}

export interface GetStaffMemberExperienceRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: IStaffMemberExperienceInfo[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasAllDocUploaded: boolean;
  completionPercentage: number;
}

export interface IStaffMemberExperienceInfo {
  id: number;
  staffMemberId: number;
  ctc: number;
  companyName: string;
  designation: string;
  staffMemberIdOfCompany?: string;
  startDate: string;
  endDate?: string;
  experience?: number;
  isWFH: boolean;
  workingCountryId?: number;
  workingStateId?: number;
  workingDistrictId?: number;
  isForeignExperience: boolean;
  reasonForLeaving?: string;
  remark?: string;
  colleagueName?: string;
  colleagueDesignation?: string;
  colleagueContactNumber?: string;
  reportingManagerName?: string;
  reportingManagerNumber?: string;
  verificationEmail?: string;
  completionPercentage: number;
  isAnyGap: boolean;
  reasonOfGap?: string;
  gapYearFrom?: string;
  gapYearTo?: string;
  isExperienceVerified: boolean;
  isExperienceVerifiedByMail: boolean;
  isExperienceVerifiedByCall: boolean;
  isInfoVerified: boolean;
  isEditAllowed: boolean;
  documents: IExperienceDocument[];
}

export interface IExperienceDocument {
  id: number;
  documentType: ExperienceDocumentType;
  documentTypeName: string;
  fileName: string;
  filePath: string;
  hasExperienceDocUploaded: boolean;
  url: string;
  remark: string;
}

export interface ExperienceDocumentForm {
  documentType: FormControl<ExperienceDocumentType | null>;
  file: FormControl<File | null>;
  existingId: FormControl<number | null>;
  existingFileName: FormControl<string>;
  isRemoving: FormControl<boolean>;
}

/** Full reactive form model for create/edit experience (flat shape for template type-checking). */
export interface ExperienceForm {
  ctc: FormControl<number>;
  companyName: FormControl<string>;
  designation: FormControl<string>;
  staffMemberIdOfCompany: FormControl<string>;
  startDate: FormControl<Date | null>;
  endDate: FormControl<Date | null>;
  isForeignExperience: FormControl<boolean>;
  isWfh: FormControl<boolean>;
  reasonForLeaving: FormControl<string>;
  remark: FormControl<string>;
  colleagueName: FormControl<string>;
  colleagueDesignation: FormControl<string>;
  colleagueContactNumber: FormControl<string>;
  reportingManagerName: FormControl<string>;
  reportingManagerNumber: FormControl<string>;
  verificationEmail: FormControl<string>;
  isAnyGap: FormControl<boolean>;
  reasonOfGap: FormControl<string>;
  gapYearFrom: FormControl<Date | null>;
  gapYearTo: FormControl<Date | null>;
  documents: FormArray<FormGroup<ExperienceDocumentForm>>;
}

export interface DeleteStaffMemberExperienceReq {
  Id: number;
}
