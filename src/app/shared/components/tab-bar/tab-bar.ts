import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';

export interface TabBarItem<T> {
  id: T;
  label: string;
}

/**
 * Section switcher for workspace pages: one button per section, the current one filled and marked
 * `aria-current="page"`. Projected content (filters, the page's Add button) sits at the right.
 * The page decides what selecting a tab means, usually a route change.
 */
@Component({
  selector: 'app-tab-bar',
  imports: [ButtonModule],
  template: `
    <nav class="flex flex-wrap gap-2" [attr.aria-label]="ariaLabel()">
      @for (tab of tabs(); track tab.id) {
        <button
          pButton
          type="button"
          [outlined]="tab.id !== selected()"
          [attr.aria-current]="tab.id === selected() ? 'page' : null"
          (click)="tabChange.emit(tab.id)"
        >
          {{ tab.label }}
        </button>
      }
    </nav>
    <div class="ml-auto flex flex-wrap items-center gap-2">
      <ng-content />
    </div>
  `,
  host: {
    class: 'flex flex-wrap items-center gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabBar<T> {
  readonly tabs = input.required<readonly TabBarItem<T>[]>();
  readonly selected = input.required<T>();
  /** Names the navigation landmark, e.g. "Academic structure sections". */
  readonly ariaLabel = input.required<string>();
  readonly tabChange = output<T>();
}
