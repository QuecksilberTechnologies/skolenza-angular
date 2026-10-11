import type { Page, Route } from '@playwright/test';

/**
 * Network mocks for `/ParentModule/*` and `/SubModule/*`. Shapes mirror the live
 * responses captured from the API — note the embedded `parentModule` on sub-module rows.
 */

export interface ModuleRowMock {
  id: number;
  moduleCode: string | null;
  moduleName: string;
  displayName: string;
  urlPath: string;
  parentModuleId: number | null;
  isLeafNode: boolean;
  isModuleDisplayInUI: boolean;
  isCommonMenu: boolean;
  moduleScope: number;
  isActive: boolean;
  imageIconWeb: string | null;
  imageIconMobile: string | null;
  itemPriority: number;
  remark: string | null;
  addedById: number;
  addedDateTime: string;
  updatedById: number | null;
  updatedDateTime: string | null;
  parentModule?: {
    id: number;
    moduleCode: string | null;
    moduleName: string;
    displayName: string;
    moduleScope: number;
    isActive: boolean;
  } | null;
}

export function buildModule(overrides: Partial<ModuleRowMock> = {}): ModuleRowMock {
  return {
    id: 27,
    moduleCode: 'A-M',
    moduleName: 'Asset-Management',
    displayName: 'Asset management',
    urlPath: 'asset-management',
    parentModuleId: null,
    isLeafNode: false,
    isModuleDisplayInUI: true,
    isCommonMenu: false,
    moduleScope: 1,
    isActive: true,
    imageIconWeb: null,
    imageIconMobile: null,
    itemPriority: 0,
    remark: 'Handles leave requests',
    addedById: 1,
    addedDateTime: '2025-06-16T21:56:55.473Z',
    updatedById: null,
    updatedDateTime: null,
    ...overrides,
  };
}

export function defaultParents(): ModuleRowMock[] {
  return [
    buildModule({ id: 27 }),
    // `moduleName` deliberately differs from `displayName` on every row so an exact cell
    // match stays unambiguous — the real API returns distinct values too.
    buildModule({
      id: 6,
      moduleCode: null,
      moduleName: 'User-Profile',
      displayName: 'Profile',
      urlPath: 'profile',
      moduleScope: 1,
      // Common menu, so the Common filter has a row to keep out of the shared scope-1 list.
      isCommonMenu: true,
      itemPriority: 3,
      remark: null,
    }),
    buildModule({
      id: 31,
      moduleCode: 'RPT',
      moduleName: 'Reporting-Analytics',
      displayName: 'Reporting',
      urlPath: 'reporting',
      moduleScope: 2,
      isActive: false,
      itemPriority: 9,
      remark: null,
    }),
  ];
}

export function defaultSubModules(): ModuleRowMock[] {
  const parentModule = {
    id: 6,
    moduleCode: null,
    moduleName: 'User-Profile',
    displayName: 'Profile',
    moduleScope: 1,
    isActive: true,
  };

  return [
    buildModule({
      id: 11,
      moduleCode: null,
      moduleName: 'Sign-Out',
      displayName: 'Sign out',
      urlPath: 'sign-out',
      parentModuleId: 6,
      isLeafNode: true,
      isCommonMenu: true,
      itemPriority: -1,
      remark: null,
      addedDateTime: '2025-06-16T22:16:25.11Z',
      parentModule,
    }),
    buildModule({
      id: 12,
      moduleCode: null,
      moduleName: 'My-Profile',
      displayName: 'My profile',
      urlPath: 'my-profile',
      parentModuleId: 6,
      isLeafNode: true,
      isCommonMenu: true,
      itemPriority: 1,
      remark: null,
      addedDateTime: '2025-06-16T22:16:25.11Z',
      parentModule,
    }),
    // A sub-header: not a leaf, so the popover offers a drill-down into its own children.
    buildModule({
      id: 13,
      moduleCode: null,
      moduleName: 'Profile-Settings',
      displayName: 'Profile settings',
      urlPath: 'profile-settings',
      parentModuleId: 6,
      isLeafNode: false,
      isCommonMenu: true,
      itemPriority: 2,
      remark: null,
      addedDateTime: '2025-06-16T22:16:25.11Z',
      parentModule,
    }),
    buildModule({
      id: 14,
      moduleCode: null,
      moduleName: 'Profile-Theme',
      displayName: 'Theme',
      urlPath: 'profile-theme',
      parentModuleId: 13,
      isLeafNode: true,
      isCommonMenu: true,
      itemPriority: 1,
      remark: null,
      addedDateTime: '2025-06-16T22:16:25.11Z',
      parentModule: {
        id: 13,
        moduleCode: null,
        moduleName: 'Profile-Settings',
        displayName: 'Profile settings',
        moduleScope: 1,
        isActive: true,
      },
    }),
    // `get-module-headers` never returns the inactive Host header, so the only way back to it is
    // this leaf's `parentModuleId`. Without it, `Reporting` would be unreachable.
    buildModule({
      id: 32,
      moduleCode: 'RPT-B',
      moduleName: 'Report-Builder',
      displayName: 'Report builder',
      urlPath: 'report-builder',
      parentModuleId: 31,
      isLeafNode: true,
      moduleScope: 2,
      itemPriority: 0,
      remark: null,
      parentModule: {
        id: 31,
        moduleCode: 'RPT',
        moduleName: 'Reporting-Analytics',
        displayName: 'Reporting',
        moduleScope: 2,
        isActive: false,
      },
    }),
  ];
}

/** A header can appear in both fixtures; the sub-module copy carries the parent link. */
function dedupeById(rows: ModuleRowMock[]): ModuleRowMock[] {
  const byId = new Map<number, ModuleRowMock>();
  for (const row of rows) {
    byId.set(row.id, { ...byId.get(row.id), ...row });
  }
  return [...byId.values()];
}

function ok(data: unknown, message = 'Modules retrieved successfully.') {
  return { isSucceeded: true, message, errors: [], data };
}

/** Records every intercepted request so tests can assert query params and bodies. */
export interface ModuleCalls {
  moduleHeaders: string[];
  subList: string[];
  status: { url: string; body: unknown }[];
  headerReads: number[];
  writes: { method: string; url: string; body: unknown }[];
}

interface ModuleMockOptions {
  parents?: ModuleRowMock[];
  subModules?: ModuleRowMock[];
  /** Fails the status PATCH so the rollback path can be asserted. */
  statusSucceeds?: boolean;
}

/**
 * Installs the module route handlers. Call after `mockAuth` so these take
 * precedence over its catch-all (Playwright matches the most recent route first).
 */
export async function mockModules(
  page: Page,
  options: ModuleMockOptions = {},
): Promise<ModuleCalls> {
  const {
    parents = defaultParents(),
    subModules = defaultSubModules(),
    statusSucceeds = true,
  } = options;

  const calls: ModuleCalls = {
    moduleHeaders: [],
    subList: [],
    status: [],
    headerReads: [],
    writes: [],
  };

  const filterByQuery = (rows: ModuleRowMock[], url: URL) => {
    const scope = url.searchParams.get('moduleScope');
    const isActive = url.searchParams.get('isActive');
    const parentId = url.searchParams.get('parentModuleId');

    return rows.filter(
      (row) =>
        (scope === null || row.moduleScope === Number(scope)) &&
        (isActive === null || row.isActive === (isActive === 'true')) &&
        (parentId === null || row.parentModuleId === Number(parentId)),
    );
  };

  /**
   * Mirrors the measured contract of `/ParentModule/get-module-headers`: a trimmed projection of
   * **active headers only**, with their non-leaf children nested and leaves left out entirely.
   * `IsActive=false` really does come back empty on the live API, so it does here too.
   */
  await page.route('**/ParentModule/get-module-headers*', (route: Route) => {
    const url = new URL(route.request().url());
    calls.moduleHeaders.push(url.search);

    const scope = url.searchParams.get('ModuleScope');
    const wantActive = url.searchParams.get('IsActive');
    const headers = dedupeById([...parents, ...subModules]).filter(
      (row) =>
        !row.isLeafNode &&
        row.isActive &&
        (scope === null || row.moduleScope === Number(scope)) &&
        (wantActive === null || wantActive === 'true'),
    );

    const project = (row: ModuleRowMock): unknown => ({
      id: row.id,
      moduleName: row.moduleName,
      displayName: row.displayName,
      subModuleUrl: row.urlPath,
      urlPath: row.urlPath,
      isLeafNode: row.isLeafNode,
      imageIconWeb: row.imageIconWeb,
      imageIconMobile: row.imageIconMobile,
      itemPriority: row.itemPriority,
      children: headers.filter((child) => child.parentModuleId === row.id).map(project),
    });

    const roots = headers.filter((row) => row.parentModuleId === null).map(project);
    return route.fulfill({ json: ok(roots, 'Module headers retrieved successfully.') });
  });

  await page.route('**/SubModule/list*', (route: Route) => {
    const url = new URL(route.request().url());
    calls.subList.push(url.search);
    return route.fulfill({ json: ok(filterByQuery(subModules, url), 'SubModules retrieved.') });
  });

  // `**/*/status` also matches the two controllers above, so it is registered last.
  await page.route('**/status', (route: Route) => {
    const request = route.request();
    if (request.method() !== 'PATCH') return route.fallback();

    calls.status.push({ url: new URL(request.url()).pathname, body: request.postDataJSON() });
    return route.fulfill({
      json: {
        isSucceeded: statusSucceeds,
        message: statusSucceeds ? 'Status updated successfully.' : 'Could not update status.',
        errors: [],
        data: null,
      },
    });
  });

  // Single-id reads feed the edit dialog; add/update record the outgoing payload.
  const recordWrite = (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === 'GET') {
      const id = Number(url.pathname.split('/').pop());
      calls.headerReads.push(id);
      const row = dedupeById([...parents, ...subModules]).find((item) => item.id === id) ?? null;
      return route.fulfill({ json: ok(row, 'Module retrieved.') });
    }

    calls.writes.push({
      method: request.method(),
      url: url.pathname,
      body: request.postDataJSON(),
    });
    return route.fulfill({
      json: { isSucceeded: true, message: 'Module saved successfully.', errors: [], data: null },
    });
  };

  // The trailing group matters: reads carry `?moduleScope=…`, so an end-anchored
  // pattern would miss them and let the catch-all answer instead.
  await page.route(/\/api\/(Parent|Sub)Module\/(add|\d+)(\?.*)?$/, recordWrite);

  return calls;
}
