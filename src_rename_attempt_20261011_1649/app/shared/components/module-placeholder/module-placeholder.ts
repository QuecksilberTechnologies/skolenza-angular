import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';

import { Common } from '@core/services/common';
import { StatusMessage } from '@shared/components/status-message/status-message';

/** Where the page's one action leads: an absolute app url and the label that names it. */
export interface ModulePlaceholderBack {
  label: string;
  url: string;
}

/**
 * What a route's `data` must carry for this page to name itself.
 *
 * Declared rather than read off `ActivatedRoute.data`'s index signature, which is `any`-typed.
 * `modulePlaceholderRoute()` is the only thing that should write it.
 */
export interface ModulePlaceholderData {
  pageTitle: string;
  back: ModulePlaceholderBack;
}

/**
 * The landing page for a module `GET /Navigation/my-menu` publishes before its screen exists.
 *
 * The backend grants permissions per module and the sidebar renders whatever the payload carries,
 * so a granted module with no route either vanishes from the menu - which hides that the institution
 * paid for it - or links nowhere. This page is the third option: the leaf renders, the route
 * resolves, and the copy says the screen is still coming.
 *
 * It lives in `shared/` rather than under a feature because route files in three different features
 * point at it; a feature folder would make two of those cross-feature imports.
 *
 * Every stub route is declared through `modulePlaceholderRoute()`, so shipping the real screen is
 * one route-entry swap and no menu-map change. Retire this component when the last stub is gone.
 */
@Component({
  selector: 'app-module-placeholder',
  imports: [StatusMessage, ButtonModule],
  template: `
    <!--
      Centred in what is left of the viewport under the app header, not pinned to the top of an
      otherwise empty page. A min-height rather than a fixed height, so the block still scrolls
      rather than clips on a short window. The message is the page's h1: the app header shows the
      title but is not a heading, so without this the page has no heading at all.
    -->
    <div class="flex min-h-[calc(100vh-4.6rem)] items-center justify-center px-5 py-8">
      <app-status-message
        [icon]="icon"
        [headingLevel]="1"
        [message]="pageTitle + ' is coming soon'"
        subMessage="Your access to it is already set up. The screen appears here once it ships."
      >
        <p-button
          type="button"
          [label]="back.label"
          icon="pi pi-arrow-left"
          size="small"
          severity="secondary"
          (onClick)="goBack()"
        />
      </app-status-message>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ModulePlaceholder {
  readonly #commonService = inject(Common);
  readonly #router = inject(Router);

  // A snapshot read, not the `data` observable: each stub is its own route config, so Angular
  // rebuilds the component on every navigation between them.
  readonly #data = inject(ActivatedRoute).snapshot.data as ModulePlaceholderData;

  /** A clock, not a wrench: "coming soon", not "under repair". */
  protected readonly icon = 'pi pi-clock';
  protected readonly pageTitle = this.#data.pageTitle;
  protected readonly back = this.#data.back;

  constructor() {
    // The app header owns the page title (`layout/app-header` renders `PageInfo` off this service),
    // so the page must not draw a heading bar of its own.
    this.#commonService.setPageHeaderInfo({
      pageTitle: this.pageTitle,
      pageDescription: '',
      pageIcon: this.icon,
      isBreadcrumbShow: false,
    });
    this.#commonService.resetBreadcrumbItems();
  }

  protected goBack(): void {
    void this.#router.navigateByUrl(this.back.url);
  }
}
