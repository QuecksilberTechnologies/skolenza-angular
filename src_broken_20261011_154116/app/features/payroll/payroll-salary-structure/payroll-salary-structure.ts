import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { TableModule } from '@openng/optimus-ui/table';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import { UserAvatar } from '@shared/components/user-avatar/user-avatar';
import { SalaryStructure } from '@shared/interfaces';
import { SearchPipe } from '@shared/pipes';

import { PayrollStore } from '../payroll.store';
import { SalaryStructureDialog } from '../salary-structure-dialog/salary-structure-dialog';

@Component({
  selector: 'app-payroll-salary-structure',
  imports: [
    UserAvatar,
    CurrencyPipe,
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
  templateUrl: './payroll-salary-structure.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PayrollSalaryStructure {
  readonly #dialogService = inject(DialogService);
  readonly #destroyRef = inject(DestroyRef);
  readonly store = inject(PayrollStore);

  protected searchText = '';

  searchSalary(value: string): void {
    this.searchText = value;
  }

  editSalaryStructure(structure: SalaryStructure): void {
    const ref: DynamicDialogRef | null = this.#dialogService.open(SalaryStructureDialog, {
      header: `Edit Salary Structure - ${structure.staffMemberFullName}`,
      style: { width: '90vw', maxWidth: '50rem' },
      contentStyle: { overflow: 'hidden', padding: '0' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { structure },
    });

    ref?.onClose
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((result: SalaryStructure | null) => {
        if (result) {
          this.store.updateSalaryStructure(result);
        }
      });

    this.#destroyRef.onDestroy(() => ref?.close());
  }
}
