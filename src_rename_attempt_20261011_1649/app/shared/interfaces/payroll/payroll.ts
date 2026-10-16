export type PayrollStatus = 'processed' | 'pending';
export type SalaryComponentType = 'fixed' | 'percentage';

export interface SalaryComponent {
  name: string;
  type: SalaryComponentType;
  amount: number;
  percentage?: number;
  baseComponent?: string;
}

export interface SalaryStructure {
  id: string;
  staffMemberId: string;
  staffMemberFullName: string;
  departmentName: string;
  designationName: string;
  effectiveFrom: string;
  components: {
    earnings: SalaryComponent[];
    deductions: SalaryComponent[];
  };
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  isActive: boolean;
}

export interface PayrollRecord {
  id: string;
  staffMemberId: string;
  staffMemberFullName: string;
  departmentName: string;
  designationName: string;
  month: number;
  year: number;
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  lopDays: number;
  basicSalary: number;
  hra: number;
  allowances: number;
  grossSalary: number;
  providentFund: number;
  professionalTax: number;
  incomeTax: number;
  lopDeduction?: number;
  totalDeductions: number;
  netSalary: number;
  status: PayrollStatus;
  processedDate: string | null;
  paymentMode: string | null;
  transactionId: string | null;
}

export interface PayslipLineItem {
  name: string;
  amount: number;
}

export interface Payslip {
  id: string;
  payrollId: string;
  staffMemberId: string;
  staffMemberFullName: string;
  departmentName: string;
  designationName: string;
  month: number;
  year: number;
  generatedDate: string;
  earnings: PayslipLineItem[];
  deductions: PayslipLineItem[];
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  lopDays: number;
}

export interface PayrollSummary {
  totalStaffMembersPaid: number;
  totalPayrollCost: number;
  pendingPayments: number;
  totalStaffMembers: number;
}

// API response types
export interface GetSalaryStructuresResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: SalaryStructure[];
  totalRecords: number;
}

export interface GetPayrollRecordsResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: PayrollRecord[];
  totalRecords: number;
}

export interface GetPayslipsResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: Payslip[];
  totalRecords: number;
}
