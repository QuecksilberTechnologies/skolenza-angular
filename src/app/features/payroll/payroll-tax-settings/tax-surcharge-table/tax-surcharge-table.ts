import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TableModule } from '@openng/optimus-ui/table';

export interface SurchargeSlab {
  threshold: string;
  rate: number;
}

/**
 * Surcharge slab table.
 *
 * Split out of the tax settings page so each `p-table` owns its own
 * `#header` / `#body` markers — Optimus resolves projected templates by
 * reference name, which must be unique within a template.
 */
@Component({
  selector: 'app-tax-surcharge-table',
  imports: [TableModule],
  template: `
    <p-table [value]="slabs()" [tableStyle]="{ 'min-width': '100%' }">
      <ng-template #header>
        <tr>
          <th>Total Income</th>
          <th class="text-right">Surcharge</th>
        </tr>
      </ng-template>
      <ng-template #body let-slab>
        <tr>
          <td>{{ slab.threshold }}</td>
          <td class="text-right font-medium">{{ slab.rate }}%</td>
        </tr>
      </ng-template>
    </p-table>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaxSurchargeTable {
  readonly slabs = input<SurchargeSlab[]>([]);
}
