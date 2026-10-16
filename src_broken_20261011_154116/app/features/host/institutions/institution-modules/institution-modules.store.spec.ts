import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { SubscriptionsApi, InstitutionsApi } from '@core/services';
import { PermissionSavePayload } from '@shared/components';
import { InstitutionModule } from '@shared/interfaces';

import { InstitutionModulesStore } from './institution-modules.store';

const modules: InstitutionModule[] = [
  {
    id: 1,
    parentModuleId: 0,
    parentModuleName: '',
    moduleName: 'StaffMembers',
    isEnabled: true,
    operations: [
      { id: 10, operationName: 'View', operationType: 1, isEnabled: true },
      { id: 11, operationName: 'Add', operationType: 1, isEnabled: false },
    ],
  },
  {
    id: 2,
    parentModuleId: 0,
    parentModuleName: '',
    moduleName: 'Assets',
    isEnabled: false,
    operations: [{ id: 10, operationName: 'View', operationType: 1, isEnabled: true }],
  },
];

describe('InstitutionModulesStore', () => {
  const subscriptionsApiMock = { getInstitutionAccessibleModules: vi.fn() };
  const institutionsApiMock = { updateModulesAndOperations: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    subscriptionsApiMock.getInstitutionAccessibleModules.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: { institutionId: 'TEN00007', modules } }),
    );
    institutionsApiMock.updateModulesAndOperations.mockReturnValue(
      of({ isSucceeded: true, message: 'Saved', errors: [], data: null }),
    );

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        DatePipe,
        InstitutionModulesStore,
        { provide: SubscriptionsApi, useValue: subscriptionsApiMock },
        { provide: InstitutionsApi, useValue: institutionsApiMock },
      ],
    });
  });

  it('renders every module and checks only what the institution already uses', async () => {
    const store = TestBed.inject(InstitutionModulesStore);
    store.loadModules('TEN00007');
    await TestBed.inject(ApplicationRef).whenStable();

    expect(subscriptionsApiMock.getInstitutionAccessibleModules).toHaveBeenCalledWith({
      InstitutionId: 'TEN00007',
      IsActive: true,
    });
    // A module switched off is exactly what this screen exists to switch on, so it must still show.
    expect(store.modules().map((m) => m.isEnabled)).toEqual([true, true]);
    expect(store.enabled()).toEqual([
      { id: 0, moduleId: 1, operationId: 10, hasAccess: true, isActive: true },
    ]);
  });

  it('accepts a bare module array as well as the wrapped shape', async () => {
    subscriptionsApiMock.getInstitutionAccessibleModules.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: modules }),
    );

    const store = TestBed.inject(InstitutionModulesStore);
    store.loadModules('TEN00007');
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.modules()).toHaveLength(2);
  });

  it('switches a module off when none of its operations are checked', async () => {
    const store = TestBed.inject(InstitutionModulesStore);
    const payload: PermissionSavePayload = {
      modules: [
        {
          moduleId: 1,
          moduleName: 'StaffMembers',
          operations: [
            { operationId: 10, operationName: 'View', operationType: 1, hasAccess: true },
            { operationId: 11, operationName: 'Add', operationType: 1, hasAccess: false },
          ],
        },
        {
          moduleId: 2,
          moduleName: 'Assets',
          operations: [
            { operationId: 10, operationName: 'View', operationType: 1, hasAccess: false },
          ],
        },
      ],
    };

    store.saveModules('TEN00007', payload);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(institutionsApiMock.updateModulesAndOperations).toHaveBeenCalledWith({
      institutionId: 'TEN00007',
      modules: [
        {
          moduleId: 1,
          isEnabled: true,
          operations: [
            { operationId: 10, isEnabled: true, isOperationUsed: true },
            { operationId: 11, isEnabled: false, isOperationUsed: false },
          ],
        },
        {
          moduleId: 2,
          isEnabled: false,
          operations: [{ operationId: 10, isEnabled: false, isOperationUsed: false }],
        },
      ],
    });
  });
});
