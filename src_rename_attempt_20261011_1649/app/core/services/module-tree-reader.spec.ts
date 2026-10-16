import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ModuleRow, SubModuleRow } from '@shared/interfaces';

import { ModuleTreeReader } from './module-tree-reader';
import { ParentModuleApi } from './parent-module-api';
import { SubModuleApi } from './sub-module-api';

const envelope = (data: unknown) => ({ isSucceeded: true, message: '', errors: [], data });

function fullRow(id: number, overrides: Partial<ModuleRow> = {}): ModuleRow {
  return {
    id,
    moduleCode: null,
    moduleName: `M${id}`,
    displayName: `M${id}`,
    urlPath: '',
    parentModuleId: null,
    isLeafNode: false,
    isModuleDisplayInUI: true,
    isCommonMenu: false,
    moduleScope: 1,
    isActive: true,
    imageIconWeb: null,
    imageIconMobile: null,
    itemPriority: 0,
    remark: null,
    addedById: 1,
    addedDateTime: '2025-06-16T21:56:55.473Z',
    updatedById: null,
    updatedDateTime: null,
    ...overrides,
  };
}

function leaf(id: number, parentModuleId: number): SubModuleRow {
  return { ...fullRow(id, { parentModuleId, isLeafNode: true }), parentModule: null };
}

describe('ModuleTreeReader', () => {
  const parentModuleApiMock = { getModuleHeaders: vi.fn(), getParentModule: vi.fn() };
  const subModuleApiMock = { getSubModules: vi.fn() };

  /** `getParentModule` answers for any header id, active or not — that is what makes this work. */
  const catalogue = (rows: ModuleRow[]) =>
    parentModuleApiMock.getParentModule.mockImplementation((id: number) =>
      of(envelope(rows.find((row) => row.id === id) ?? null)),
    );

  const read = () => TestBed.inject(ModuleTreeReader).readScope(1);

  beforeEach(() => {
    vi.clearAllMocks();
    parentModuleApiMock.getModuleHeaders.mockReturnValue(of(envelope([])));
    subModuleApiMock.getSubModules.mockReturnValue(of(envelope([])));
    parentModuleApiMock.getParentModule.mockReturnValue(of(envelope(null)));

    TestBed.configureTestingModule({
      providers: [
        ModuleTreeReader,
        { provide: ParentModuleApi, useValue: parentModuleApiMock },
        { provide: SubModuleApi, useValue: subModuleApiMock },
      ],
    });
  });

  it('reads the active tree back in full, parents before their children', async () => {
    parentModuleApiMock.getModuleHeaders.mockReturnValue(
      of(
        envelope([
          { id: 7, children: [{ id: 8, children: [] }] },
          { id: 9, children: [] },
        ]),
      ),
    );
    catalogue([fullRow(7), fullRow(8, { parentModuleId: 7 }), fullRow(9)]);

    const tree = await new Promise<{ headers: ModuleRow[] }>((resolve) =>
      read().subscribe(resolve),
    );

    expect(tree.headers.map((row) => row.id)).toEqual([7, 8, 9]);
    // The trimmed projection has no scope or status, so every header is read back by id.
    expect(parentModuleApiMock.getParentModule).toHaveBeenCalledWith(8, 1);
    expect(tree.headers[1]).toEqual(expect.objectContaining({ moduleScope: 1, isActive: true }));
  });

  it('recovers an inactive header from its leaves and walks up to the root', async () => {
    // `get-module-headers` never lists 5 or 6 once they are inactive; only leaf 11 points at 6.
    parentModuleApiMock.getModuleHeaders.mockReturnValue(of(envelope([{ id: 9, children: [] }])));
    subModuleApiMock.getSubModules.mockReturnValue(of(envelope([leaf(11, 6)])));
    catalogue([
      fullRow(5, { isActive: false }),
      fullRow(6, { parentModuleId: 5, isActive: false }),
      fullRow(9),
    ]);

    const tree = await new Promise<{ headers: ModuleRow[]; leaves: SubModuleRow[] }>((resolve) =>
      read().subscribe(resolve),
    );

    expect(tree.headers.map((row) => row.id).sort()).toEqual([5, 6, 9]);
    // 5 is only reachable by following 6's parent — the leaves never name it.
    expect(parentModuleApiMock.getParentModule).toHaveBeenCalledWith(5, 1);
    expect(tree.headers.find((row) => row.id === 5)?.isActive).toBe(false);
    expect(tree.leaves.map((row) => row.id)).toEqual([11]);
  });

  it('keeps the other headers when one cannot be read back', async () => {
    parentModuleApiMock.getModuleHeaders.mockReturnValue(
      of(
        envelope([
          { id: 7, children: [] },
          { id: 9, children: [] },
        ]),
      ),
    );
    parentModuleApiMock.getParentModule.mockImplementation((id: number) =>
      id === 7 ? throwError(() => new Error('boom')) : of(envelope(fullRow(id))),
    );

    const tree = await new Promise<{ headers: ModuleRow[]; unreadHeaderIds: number[] }>((resolve) =>
      read().subscribe(resolve),
    );

    expect(tree.headers.map((row) => row.id)).toEqual([9]);
    // The caller has to be able to tell "could not read" from "does not exist".
    expect(tree.unreadHeaderIds).toEqual([7]);
  });

  it('stops rather than looping when the parent chain cycles', async () => {
    subModuleApiMock.getSubModules.mockReturnValue(of(envelope([leaf(11, 1)])));
    catalogue([fullRow(1, { parentModuleId: 2 }), fullRow(2, { parentModuleId: 1 })]);

    const tree = await new Promise<{ headers: ModuleRow[] }>((resolve) =>
      read().subscribe(resolve),
    );

    expect(tree.headers.map((row) => row.id).sort()).toEqual([1, 2]);
  });

  it('asks for nothing else when the scope holds no modules at all', async () => {
    const tree = await new Promise<{ headers: ModuleRow[] }>((resolve) =>
      read().subscribe(resolve),
    );

    expect(tree.headers).toEqual([]);
    expect(parentModuleApiMock.getParentModule).not.toHaveBeenCalled();
  });
});
