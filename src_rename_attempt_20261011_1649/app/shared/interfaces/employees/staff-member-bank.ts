import { FormControl } from '@angular/forms';

// StaffMember Bank
export interface GetStaffMemberBankReq {
  StaffMemberId: string;
  AccountType?: string;
  IsPrimaryAccount?: boolean;
  HasChequeDocUploaded?: boolean;
  IsActive?: boolean;
  IsInfoVerified?: boolean;
  IsEditAllowed?: boolean;
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string;
  SortOrder?: string;
  UserStaffMemberId: string;
  Id?: string;
}

export interface GetStaffMemberBankRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: IStaffMemberBankInfo[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasAllDocUploaded: boolean;
  completionPercentage: number;
}

export interface IStaffMemberBankInfo {
  id: number;
  staffMemberId: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  accountType: string;
  upiId: string;
  isPrimaryAccount: boolean;
  isInfoVerified: boolean;
  isEditAllowed: boolean;
  isActive: boolean;
  hasChequeDocUploaded: boolean;
  filePath: string;
  fileName: string;
  fileType: string;
  cancelledChequeFile: unknown;
  completionPercentage: number;
  isMasked: boolean; // NG
  accountNumberMasked: boolean; // NG
  ifscCodeMasked: boolean; // NG
  upiIdMasked: boolean; // NG
  isVerifying: boolean; // NG
  isEditing: boolean; // NG
}

export interface BankForm {
  upiId: FormControl<string>;
  bankName: FormControl<string>;
  branchName: FormControl<string>;
  accountNumber: FormControl<string>;
  ifscCode: FormControl<string>;
  accountType: FormControl<string>;
  cancelledCheque: FormControl<string>;
  primaryAccount: FormControl<boolean>;
}

export interface BankAccountType {
  name: string;
  value: string;
}

export interface DeleteStaffMemberBankReq {
  UserStaffMemberId: string;
  StaffMemberId: string;
  Id: number;
}
