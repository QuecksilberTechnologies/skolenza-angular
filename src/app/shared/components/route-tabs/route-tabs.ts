import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  linkedSignal,
  signal,
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
 * Content marked `toolbar` (filters, the Add button) sits beside the tabs (below them under `lg`);
 * the rest renders in the tab panel. Wrap toolbar content in `<div toolbar class="contents">`:
 * when everything inside is conditional and none of it renders, the toolbar row is hidden, which
 * only works if the wrapper uses `display: contents`.
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
      <!-- Below lg the toolbar drops under the strip, so the tabs keep the full width. -->
      <div
        class="flex flex-wrap items-end gap-x-2 gap-y-3 lg:border-b lg:border-zinc-200 lg:dark:border-zinc-800"
      >
        <p-tablist
          class="w-full min-w-0 lg:w-auto lg:flex-1"
          [pt]="{ tabList: { 'aria-label': ariaLabel(), class: 'lg:border-b-0!' } }"
        >
          @for (tab of tabs(); track tab.id) {
            <p-tab [value]="tab.id">{{ tab.label }}</p-tab>
          }
        </p-tablist>
        <!-- Hidden when the projected toolbar holds nothing but display:contents wrappers. -->
        <div
          class="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:pb-2 [&:not(:has(:not(.contents)))]:hidden"
        >
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
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
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

  /** Strip width, so a rotation or resize that clips the selected tab scrolls it back. */
  readonly #stripWidth = signal(0);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const strip = this.#strip();
      if (!strip) return;
      const observer = new ResizeObserver(([entry]) =>
        this.#stripWidth.set(entry.contentRect.width),
      );
      observer.observe(strip);
      destroyRef.onDestroy(() => observer.disconnect());
    });
    // A narrow strip scrolls. `p-tabs` brings a clicked tab into view itself; this covers the
    // first load, route changes, tab-list changes and resizes.
    afterRenderEffect(() => {
      this.tabs();
      this.selected();
      this.#stripWidth();
      this.#revealSelected();
    });
  }

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

  /** `p-tabs` exposes no scroll API, so this reads its scroll viewport by class. */
  #strip(): HTMLElement | null {
    return this.#host.nativeElement.querySelector<HTMLElement>('.p-tablist-content');
  }

  /** Moves only the strip: `scrollIntoView` would also scroll the page and the shell. */
  #revealSelected(): void {
    const strip = this.#strip();
    const tab = strip?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    if (!strip || !tab) return;
    const tabBox = tab.getBoundingClientRect();
    const stripBox = strip.getBoundingClientRect();
    if (tabBox.left < stripBox.left) strip.scrollLeft -= stripBox.left - tabBox.left;
    else if (tabBox.right > stripBox.right) strip.scrollLeft += tabBox.right - stripBox.right;
  }

  #reset(): void {
    // Write `p-tabs` directly: a failure can land before change detection has pushed the
    // clicked value, so resetting `activeTab` alone would leave the binding with nothing to send.
    // The write flows back into `activeTab` through the two-way binding.
    this.tabsComponent().value.set(this.selected());
  }
}
