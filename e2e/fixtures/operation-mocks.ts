import type { Page, Route } from '@playwright/test';

/**
 * Network mocks for `/OperationsMaster/*` and `/ModuleOperation/*`. Swagger documents no response
 * schema for either controller, so these shapes mirror the request DTOs plus the standard envelope
 * every other controller returns.
 */

export interface OperationMock {
  id: number;
  operationName: string;
  operationType: number;
  remark: string | null;
  iconImage: string | null;
  isActive: boolean;
}

export interface ModuleOperationMock {
  id: number;
  moduleOperationMappingId: number | null;
  moduleId: number;
  moduleName: string | null;
  operationId: number;
  operationName: string | null;
  dataViewStructureId: number | null;
  pageTypeId: number | null;
  pageURL: string | null;
  iconURL: string | null;
  isCommonItem: boolean;
  isOperational: boolean;
  priority: number | null;
  remark: string | null;
  isActive: boolean;
}

export function defaultOperations(): OperationMock[] {
  return [
    {
      id: 1,
      operationName: 'Add',
      operationType: 1,
      remark: 'Create records',
      iconImage: 'pi pi-plus-circle',
      isActive: true,
    },
    {
      id: 2,
      operationName: 'Approve',
      operationType: 2,
      remark: 'Approve submitted requests',
      iconImage: null,
      isActive: true,
    },
    {
      id: 3,
      operationName: 'Retire',
      operationType: 4,
      remark: 'Legacy action',
      iconImage: null,
      isActive: false,
    },
  ];
}

export function defaultModuleOperations(): ModuleOperationMock[] {
  return [
    {
      id: 101,
      moduleOperationMappingId: 501,
      moduleId: 27,
      moduleName: 'Asset management',
      operationId: 1,
      operationName: 'Add',
      dataViewStructureId: null,
      pageTypeId: null,
      pageURL: '/app/assets',
      iconURL: null,
      isCommonItem: false,
      isOperational: true,
      priority: 1,
      remark: 'Add button on the asset list',
      isActive: true,
    },
    {
      id: 102,
      moduleOperationMappingId: null,
      moduleId: 6,
      moduleName: 'Profile',
      operationId: 2,
      operationName: 'Approve',
      dataViewStructureId: null,
      pageTypeId: null,
      pageURL: null,
      iconURL: null,
      isCommonItem: true,
      isOperational: false,
      priority: null,
      remark: null,
      isActive: false,
    },
  ];
}

function ok(data: unknown, message = 'Retrieved successfully.') {
  return { isSucceeded: true, message, errors: [], data };
}

/** Records every intercepted request so tests can assert bodies and deleted ids. */
export interface OperationCalls {
  operationList: number;
  moduleOperationList: number;
  writes: { method: string; url: string; body: unknown }[];
  deletes: string[];
}

interface OperationMockOptions {
  operations?: OperationMock[];
  moduleOperations?: ModuleOperationMock[];
  /** Fails the DELETE so the "row stays put" path can be asserted. */
  deleteSucceeds?: boolean;
}

/**
 * Installs the operation route handlers. Call after `mockAuth` so these take precedence over its
 * catch-all (Playwright matches the most recent route first).
 */
export async function mockOperations(
  page: Page,
  options: OperationMockOptions = {},
): Promise<OperationCalls> {
  const {
    operations = defaultOperations(),
    moduleOperations = defaultModuleOperations(),
    deleteSucceeds = true,
  } = options;

  const calls: OperationCalls = {
    operationList: 0,
    moduleOperationList: 0,
    writes: [],
    deletes: [],
  };

  const deleteResponse = () => ({
    isSucceeded: deleteSucceeds,
    message: deleteSucceeds ? 'Deleted successfully.' : 'Could not delete.',
    errors: [],
    data: null,
  });

  const recordWrite = (route: Route) => {
    const request = route.request();
    calls.writes.push({
      method: request.method(),
      url: new URL(request.url()).pathname,
      body: request.postDataJSON(),
    });
    return route.fulfill({
      json: { isSucceeded: true, message: 'Saved successfully.', errors: [], data: null },
    });
  };

  await page.route('**/OperationsMaster/get-all-operations', (route: Route) => {
    calls.operationList += 1;
    return route.fulfill({ json: ok(operations, 'Operations retrieved.') });
  });

  await page.route('**/OperationsMaster/get-operation/*', (route: Route) => {
    const id = Number(new URL(route.request().url()).pathname.split('/').pop());
    return route.fulfill({ json: ok(operations.find((row) => row.id === id) ?? null) });
  });

  await page.route('**/OperationsMaster/create-operation', recordWrite);
  await page.route('**/OperationsMaster/update-operation', recordWrite);

  await page.route('**/OperationsMaster/delete-operation/*', (route: Route) => {
    calls.deletes.push(new URL(route.request().url()).pathname);
    return route.fulfill({ json: deleteResponse() });
  });

  await page.route('**/ModuleOperation/get-all', (route: Route) => {
    calls.moduleOperationList += 1;
    return route.fulfill({ json: ok(moduleOperations, 'Module operations retrieved.') });
  });

  await page.route('**/ModuleOperation/get-by-id/*', (route: Route) => {
    const id = Number(new URL(route.request().url()).pathname.split('/').pop());
    return route.fulfill({ json: ok(moduleOperations.find((row) => row.id === id) ?? null) });
  });

  await page.route('**/ModuleOperation/create', recordWrite);
  await page.route('**/ModuleOperation/update', recordWrite);

  await page.route('**/ModuleOperation/delete/*', (route: Route) => {
    calls.deletes.push(new URL(route.request().url()).pathname);
    return route.fulfill({ json: deleteResponse() });
  });

  return calls;
}
