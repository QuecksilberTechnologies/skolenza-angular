import { describe, expect, it } from 'vitest';

import { FeaturePageNode, FeaturePageOperation } from '@shared/interfaces';

import {
  buildFeaturePageIndex,
  canPerformIn,
  canPerformOrUnknownIn,
  displayNameFrom,
  identifiersFrom,
  isKnownModuleIn,
  resolveModuleCodeIn,
} from './feature-page-identifiers';

function operation(overrides: Partial<FeaturePageOperation>): FeaturePageOperation {
  return {
    id: 4,
    name: 'View',
    iconKey: null,
    ...overrides,
  };
}

function node(overrides: Partial<FeaturePageNode>): FeaturePageNode {
  return {
    id: 0,
    moduleCode: '',
    moduleName: '',
    pageName: '',
    displayName: '',
    urlPath: null,
    iconKey: null,
    parentModuleId: null,
    isLeafNode: true,
    moduleScope: 1,
    children: [],
    operations: [],
    ...overrides,
  };
}

/** Trimmed from the live `GET /Navigation/my-menu` payload. */
const CATALOG: FeaturePageNode[] = [
  node({
    id: 2,
    moduleCode: 'STAFF_MGMT',
    moduleName: 'Staff Management',
    isLeafNode: false,
    children: [
      node({
        id: 10,
        moduleCode: 'STAFF_BANK_DETAILS',
        moduleName: 'Staff Bank Details',
        operations: [
          operation({ id: 4, name: 'View' }),
          operation({ id: 1, name: 'Add' }),
          operation({ id: 18, name: 'Allow Editing' }),
        ],
      }),
      node({
        id: 19,
        moduleCode: 'STAFF_DEVICE_ENROLMENTS',
        moduleName: 'Staff Devices',
        operations: [operation({ id: 4, name: 'View' }), operation({ id: 11, name: 'Assign' })],
      }),
    ],
  }),
];

describe('buildFeaturePageIndex', () => {
  it('resolves a leaf page to its own id and its operation id', () => {
    const index = buildFeaturePageIndex(CATALOG);

    expect(identifiersFrom(index, 'STAFF_BANK_DETAILS', 'View')).toEqual({ ModuleId: 10, OperationId: 4 });
  });

  it('takes the first of several candidate codes that this tree publishes', () => {
    const index = buildFeaturePageIndex(CATALOG);

    // One endpoint, published under a different code per session: only the code this session's
    // own tree carries may resolve.
    expect(identifiersFrom(index, ['EMP_NOT_PUBLISHED', 'STAFF_DEVICE_ENROLMENTS'], 'Assign')).toEqual({
      ModuleId: 19,
      OperationId: 11,
    });
    expect(resolveModuleCodeIn(index, ['EMP_NOT_PUBLISHED', 'STAFF_DEVICE_ENROLMENTS'])).toBe('STAFF_DEVICE_ENROLMENTS');
  });

  it('prefers the candidate that publishes the operation when the tree carries both', () => {
    // The pair is meant to be mutually exclusive per session, but the menu map records that as
    // unverified. Resolving on presence alone would take `STAFF_BANK_DETAILS`, whose leaf has no `Assign`,
    // and send the request with a `ModuleId` and no `OperationId` — a bare-request 400.
    const index = buildFeaturePageIndex(CATALOG);

    expect(identifiersFrom(index, ['STAFF_BANK_DETAILS', 'STAFF_DEVICE_ENROLMENTS'], 'Assign')).toEqual({
      ModuleId: 19,
      OperationId: 11,
    });
    expect(resolveModuleCodeIn(index, ['STAFF_BANK_DETAILS', 'STAFF_DEVICE_ENROLMENTS'], 'Assign')).toBe('STAFF_DEVICE_ENROLMENTS');
  });

  it('falls back to the published candidate when neither publishes the operation', () => {
    const index = buildFeaturePageIndex(CATALOG);

    // `ModuleId` is still the honest answer; the interceptor warns and sends it without the
    // operation rather than dropping both.
    expect(identifiersFrom(index, ['STAFF_BANK_DETAILS', 'STAFF_DEVICE_ENROLMENTS'], 'Restore')).toEqual({
      ModuleId: 10,
      OperationId: undefined,
    });
  });

  it('reports the first candidate when the tree publishes none of them', () => {
    const index = buildFeaturePageIndex(CATALOG);

    expect(identifiersFrom(index, ['EMP_NOT_PUBLISHED', 'ALSO_MISSING'], 'View')).toEqual({
      ModuleId: undefined,
      OperationId: undefined,
    });
    expect(resolveModuleCodeIn(index, ['EMP_NOT_PUBLISHED', 'ALSO_MISSING'])).toBe(
      'EMP_NOT_PUBLISHED',
    );
  });

  it('matches the module code and the operation name case-insensitively', () => {
    const index = buildFeaturePageIndex(CATALOG);

    expect(identifiersFrom(index, 'staff_bank_details', 'add')).toEqual({
      ModuleId: 10,
      OperationId: 1,
    });
  });

  it('matches an operation name whose spelling carries inner whitespace', () => {
    const index = buildFeaturePageIndex(CATALOG);

    expect(identifiersFrom(index, 'STAFF_BANK_DETAILS', '  allow   editing ').OperationId).toBe(18);
  });

  it('indexes a module node, which has an id but no operations', () => {
    const index = buildFeaturePageIndex(CATALOG);

    expect(identifiersFrom(index, 'STAFF_MGMT', 'View')).toEqual({
      ModuleId: 2,
      OperationId: undefined,
    });
  });

  it('walks nested children to any depth', () => {
    const index = buildFeaturePageIndex([
      node({
        id: 1,
        moduleCode: 'COMMON_MENU',
        isLeafNode: false,
        children: [
          node({
            id: 6,
            moduleCode: 'COMMON_PROFILE',
            isLeafNode: false,
            children: [
              node({
                id: 38,
                moduleCode: 'COMMON_MY_PROFILE',
                operations: [operation({ id: 4 })],
              }),
            ],
          }),
        ],
      }),
    ]);

    expect(identifiersFrom(index, 'COMMON_MY_PROFILE', 'View')).toEqual({
      ModuleId: 38,
      OperationId: 4,
    });
  });

  it('unions the operations of a leaf reached through two headers', () => {
    const leafUnder = (operations: FeaturePageOperation[]) =>
      node({
        id: 3,
        moduleCode: 'HEADER',
        isLeafNode: false,
        children: [node({ id: 10, moduleCode: 'STAFF_BANK_DETAILS', operations })],
      });

    const index = buildFeaturePageIndex([
      leafUnder([operation({ id: 4, name: 'View' })]),
      leafUnder([operation({ id: 3, name: 'Delete' })]),
    ]);

    expect(identifiersFrom(index, 'STAFF_BANK_DETAILS', 'View').OperationId).toBe(4);
    expect(identifiersFrom(index, 'STAFF_BANK_DETAILS', 'Delete').OperationId).toBe(3);
  });

  it('resolves neither id for an unknown module code', () => {
    const index = buildFeaturePageIndex(CATALOG);

    expect(identifiersFrom(index, 'EMP_NOWHERE', 'View')).toEqual({
      ModuleId: undefined,
      OperationId: undefined,
    });
  });

  it('resolves the module but not the operation when the page does not publish it', () => {
    const index = buildFeaturePageIndex(CATALOG);

    expect(identifiersFrom(index, 'STAFF_DEVICE_ENROLMENTS', 'Update')).toEqual({
      ModuleId: 19,
      OperationId: undefined,
    });
  });

  it('skips a node with no module code, and handles an empty catalog', () => {
    expect(buildFeaturePageIndex([]).size).toBe(0);
    expect(buildFeaturePageIndex([node({ id: 1, moduleCode: '' })]).size).toBe(0);
  });
});

describe('permission predicates', () => {
  const index = buildFeaturePageIndex(CATALOG);

  it('grants an operation the leaf publishes', () => {
    expect(canPerformIn(index, 'STAFF_BANK_DETAILS', 'Add')).toBe(true);
  });

  it('denies an operation the leaf does not publish', () => {
    expect(canPerformIn(index, 'STAFF_DEVICE_ENROLMENTS', 'Update')).toBe(false);
  });

  it('matches case and inner whitespace the way the id lookup does', () => {
    expect(canPerformIn(index, 'staff_bank_details', '  allow   editing ')).toBe(true);
  });

  it('denies everything for a module the tree does not publish', () => {
    expect(isKnownModuleIn(index, 'EMP_NOWHERE')).toBe(false);
    expect(canPerformIn(index, 'EMP_NOWHERE', 'View')).toBe(false);
  });

  it('soft gate keeps an unpublished module visible', () => {
    expect(canPerformOrUnknownIn(index, 'EMP_NOWHERE', 'View')).toBe(true);
  });

  it('soft gate still denies a published module that withholds the operation', () => {
    expect(canPerformOrUnknownIn(index, 'STAFF_DEVICE_ENROLMENTS', 'Update')).toBe(false);
  });

  it('soft gate keeps every screen visible against an empty tree', () => {
    const empty = buildFeaturePageIndex([]);

    expect(canPerformOrUnknownIn(empty, 'STAFF_DIRECTORY', 'Delete')).toBe(true);
  });
});

describe('displayNameFrom', () => {
  it("returns the node's displayName when the backend sends one", () => {
    const index = buildFeaturePageIndex([
      node({
        id: 30,
        moduleCode: 'HOST_INSTITUTION_LIST',
        moduleName: 'Institution',
        displayName: 'Institution List',
      }),
    ]);

    expect(displayNameFrom(index, 'HOST_INSTITUTION_LIST')).toBe('Institution List');
  });

  it('falls back to moduleName when displayName is empty, same as the sidebar', () => {
    const index = buildFeaturePageIndex(CATALOG);

    expect(displayNameFrom(index, 'STAFF_BANK_DETAILS')).toBe('Staff Bank Details');
  });

  it('returns undefined for a module the tree does not publish', () => {
    const index = buildFeaturePageIndex(CATALOG);

    expect(displayNameFrom(index, 'EMP_NOWHERE')).toBeUndefined();
  });
});


