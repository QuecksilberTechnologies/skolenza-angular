import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { Subject } from 'rxjs';
import { vi } from 'vitest';

import { CurrentUserPermissionsStore } from '@core/stores';
import { ModuleOperationRow } from '@shared/interfaces';

import ModuleOperations from './module-operations';
import { ModuleOperationsStore } from './module-operations.store';

const allowedOperations = new Set<string>();
const permissionsStoreMock = {
  canPerform: (_moduleName: string, operationName: string) => allowedOperations.has(operationName),
};

function createModuleOperation(overrides: Partial<ModuleOperationRow> = {}): ModuleOperationRow {
  return {
    id: 1,
    moduleOperationMappingId: null,
    moduleId: 10,
    moduleName: 'Assets',
    operationId: 2,
    operationName: 'Add',
    dataViewStructureId: null,
    pageTypeId: null,
    pageURL: '/app/assets',
    iconURL: null,
    isCommonItem: false,
    isOperational: true,
    priority: 1,
    remark: null,
    isActive: true,
    ...overrides,
  };
}

describe('ModuleOperations', () => {
  type Spy = ReturnType<typeof vi.fn>;

  let component: ModuleOperations;
  let fixture: ComponentFixture<ModuleOperations>;
  let storeMock: Record<string, Spy>;

  const moduleOperation = createModuleOperation();

  beforeEach(async () => {
    allowedOperations.clear();

    storeMock = {
      moduleOperations: vi.fn().mockReturnValue([moduleOperation]),
      filteredModuleOperations: vi.fn().mockReturnValue([moduleOperation]),
      moduleOptions: vi.fn().mockReturnValue([]),
      operationOptions: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      isLoadingScopedModules: vi.fn().mockReturnValue(false),
      scopedModules: vi.fn().mockReturnValue(new Map()),
      moduleScopeKey: vi.fn().mockReturnValue('institution'),
      moduleId: vi.fn().mockReturnValue(null),
      operationId: vi.fn().mockReturnValue(null),
      isActive: vi.fn().mockReturnValue(null),
      scopeReadFailed: vi.fn().mockReturnValue(false),
      hasUnreadModules: vi.fn().mockReturnValue(false),
      hiddenByScopeCount: vi.fn().mockReturnValue(0),
      setModuleScopeKey: vi.fn(),
      setModuleId: vi.fn(),
      setOperationId: vi.fn(),
      setIsActive: vi.fn(),
      reloadModuleOperations: vi.fn(),
      deleteModuleOperation: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ModuleOperations],
      providers: [
        MessageService,
        DatePipe,
        DialogService,
        ConfirmationService,
        { provide: CurrentUserPermissionsStore, useValue: permissionsStoreMock },
      ],
    })
      // The component provides the store itself, so it has to be replaced at that level.
      .overrideComponent(ModuleOperations, {
        set: { providers: [{ provide: ModuleOperationsStore, useValue: storeMock }] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ModuleOperations);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('names the module column for what a mapping can point at', () => {
    const headers = [...fixture.nativeElement.querySelectorAll('th')].map((th: HTMLElement) =>
      th.textContent?.trim(),
    );
    expect(headers[0]).toContain('Module');
  });

  it('sends the grid back to the first page whenever a filter changes', () => {
    const table = component['table']();
    expect(table).toBeTruthy();
    table!.first = 30;

    component.onModuleChange(7);

    expect(table!.first).toBe(0);
    expect(storeMock['setModuleId']).toHaveBeenCalledWith(7);
  });

  it('offers the scope filter alongside the module and operation ones', () => {
    expect(fixture.nativeElement.querySelectorAll('p-select').length).toBeGreaterThanOrEqual(4);
    expect(component['scopeOptions'].map((scope) => scope.label)).toEqual([
      'Institution User',
      'Host User',
      'Common',
    ]);
  });

  it('labels a row by the kind of module it maps', () => {
    storeMock['scopedModules'].mockReturnValue(new Map([[10, { label: 'M', isLeafNode: true }]]));

    expect(component.moduleKindLabel(createModuleOperation({ isOperational: true }))).toBe(
      'Operational',
    );
    expect(
      component.moduleKindLabel(createModuleOperation({ moduleId: 10, isOperational: false })),
    ).toBe('Leaf');
    expect(
      component.moduleKindLabel(createModuleOperation({ moduleId: 99, isOperational: false })),
    ).toBe('Module');
  });

  it('offers View Details to a role that holds no write permission', () => {
    component['selectedRow'].set(moduleOperation);
    const labels = component['actionMenuItems']().map((item) => item.label);

    expect(labels).toContain('View Details');
    expect(labels).not.toContain('Edit');
    expect(labels).not.toContain('Delete');
    // A lone entry needs no separator on either side.
    expect(component['actionMenuItems']().some((item) => item.separator)).toBe(false);
  });

  it('keeps the actions column in the colspan for every role', () => {
    expect(component['columnCount']).toBe(8);
  });

  it('viewDetails should open the sheet on the given row', () => {
    component.viewDetails(moduleOperation);

    expect(component['isDetailOpen']()).toBe(true);
    expect(component['detailModuleOperation']()).toEqual(moduleOperation);
  });

  it('closeDetails should restore focus once and stay safe to repeat', () => {
    const trigger = document.createElement('button');
    const focusSpy = vi.spyOn(trigger, 'focus');

    component.viewDetails(moduleOperation, trigger);
    component.closeDetails();
    component.closeDetails();

    expect(component['isDetailOpen']()).toBe(false);
    expect(component['detailModuleOperation']()).toBeNull();
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it('editFromDetails should swap the sheet for the dialog without stealing focus back', () => {
    allowedOperations.add('Update');
    const trigger = document.createElement('button');
    const focusSpy = vi.spyOn(trigger, 'focus');
    const openSpy = vi
      .spyOn(TestBed.inject(DialogService), 'open')
      .mockReturnValue({ onClose: new Subject(), close: vi.fn() } as never);

    component.viewDetails(moduleOperation, trigger);
    component.editFromDetails(moduleOperation);

    expect(component['isDetailOpen']()).toBe(false);
    expect(openSpy).toHaveBeenCalled();
    expect(focusSpy).not.toHaveBeenCalled();
  });

  it('shows the loader while the scoped module tree is still landing', () => {
    // The mappings resolve first; the grid is gated on the tree, so `filtered` is still empty.
    storeMock['isLoading'].mockReturnValue(true);
    storeMock['filteredModuleOperations'].mockReturnValue([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-table-loader')).toBeTruthy();
  });

  it('blames the module tree rather than the mappings when the scope read failed', () => {
    storeMock['filteredModuleOperations'].mockReturnValue([]);
    storeMock['scopeReadFailed'].mockReturnValue(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-table-empty-message')?.textContent).toContain(
      'Could not load modules for this scope',
    );
  });

  it('onContextMenuSelection should drop the stale action-menu trigger', () => {
    const trigger = document.createElement('button');
    const focusSpy = vi.spyOn(trigger, 'focus');

    component.openActionMenu(moduleOperation, { currentTarget: trigger } as unknown as Event, {
      toggle: vi.fn(),
    });
    component.onContextMenuSelection(moduleOperation);
    component['actionMenuItems']()[0].command?.({} as never);
    component.closeDetails();

    expect(focusSpy).not.toHaveBeenCalled();
  });
});
