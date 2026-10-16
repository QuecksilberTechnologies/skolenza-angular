import { BreakpointObserver } from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  OnInit,
  output,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { IconFieldModule } from '@openng/optimus-ui/iconfield';
import { InputIconModule } from '@openng/optimus-ui/inputicon';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { filter, map } from 'rxjs';

import { APP_SETTINGS } from '@core/app-settings';
import { AuthApi } from '@core/services/auth-api';
import { Common } from '@core/services/common';
import { AsideMenuStore, FeaturePageStore } from '@core/stores';
import {
  FeaturePageNode,
  HOST_MODULE_SCOPE,
  IAsideMenuItem,
  IAsideMenuSection,
  LoginInfo,
  INSTITUTION_MODULE_SCOPE,
} from '@shared/interfaces';
import { resolveRoleTypeId } from '@shared/utilities/login-info';

import AsideMenuItem from './app-aside-menu-item/app-aside-menu-item';
import AsideMenuLoader from './aside-menu-loader/aside-menu-loader';
import { ASIDE_MENU_MODULE_UI, COMMON_MENU_MODULE_CODE } from './aside-menu-module-map';

@Component({
  selector: 'app-aside-menu',
  imports: [AsideMenuItem, AsideMenuLoader, IconFieldModule, InputIconModule, InputTextModule],
  templateUrl: './app-aside-menu.html',
  styleUrl: './app-aside-menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AppAsideMenu implements OnInit {
  readonly #authApi = inject(AuthApi);
  readonly #commonService = inject(Common);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #menuStore = inject(AsideMenuStore);
  readonly #router = inject(Router);
  readonly #breakpointObserver = inject(BreakpointObserver);
  readonly settings = inject(APP_SETTINGS);

  readonly isLeftmenuCollapsed = input<boolean>(false);
  readonly navClick = output();

  readonly collapsed = computed(() => !!this.isLeftmenuCollapsed());
  readonly searchTerm = this.#menuStore.searchTerm;

  /** Tells an empty search result apart from an empty menu — only the second offers a retry. */
  readonly hasSearch = this.#menuStore.hasSearch;

  /** Desktop viewport (≥1024px). Drives icon-only mode vs mobile drawer. */
  readonly isDesktop = toSignal(
    this.#breakpointObserver.observe('(min-width: 1024px)').pipe(map((r) => r.matches)),
    { initialValue: true },
  );

  /** True only when the desktop sidebar is collapsed to icons. */
  readonly iconOnly = computed(() => this.collapsed() && this.isDesktop());

  readonly #currentUrl = toSignal(
    this.#router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.#router.url),
    ),
    { initialValue: this.#router.url },
  );

  /**
   * A tree is in hand — cache-hydrated or fetched. Everything before it is still loading.
   *
   * Deliberately not `showSkeleton`: that is `isLoading() && !isLoaded()`, which is false both
   * before the first request is scheduled and after a load that returned nothing, so the template
   * could not tell "not asked yet" from "asked and empty" and painted the empty state at boot.
   */
  readonly menuLoaded = this.#featurePageStore.isLoaded;

  /** True for a refresh over an already-painted tree, which is what the retry control runs. */
  readonly menuRefreshing = this.#featurePageStore.isLoading;

  /** Cold failure only — a failed refresh over a warm cache stays silent. */
  readonly menuError = this.#featurePageStore.hasError;
  readonly menuErrorMessage = this.#featurePageStore.errorMessage;

  /** The menu tree the API scoped for this session, unmapped codes and empties dropped. */
  readonly sections = computed<IAsideMenuSection[]>(() => {
    const nodes = this.#featurePageStore.nodes();
    if (!nodes.length) return [];
    // The API already scopes `my-menu` to the session; this filter is the belt to that braces, and
    // the one line to revisit if a host payload ever arrives carrying both scopes.
    // roleTypeId 0 is Host; Admin, StaffMember and Manager all read the institution scope.
    const scope = this.#authApi.authRoleType() === 0 ? HOST_MODULE_SCOPE : INSTITUTION_MODULE_SCOPE;
    const roots = nodes.filter(
      (n) => n.moduleScope === scope && n.moduleCode !== COMMON_MENU_MODULE_CODE,
    );
    const items = this.#toItems(roots);
    return items.length ? [{ label: 'Management', items }] : [];
  });

  /**
   * The one menu route that owns the current url, or `''`.
   *
   * A leaf must stay lit on its own child pages (`my-devices` while the url is
   * `my-devices/:institutionDeviceId/device-settings`), which rules out `routerLinkActive` with
   * `exact: true`. Plain prefix matching is no good either: it would light `staffMembers` alongside
   * `staffMembers/password-management`. So the longest route that is a segment-prefix of the url wins,
   * and only that one leaf reads as active.
   *
   * Read off `sections()` rather than `visibleSections()` so a search term never moves the
   * highlight.
   */
  readonly activeRoute = computed<string>(() => {
    const url = this.#currentUrl().split(/[?#]/)[0];
    let best = '';
    const walk = (items: IAsideMenuItem[]) => {
      for (const item of items) {
        const path = item.route ? `/app/${item.route}` : '';
        if (
          path &&
          (url === path || url.startsWith(`${path}/`)) &&
          item.route!.length > best.length
        ) {
          best = item.route!;
        }
        if (item.children?.length) walk(item.children);
      }
    };
    this.sections().forEach((s) => walk(s.items));
    return best;
  });

  /** Sections after search filtering. */
  readonly visibleSections = computed<IAsideMenuSection[]>(() => {
    const term = this.#menuStore.normalizedSearch();
    const sections = this.sections();
    if (!term) return sections;
    return sections
      .map((s) => ({ ...s, items: this.#filterBySearch(s.items, term) }))
      .filter((s) => s.items.length > 0);
  });

  constructor() {
    // Auto-expand ancestors of the active route.
    effect(() => {
      const url = this.#currentUrl();
      const ids = this.#findActiveAncestorIds(this.sections(), url);
      // `expandPath` reads `expandedIds`, so an untracked write keeps this effect
      // depending on the url alone — otherwise collapsing a parent re-runs it and reopens.
      if (ids.length) untracked(() => this.#menuStore.expandPath(ids));
    });
  }

  async ngOnInit() {
    const loginInfo: LoginInfo = await this.#commonService.getLoginInfo();
    const roleTypeId = resolveRoleTypeId(loginInfo);
    if (roleTypeId != null) {
      this.#authApi.setAuthRoleType(roleTypeId);
    }
    // Paints from the cache if there is one, and revalidates behind it either way.
    void this.#featurePageStore.ensureLoaded();
  }

  onSearch(value: string) {
    this.#menuStore.setSearch(value);
  }

  onNavClick(e: Event) {
    e.stopPropagation();
    this.navClick.emit();
  }

  retryMenu() {
    void this.#featurePageStore.refresh();
  }

  siblingIds(items: IAsideMenuItem[]): string[] {
    return items.map((i) => i.id).filter((id): id is string => !!id);
  }

  /**
   * Menu nodes → menu items.
   *
   * No permission filter: `my-menu` returns only what the session may see, so gating again could
   * only subtract from what the API granted.
   *
   * Routes and icons come from `ASIDE_MENU_MODULE_UI`, never from the node: the API's `urlPath`
   * does not match this app's routes and its `iconKey` is a Bootstrap Icons class (`bi bi-*`),
   * which this app does not load.
   */
  #toItems(nodes: FeaturePageNode[]): IAsideMenuItem[] {
    return (
      nodes
        .map((n) => this.#toItem(n))
        .filter((i): i is IAsideMenuItem => i !== null)
        // Module nodes carry no ordering field, so sort by label for a stable sidebar.
        .sort((a, b) => (a.label ?? '').localeCompare(b.label ?? ''))
    );
  }

  /**
   * One node → its menu item, or `null` when neither it nor any descendant maps to a route.
   *
   * A routeless grouping header with exactly one mapped child collapses onto that child directly
   * instead of rendering a one-item nested submenu: the child's own id/route/icon carry through
   * unchanged, so navigation, active-route matching, and any downstream module/operation
   * resolution (which re-derives its own index off the raw node tree, not this one) all still
   * resolve against the real leaf rather than the header.
   *
   * The collapsed row keeps the child's label, which reads right for most one-child groups
   * (`INSTITUTION_DEPARTMENT` -> "Departments" beats the header's "Institution Department"). Where it does
   * not - a child named for its place inside the group rather than for the sidebar, like
   * `INSTITUTION_DASHBOARD` -> "Overview" - the map names a `label` for that code.
   */
  #toItem(n: FeaturePageNode): IAsideMenuItem | null {
    const ui = ASIDE_MENU_MODULE_UI[n.moduleCode];
    const children = this.#toItems(n.children ?? []);
    const label = ui?.label ?? (n.displayName || n.moduleName);

    if (!ui?.route && children.length === 0) return null;
    if (!ui?.route && children.length === 1) return children[0];

    // A parent renders as a toggle, not a link, so a node that is a page *and* has mapped children
    // (`INSTITUTION_EMAIL_CONFIG` -> `INSTITUTION_EMAIL_TEMPLATE`) would lose its own page. It becomes a group
    // instead, with that page as its first entry. The group takes a derived id so the page keeps
    // the node's own.
    if (ui?.route && children.length) {
      const self: IAsideMenuItem = {
        id: n.moduleCode,
        label,
        icon: ui.icon,
        route: ui.route,
        tooltip: label,
      };
      return {
        id: `${n.moduleCode}_GROUP`,
        label,
        icon: ui.icon,
        tooltip: label,
        children: [self, ...children],
      };
    }

    return {
      id: n.moduleCode,
      label,
      icon: ui?.icon,
      route: ui?.route,
      tooltip: label,
      children: children.length ? children : undefined,
    };
  }

  #filterBySearch(items: IAsideMenuItem[], term: string): IAsideMenuItem[] {
    const result: IAsideMenuItem[] = [];
    for (const item of items) {
      const selfMatch = (item.label ?? '').toLowerCase().includes(term);
      if (item.children?.length) {
        const kids = this.#filterBySearch(item.children, term);
        if (selfMatch || kids.length) {
          result.push({ ...item, children: selfMatch ? item.children : kids });
        }
      } else if (selfMatch) {
        result.push(item);
      }
    }
    return result;
  }

  #findActiveAncestorIds(sections: IAsideMenuSection[], url: string): string[] {
    const matched: string[] = [];
    const walk = (items: IAsideMenuItem[], ancestors: string[]) => {
      for (const item of items) {
        // Menu routes are relative to the `/app` shell; the router url is not.
        const path = item.route ? `/app/${item.route}` : '';
        if (path && url.startsWith(path)) matched.push(...ancestors);
        if (item.children?.length) {
          walk(item.children, item.id ? [...ancestors, item.id] : ancestors);
        }
      }
    };
    sections.forEach((s) => walk(s.items, []));
    return [...new Set(matched)];
  }
}

