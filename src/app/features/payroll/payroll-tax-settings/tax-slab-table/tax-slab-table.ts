import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TableModule } from '@openng/optimus-ui/table';

export interface TaxSlab {
  from: number;
  to: number | null;
  rate: number;
  label: string;
}

/**
 * Income tax slab table.
 *
 * Split out of the tax settings page so each `p-table` owns its own
 * `#header` / `#body` markers — Optimus resolves projected templates by
 * reference name, which must be unique within a template.
 */
@Component({
  selector: 'app-tax-slab-table',
  imports: [TableModule, DecimalPipe],
  template: `
    <p-table [value]="slabs()" [tableStyle]="{ 'min-width': '100%' }">
      <ng-template #header>
        <tr>
          <th>Income Range</th>
          <th class="text-right">Rate</th>
        </tr>
      </ng-template>
      <ng-template #body let-slab>
        <tr>
          <td>{{ slab.label }}</td>
          <td class="text-right font-medium">
            @if (slab.rate === 0) {
              <span class="text-green-600 dark:text-green-400">Nil</span>
            } @else {
              {{ slab.rate | number: '1.0-0' }}%
            }
          </td>
        </tr>
      </ng-template>
    </p-table>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaxSlabTable {
  readonly slabs = input<TaxSlab[]>([]);
}
