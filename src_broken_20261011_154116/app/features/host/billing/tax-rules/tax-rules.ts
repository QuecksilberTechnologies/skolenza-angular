import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { ContextMenuModule } from '@openng/optimus-ui/contextmenu';
import { MenuModule } from '@openng/optimus-ui/menu';
import { TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import { HOST_BILLING_MODULE, HostTaxRule } from '@shared/interfaces';

import { BillingCatalogPage, BillingCatalogPageConfig } from '../billing-catalog-page';
import { TaxRuleForm } from './tax-rule-form/tax-rule-form';
import { TaxRulesStore } from './tax-rules.store';

@Component({
  selector: 'app-tax-rules',
  imports: [
    DatePipe,
    DecimalPipe,
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    ContextMenuModule,
    MenuModule,
    TableModule,
    TagModule,
    TooltipModule,
    TableActionButton,
    TableEmptyMessage,
    TableInlineFilters,
    TableLoader,
    TableSearchInput,
  ],
  providers: [TaxRulesStore],
  templateUrl: './tax-rules.html',
  styleUrl: '../billing-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TaxRules extends BillingCatalogPage<HostTaxRule> {
  readonly store = inject(TaxRulesStore);

  protected readonly config: BillingCatalogPageConfig<HostTaxRule> = {
    moduleCode: HOST_BILLING_MODULE.taxRules,
    header: {
      title: 'Tax Rules',
      description: 'Set effective-dated tax rates applied to subscription invoices',
      icon: 'pi pi-percentage',
    },
    noun: ['rule', 'rules'],
    form: {
      component: TaxRuleForm,
      title: (isEdit) => (isEdit ? 'Edit Tax Rule' : 'Add Tax Rule'),
      data: (taxRule) => ({ taxRule }),
    },
    deactivateConfirm: (row) => ({
      header: 'Deactivate Tax Rule',
      message: `Are you sure you want to deactivate <strong>${row.taxCode}</strong> (${row.countryCode})? New invoices will no longer apply it.`,
    }),
  };
}
