import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';

import type { PagedList } from '@shared/utilities/paged-list';

/** The part of a `pagedList` the footer reads and drives. */
export type LoadMoreList = Pick<
  PagedList<unknown>,
  'loading' | 'failed' | 'hasMore' | 'loadMore' | 'retry'
>;

/**
 * Footer of a server-paged list: "Load more" while pages remain, or the failure with a Retry
 * button once a request has failed. `what` names the rows in the copy, e.g. "lesson plans".
 */
@Component({
  selector: 'app-load-more',
  imports: [ButtonModule],
  template: `
    @if (list().failed()) {
      <div class="flex flex-wrap items-center justify-center gap-3 p-3">
        <span class="text-sm text-zinc-500 dark:text-zinc-400" role="status">
          Couldn't load the {{ what() }}.
        </span>
        <p-button
          label="Retry"
          icon="pi pi-refresh"
          [text]="true"
          [ariaLabel]="'Retry loading ' + what()"
          [loading]="list().loading()"
          (onClick)="list().retry()"
        />
      </div>
    } @else if (list().hasMore()) {
      <div class="flex justify-center p-3">
        <p-button
          label="Load more"
          icon="pi pi-angle-down"
          [text]="true"
          [ariaLabel]="'Load more ' + what()"
          [loading]="list().loading()"
          (onClick)="list().loadMore()"
        />
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadMore {
  readonly list = input.required<LoadMoreList>();
  readonly what = input.required<string>();
}
