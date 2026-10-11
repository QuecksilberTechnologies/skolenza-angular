import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { TagModule } from '@openng/optimus-ui/tag';

import { InstitutionCardMasterRow } from '@shared/interfaces';

interface DetailItem {
  label: string;
  value: string;
}

interface DetailSection {
  title: string;
  items: DetailItem[];
}

const text = (value: string | number | null | undefined): string =>
  value === null || value === undefined || value === '' ? '—' : `${value}`;

const dateText = (value: string | null | undefined): string =>
  value ? new Date(value).toLocaleDateString() : '—';

/**
 * Read-only card summary for the row detail sheet.
 *
 * The DTO carries ~25 fields and the grid only shows a handful, so this panel is where the rest
 * stays reachable. The sections are built in the component to keep the template from repeating
 * the same label/value block twenty-five times.
 */
@Component({
  selector: 'app-institution-card-inventory-detail',
  imports: [ButtonModule, TagModule],
  templateUrl: './institution-card-inventory-detail.html',
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstitutionCardInventoryDetail {
  readonly card = input<InstitutionCardMasterRow | undefined>();
  readonly cardStatusLabel = input('—');
  readonly canUpdate = input(false);
  readonly closePopup = output();
  readonly edit = output();

  protected readonly sections = computed<DetailSection[]>(() => {
    const card = this.card();
    if (!card) {
      return [];
    }

    return [
      {
        title: 'Card',
        items: [
          { label: 'Card Number', value: text(card.cardNumber) },
          { label: 'Card Reference', value: text(card.cardReference) },
          { label: 'Institution', value: text(card.institutionName ?? card.institutionId) },
        ],
      },
      {
        title: 'Purchase',
        items: [
          { label: 'Currency', value: text(card.purchaseCurrencyCode) },
          { label: 'Unit Price (excl. tax)', value: text(card.unitPurchasePriceExcludingTax) },
          { label: 'Invoice Number', value: text(card.purchaseInvoiceNumber) },
          { label: 'Invoice Date', value: dateText(card.purchaseInvoiceDate) },
        ],
      },
      {
        title: 'Supplier',
        items: [
          { label: 'Supplier Name', value: text(card.supplierName) },
          { label: 'Tax Registration No', value: text(card.supplierTaxRegistrationNumber) },
        ],
      },
      {
        title: 'Tax',
        items: [
          {
            label: 'CGST Rate / Amount',
            value: `${text(card.cgstRate)} / ${text(card.cgstAmount)}`,
          },
          {
            label: 'SGST Rate / Amount',
            value: `${text(card.sgstRate)} / ${text(card.sgstAmount)}`,
          },
          {
            label: 'IGST Rate / Amount',
            value: `${text(card.igstRate)} / ${text(card.igstAmount)}`,
          },
          { label: 'Foreign Tax', value: text(card.foreignTaxLabel) },
          {
            label: 'Foreign Tax Rate / Amount',
            value: `${text(card.foreignTaxRate)} / ${text(card.foreignTaxAmount)}`,
          },
        ],
      },
      {
        title: 'Additional Costs',
        items: [
          { label: 'Customs Duty', value: text(card.customsDutyAmount) },
          { label: 'Freight', value: text(card.freightAmount) },
        ],
      },
    ];
  });

  onCancel() {
    this.closePopup.emit();
  }

  onEdit() {
    this.edit.emit();
  }
}
