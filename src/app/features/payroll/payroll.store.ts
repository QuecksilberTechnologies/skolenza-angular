import { computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { finalize, forkJoin } from 'rxjs';

import { Common } from '@core/services';
import {
  PayrollRecord,
  PayrollStatus,
  PayrollSummary,
  Payslip,
  SalaryStructure,
} from '@shared/interfaces';

import { PayrollApi } from './payroll-api';

interface PayrollState {
  salaryStructures: SalaryStructure[];
  payrollRecords: PayrollRecord[];
  payslips: Payslip[];
  isLoading: boolean;
  selectedMonth: number;
  selectedYear: number;
  departmentFilter: string | null;
  statusFilter: PayrollStatus | null;
  staffMemberFilter: string | null;
}

const now = new Date();

const initialState: PayrollState = {
  salaryStructures: [],
  payrollRecords: [],
  payslips: [],
  isLoading: false,
  selectedMonth: now.getMonth() + 1,
  selectedYear: now.getFullYear(),
  departmentFilter: null,
  statusFilter: null,
  staffMemberFilter: null,
};

export const PayrollStore = signalStore(
  withState(initialState),
  withComputed((store) => ({
    summary: computed<PayrollSummary>(() => {
      const records = store.payrollRecords();
      const processed = records.filter((r) => r.status === 'processed');
      const pending = records.filter((r) => r.status === 'pending');
      return {
        totalStaffMembersPaid: processed.length,
        totalPayrollCost: processed.reduce((sum, r) => sum + r.netSalary, 0),
        pendingPayments: pending.length,
        totalStaffMembers: records.length,
      };
    }),
    filteredRecords: computed(() => {
      let records = store.payrollRecords();
      const dept = store.departmentFilter();
      const status = store.statusFilter();
      const empId = store.staffMemberFilter();
      if (empId) {
        records = records.filter((r) => r.staffMemberId === empId);
      }
      if (dept) {
        records = records.filter((r) => r.departmentName === dept);
      }
      if (status) {
        records = records.filter((r) => r.status === status);
      }
      return records;
    }),
    filteredPayslips: computed(() => {
      const empId = store.staffMemberFilter();
      if (empId) {
        return store.payslips().filter((p) => p.staffMemberId === empId);
      }
      return store.payslips();
    }),
    departments: computed(() => {
      const depts = store.payrollRecords().map((r) => r.departmentName);
      return [...new Set(depts)].sort();
    }),
  })),
  withMethods((store) => {
    const payrollApi = inject(PayrollApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    return {
      loadAll(): void {
        patchState(store, { isLoading: true });

        forkJoin({
          salaryStructures: payrollApi.getSalaryStructures(),
          payrollRecords: payrollApi.getPayrollRecords(),
          payslips: payrollApi.getPayslips(),
        })
          .pipe(
            finalize(() => patchState(store, { isLoading: false })),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: ({ salaryStructures, payrollRecords, payslips }) => {
              patchState(store, {
                salaryStructures: salaryStructures.isSucceeded ? salaryStructures.data : [],
                payrollRecords: payrollRecords.isSucceeded ? payrollRecords.data : [],
                payslips: payslips.isSucceeded ? payslips.data : [],
              });
            },
            error: () => {
              commonService.showMessage('Failed to load payroll data.', 'error');
            },
          });
      },

      setStaffMemberFilter(staffMemberId: string | null): void {
        patchState(store, { staffMemberFilter: staffMemberId });
      },

      setDepartmentFilter(department: string | null): void {
        patchState(store, { departmentFilter: department });
      },

      setStatusFilter(status: PayrollStatus | null): void {
        patchState(store, { statusFilter: status });
      },

      setMonthYear(month: number, year: number): void {
        patchState(store, { selectedMonth: month, selectedYear: year });
      },

      processPayroll(recordIds: string[]): void {
        const records = store.payrollRecords().map((r) =>
          recordIds.includes(r.id)
            ? {
                ...r,
                status: 'processed' as PayrollStatus,
                processedDate: new Date().toISOString(),
                paymentMode: 'Bank Transfer',
                transactionId: `TXN${Date.now()}`,
              }
            : r,
        );
        patchState(store, { payrollRecords: records });
        commonService.showMessage(
          `${recordIds.length} payroll record(s) processed successfully.`,
          'success',
        );
      },

      getPayslipsForStaffMember(staffMemberId: string): Payslip[] {
        return store.payslips().filter((p) => p.staffMemberId === staffMemberId);
      },

      getSalaryStructure(staffMemberId: string): SalaryStructure | undefined {
        return store.salaryStructures().find((s) => s.staffMemberId === staffMemberId);
      },

      updateSalaryStructure(updated: SalaryStructure): void {
        const structures = store.salaryStructures().map((s) => (s.id === updated.id ? updated : s));
        patchState(store, { salaryStructures: structures });
        commonService.showMessage('Salary structure updated successfully.', 'success');
      },

      exportPayrollCsv(): void {
        const records = store.filteredRecords();
        const headers = [
          'StaffMember ID',
          'StaffMember Name',
          'Department',
          'Gross Salary',
          'Total Deductions',
          'Net Salary',
          'Status',
        ];
        const rows = records.map((r) => [
          r.staffMemberId,
          r.staffMemberFullName,
          r.departmentName,
          r.grossSalary,
          r.totalDeductions,
          r.netSalary,
          r.status,
        ]);
        const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payroll-report-${store.selectedMonth()}-${store.selectedYear()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        commonService.showMessage('Payroll report exported successfully.', 'success');
      },
    };
  }),
);
