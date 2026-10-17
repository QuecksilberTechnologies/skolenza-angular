import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { SelectModule } from '@openng/optimus-ui/select';
import { TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { Common } from '@core/services';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import { UserAvatar } from '@shared/components/user-avatar/user-avatar';
import { PayrollRecord, PayrollStatus, Payslip } from '@shared/interfaces';
import { SearchPipe } from '@shared/pipes';

import { PayrollStore } from '../payroll.store';
import { PayslipViewer } from '../payslip-viewer/payslip-viewer';

@Component({
  selector: 'app-payroll-overview',
  imports: [
    UserAvatar,
    CurrencyPipe,
    FormsModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    SelectModule,
    TooltipModule,
    ConfirmDialogModule,
    SearchPipe,
    TableLoader,
    TableEmptyMessage,
    TableSearchInput,
    TableInlineFilters,
  ],
  templateUrl: './payroll-overview.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PayrollOverview {
  readonly #commonService = inject(Common);
  readonly #dialogService = inject(DialogService);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #destroyRef = inject(DestroyRef);
  readonly store = inject(PayrollStore);

  protected searchText = '';

  readonly statusOptions = [
    { label: 'All statuses', value: null },
    { label: 'Processed', value: 'processed' },
    { label: 'Pending', value: 'pending' },
  ];

  onDepartmentChange(department: string | null): void {
    this.store.setDepartmentFilter(department);
  }

  onStatusChange(status: PayrollStatus | null): void {
    this.store.setStatusFilter(status);
  }

  searchPayroll(value: string): void {
    this.searchText = value;
  }

  getStatusSeverity(status: PayrollStatus): 'success' | 'warn' {
    return status === 'processed' ? 'success' : 'warn';
  }

  processSelected(records: PayrollRecord[]): void {
    const pending = records.filter((r) => r.status === 'pending');
    if (pending.length === 0) {
      this.#commonService.showMessage('No pending records to process.', 'warn');
      return;
    }

    this.#confirmationService.confirm({
      message: `Process payroll for <strong>${pending.length}</strong> staffMember(s)? This action will mark them as paid.`,
      header: 'Confirm Payroll Processing',
      icon: 'pi pi-exclamation-triangle !text-amber-500 !text-xl',
      acceptLabel: 'Process',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.store.processPayroll(pending.map((r) => r.id));
      },
    });
  }

  processSingle(record: PayrollRecord): void {
    this.processSelected([record]);
  }

  exportCsv(): void {
    this.store.exportPayrollCsv();
  }

  viewPayslipForRecord(record: PayrollRecord): void {
    const slip = this.store
      .payslips()
      .find(
        (p) =>
          p.staffMemberId === record.staffMemberId &&
          p.month === record.month &&
          p.year === record.year,
      );
    if (slip) {
      this.#openPayslipDialog(slip);
    } else {
      this.#commonService.showMessage('Payslip not yet generated for this record.', 'warn');
    }
  }

  #openPayslipDialog(payslip: Payslip): void {
    const ref: DynamicDialogRef | null = this.#dialogService.open(PayslipViewer, {
      header: `Payslip - ${payslip.staffMemberFullName}`,
      style: { width: '90vw', maxWidth: '48rem' },
      contentStyle: { overflow: 'auto' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { payslip },
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }
}
