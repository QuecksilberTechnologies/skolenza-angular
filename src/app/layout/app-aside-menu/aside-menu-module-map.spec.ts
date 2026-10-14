import { FEATURES_ROUTES } from '../../features/features.routes';
import { ASIDE_MENU_MODULE_UI } from './aside-menu-module-map';
import { ASIDE_MENU_UNMAPPED_MODULES } from './aside-menu-unmapped-modules';

const entries = Object.entries(ASIDE_MENU_MODULE_UI);

/**
 * Renaming a route in `features.routes.ts` breaks the map with no compile error, so the first
 * segment of every mapped route is checked against the real route table here.
 */
const topLevelPaths = new Set(FEATURES_ROUTES.map((r) => r.path).filter((p): p is string => !!p));

describe('ASIDE_MENU_MODULE_UI', () => {
  it('points every route at a real feature route', () => {
    const unknown = entries
      .filter(([, ui]) => ui.route)
      .map(([code, ui]) => [code, ui.route!, ui.route!.split('/')[0]] as const)
      .filter(([, route, segment]) => !topLevelPaths.has(route) && !topLevelPaths.has(segment));

    expect(unknown).toEqual([]);
  });

  it('stores routes relative to the /app shell', () => {
    const absolute = entries.filter(([, ui]) => ui.route?.startsWith('/') || ui.route === '');

    expect(absolute).toEqual([]);
  });

  it('uses PrimeIcons classes', () => {
    const bad = entries.filter(([, ui]) => !/^pi pi-[a-z0-9-]+$/.test(ui.icon));

    expect(bad).toEqual([]);
  });

  // Without this, a code could be listed as "deliberately not a sidebar leaf" and mapped as one at
  // the same time, and the registry would read as documentation of something untrue.
  it('maps no module the unmapped registry claims', () => {
    const both = Object.keys(ASIDE_MENU_UNMAPPED_MODULES).filter(
      (code) => code in ASIDE_MENU_MODULE_UI,
    );

    expect(both).toEqual([]);
  });

  it('never maps two modules to the same route, except a documented host/institution pair', () => {
    // `INSTITUTION_CAMPUSES` and `HOST_CAMPUS_LIST` point at the same `campuses`
    // route on purpose: one session only ever carries one of the two codes, never both, and
    // `my-menu` scopes the operations each grants differently (see the map's own comment).
    const sharedRoutePairs = new Set(['INSTITUTION_CAMPUSES', 'HOST_CAMPUS_LIST']);
    const routes = entries
      .filter(([code]) => !sharedRoutePairs.has(code))
      .map(([, ui]) => ui.route)
      .filter(Boolean);

    expect(new Set(routes).size).toBe(routes.length);
  });
});
