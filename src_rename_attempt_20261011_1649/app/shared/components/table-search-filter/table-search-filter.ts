import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { OverlayBadgeModule } from '@openng/optimus-ui/overlaybadge';

@Component({
  selector: 'app-table-search-filter',
  imports: [OverlayBadgeModule, ButtonModule],
  templateUrl: './table-search-filter.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableSearchFilter {
  readonly filterCount = input<number>(0);
  readonly filter = output();

  onFilter() {
    this.filter.emit();
  }
}
