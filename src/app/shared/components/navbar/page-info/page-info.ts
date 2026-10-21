import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { MenuItem } from '@openng/optimus-ui/api';
import { BreadcrumbModule } from '@openng/optimus-ui/breadcrumb';

import { Common, PageHeaderInfo } from '@core/services/common';

@Component({
  selector: 'app-page-info',
  imports: [BreadcrumbModule],
  templateUrl: './page-info.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageInfo {
  readonly #commonService = inject(Common);
  readonly pageHeaderInfo = signal<PageHeaderInfo | null>(null);
  readonly breadcrumbItems = signal<MenuItem[]>([]);

  constructor() {
    effect(() => {
      this.pageHeaderInfo.set(this.#commonService.pageHeaderInfo());
    });

    effect(() => {
      const items = this.#commonService.breadcrumbItems();
      // Optimus gives every crumb tabindex 0; the current page is not a link, so take it out of
      // the tab order. It already carries aria-current="page".
      this.breadcrumbItems.set(
        items.map((item, i) => (i === items.length - 1 ? { ...item, tabindex: '-1' } : item)),
      );
    });
  }
}
