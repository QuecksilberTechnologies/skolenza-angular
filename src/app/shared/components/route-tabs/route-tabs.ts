import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  linkedSignal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Tabs, TabsModule } from '@openng/optimus-ui/tabs';

export interface RouteTab<T> {
  id: T;
  label: string;
  /** URL segment that replaces the current route's last segment, e.g. `staff-categories`. */
  route: string;
}

/**
 * Section tabs for workspace pages whose sections are sibling routes (`.../:tab`). Selecting a
 * tab navigates; the page reads the route and passes the resulting tab back as `selected`.
 * Content marked `toolbar` (filters, the Add button) sits beside the tabs; the rest renders in
 * the tab panel.
 */
@Component({
  selector: 'app-route-tabs',
  imports: [TabsModule],
  template: `
    <p-tabs
      class="space-y-5"
      [(value)]="activeTab"
      [scrollable]="true"
      (valueChange)="open($event)"
    >
      <div class="flex flex-wrap items-end gap-2 border-b border-zinc-200 dark:border-zinc-800">
        <p-tablist
          class="min-w-0 flex-1"
          [pt]="{ tabList: { 'aria-label': ariaLabel(), class: 'border-b-0!' } }"
        >
          @for (tab of tabs(); track tab.id) {
            <p-tab [value]="tab.id">{{ tab.label }}</p-tab>
          }
        </p-tablist>
        <div class="flex flex-wrap items-center gap-2 pb-2">
          <ng-content select="[toolbar]" />
        </div>
      </div>
      <p-tabpanels class="p-0!">
        <p-tabpanel
          [value]="activeTab()"
          class="block overflow-hidden rounded-card border border-zinc-200 dark:border-zinc-800"
        >
          <ng-content />
        </p-tabpanel>
        <!-- Hidden stand-ins so every tab's aria-controls resolves; only the active one has content. -->
        @for (tab of tabs(); track tab.id) {
          @if (tab.id !== activeTab()) {
            <p-tabpanel [value]="tab.id" />
          }
        }
      </p-tabpanels>
    </p-tabs>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteTabs<T extends string | number> {
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  private readonly tabsComponent = viewChild.required(Tabs);

  readonly tabs = input.required<readonly RouteTab<T>[]>();
  readonly selected = input.required<T>();
  /** Names the tab list, e.g. "Academic structure sections". */
  readonly ariaLabel = input.required<string>();

  /**
   * Two-way bound to `p-tabs`, which moves its value on click before the route changes. The
   * strip and panel follow the click at once; `selected` takes over when the route settles, or
   * straight away if navigation fails.
   */
  readonly activeTab = linkedSignal<string | number | undefined>(() => this.selected());

  open(value: string | number | undefined): void {
    const tab = this.tabs().find((item) => item.id === value);
    if (!tab) {
      this.#reset();
      return;
    }
    if (tab.id === this.selected()) return;
    void this.#router.navigate(['..', tab.route], { relativeTo: this.#route }).then(
      (navigated) => navigated || this.#reset(),
      () => this.#reset(),
    );
  }

  #reset(): void {
    // Write `p-tabs` directly: a failure can land before change detection has pushed the
    // clicked value, so resetting `activeTab` alone would leave the binding with nothing to send.
    // The write flows back into `activeTab` through the two-way binding.
    this.tabsComponent().value.set(this.selected());
  }
}
