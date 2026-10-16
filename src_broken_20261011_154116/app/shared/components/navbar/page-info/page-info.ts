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
      this.breadcrumbItems.set(this.#commonService.breadcrumbItems());
    });
  }
}
