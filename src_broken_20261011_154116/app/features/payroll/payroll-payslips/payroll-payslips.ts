import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { TableModule } from '@openng/optimus-ui/table';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { AuthStore } from '@core/stores';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import { UserAvatar } from '@shared/components/user-avatar/user-avatar';
import { Payslip } from '@shared/interfaces';
import { SearchPipe } from '@shared/pipes';

import { PayrollStore } from '../payroll.store';
import { PayslipViewer } from '../payslip-viewer/payslip-viewer';

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

@Component({
  selector: 'app-payroll-payslips',
  imports: [
    UserAvatar,
    CurrencyPipe,
    DatePipe,
    CardModule,
    ButtonModule,
    TableModule,
    TooltipModule,
    SearchPipe,
    TableLoader,
    TableEmptyMessage,
    TableSearchInput,
    TableInlineFilters,
  ],
  templateUrl: './payroll-payslips.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PayrollPayslips implements OnInit {
  readonly #dialogService = inject(DialogService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #authStore = inject(AuthStore);
  readonly store = inject(PayrollStore);

  protected searchText = '';
  protected isAdmin = computed(() => this.#authStore.roleTypeId() !== 2);

  ngOnInit(): void {
    if (this.isAdmin()) {
      this.store.setStaffMemberFilter(null);
    }
  }

  searchPayslip(value: string): void {
    this.searchText = value;
  }

  getMonthName(month: number): string {
    return MONTH_SHORT[month - 1] ?? '';
  }

  viewPayslip(payslip: Payslip): void {
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
