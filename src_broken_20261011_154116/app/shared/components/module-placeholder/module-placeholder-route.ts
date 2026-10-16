import { Route } from '@angular/router';

import { environment } from '@env/environment';

import type { ModulePlaceholderBack } from './module-placeholder';

/**
 * A route for a module that is granted and menu-mapped but has no screen yet.
 *
 * The factory exists so a stub names itself once. Written out by hand, each one repeats its label
 * in `title` and again in `data`, and adding a stub means keeping three strings in step; the icon
 * is not a parameter at all, so the menu map stays the only place a module's glyph is chosen.
 * `back` is where the page's one action leads, so the stub is never a dead end.
 *
 * Swapping in the real screen is replacing one call with a normal route entry.
 */
export function modulePlaceholderRoute(
  path: string,
  pageTitle: string,
  back: ModulePlaceholderBack,
): Route {
  return {
    path,
    loadComponent: () => import('./module-placeholder'),
    title: `${pageTitle} | ${environment.appName}`,
    data: { pageTitle, back },
  };
}
