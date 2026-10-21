import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { AsideMenuStore } from '@core/stores';
import { IAsideMenuItem } from '@shared/interfaces';

@Component({
  selector: 'app-aside-menu-item',
  imports: [RouterLink, TooltipModule],
  templateUrl: './app-aside-menu-item.html',
  styleUrl: './app-aside-menu-item.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export default class AsideMenuItem {
  readonly #menuStore = inject(AsideMenuStore);

  readonly item = input.required<IAsideMenuItem>();
  readonly isCollapsed = input<boolean>(false);
  readonly level = input<number>(0);
  /** The one route the shell resolved as active - see `AppAsideMenu.activeRoute`. */
  readonly activeRoute = input<string>('');
  readonly siblingIds = input<string[]>([]);
  readonly navClick = output<Event>();

  readonly isParent = computed(() => (this.item().children?.length ?? 0) > 0);
  readonly childIds = computed(() =>
    (this.item().children ?? []).map((c) => c.id).filter((id): id is string => !!id),
  );
  readonly expanded = computed(
    () => this.#menuStore.hasSearch() || this.#menuStore.isExpanded(this.item().id),
  );
  readonly panelId = computed(() => `aside-submenu-${this.item().id}`);

  /** Exactly one leaf is active, so a leaf stays lit on its own child pages without its parent
   * route (`staffMembers` under `staffMembers/password-management`) lighting up as well. */
  readonly isActive = computed(() => {
    const route = this.item().route;
    return !!route && route === this.activeRoute();
  });

  protected readonly baseClass =
    'menu-link flex items-center w-full rounded-lg font-medium text-gray-500 dark:text-zinc-300 px-4 py-2.5 transition-colors hover:cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 dark:hover:text-white';

  protected readonly activeClass =
    'text-white dark:text-primary-200! bg-primary dark:bg-primary-900/30 hover:bg-primary dark:hover:bg-primary-900/50!';

  /** `baseClass`, plus the active styling when this leaf owns the url. One string, not an array:
   * an array binding takes each entry as a single class name and never splits on spaces. */
  protected readonly linkClass = computed(() =>
    this.isActive() ? `${this.baseClass} ${this.activeClass}` : this.baseClass,
  );

  /** Indentation for nested levels (no indent at root). */
  readonly indentStyle = computed(() => {
    const level = this.level();
    return level > 0 ? `${0.75 + level * 0.75}rem` : '';
  });

  onNavClick(event: Event) {
    event.stopPropagation();
    this.navClick.emit(event);
  }

  toggle(event: Event) {
    event.stopPropagation();
    this.#menuStore.toggleExpand(this.item().id, this.siblingIds());
  }
}
