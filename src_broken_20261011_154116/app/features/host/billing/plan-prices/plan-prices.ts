import { CurrencyPipe, DatePipe } from '@angular/common';
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
import { HOST_BILLING_MODULE, HostPlanPrice } from '@shared/interfaces';

import { BillingCatalogPage, BillingCatalogPageConfig } from '../billing-catalog-page';
import { PlanPriceForm } from './plan-price-form/plan-price-form';
import { PlanPricesStore } from './plan-prices.store';

@Component({
  selector: 'app-plan-prices',
  imports: [
    CurrencyPipe,
    DatePipe,
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
  providers: [PlanPricesStore],
  templateUrl: './plan-prices.html',
  styleUrl: '../billing-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PlanPrices extends BillingCatalogPage<HostPlanPrice> {
  readonly store = inject(PlanPricesStore);

  protected readonly config: BillingCatalogPageConfig<HostPlanPrice> = {
    moduleCode: HOST_BILLING_MODULE.planPrices,
    header: {
      title: 'Plan Pricing',
      description: 'Set effective-dated monthly and yearly prices per country',
      icon: 'pi pi-tags',
    },
    noun: ['price', 'prices'],
    form: {
      component: PlanPriceForm,
      title: (isEdit) => (isEdit ? 'Edit Plan Price' : 'Add Plan Price'),
      data: (planPrice) => ({ planPrice }),
    },
    deactivateConfirm: (row) => ({
      header: 'Deactivate Price',
      message: `Are you sure you want to deactivate the <strong>${row.billingCycle}</strong> price for <strong>${row.planName}</strong>? Institutions will no longer be offered it.`,
    }),
  };
}
