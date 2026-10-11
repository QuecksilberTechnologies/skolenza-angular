import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { MessageService } from '@openng/optimus-ui/api';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { OperationsMasterApi } from '@core/services';
import { OperationRow } from '@shared/interfaces';

import { OperationsStore } from './operations.store';

function createOperation(overrides: Partial<OperationRow> = {}): OperationRow {
  return {
    id: 1,
    operationName: 'Add',
    operationType: 1,
    remark: 'Create records',
    iconImage: 'pi pi-plus-circle',
    isActive: true,
    ...overrides,
  };
}

describe('OperationsStore', () => {
  const operationsApiMock = {
    getOperations: vi.fn(),
    deleteOperation: vi.fn(),
  };

  const createStore = (operations: OperationRow[]) => {
    const store = TestBed.inject(OperationsStore);
    patchState(store as never, { operations });
    return store;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    operationsApiMock.getOperations.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [] }),
    );
    operationsApiMock.deleteOperation.mockReturnValue(
      of({ isSucceeded: true, message: 'Operation deleted.', errors: [], data: null }),
    );

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        DatePipe,
        OperationsStore,
        { provide: OperationsMasterApi, useValue: operationsApiMock },
      ],
    });
  });

  it('loads the operations on creation', async () => {
    operationsApiMock.getOperations.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [createOperation()] }),
    );

    const store = TestBed.inject(OperationsStore);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.operations()).toHaveLength(1);
  });

  it('clears the grid when the list call reports a failure', async () => {
    const store = createStore([createOperation()]);
    operationsApiMock.getOperations.mockReturnValue(
      of({ isSucceeded: false, message: 'nope', errors: [], data: null }),
    );

    store.reloadOperations();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.operations()).toEqual([]);
  });

  it('clears the grid when the list call throws', async () => {
    const store = createStore([createOperation()]);
    operationsApiMock.getOperations.mockReturnValue(throwError(() => new Error('boom')));

    store.reloadOperations();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.operations()).toEqual([]);
  });

  it('filters by type and status without hitting the API again', async () => {
    const store = createStore([
      createOperation({ id: 1, operationType: 1, isActive: true }),
      createOperation({ id: 2, operationType: 2, isActive: true }),
      createOperation({ id: 3, operationType: 1, isActive: false }),
    ]);
    const callsBefore = operationsApiMock.getOperations.mock.calls.length;

    store.setOperationType(1);
    store.setIsActive(true);

    expect(store.filteredOperations().map((operation) => operation.id)).toEqual([1]);
    expect(operationsApiMock.getOperations.mock.calls).toHaveLength(callsBefore);
  });

  describe('deleteOperation', () => {
    it('drops the row once the API confirms', () => {
      const store = createStore([createOperation({ id: 1 }), createOperation({ id: 2 })]);

      store.deleteOperation(store.operations()[0]);

      expect(operationsApiMock.deleteOperation).toHaveBeenCalledWith(1);
      expect(store.operations().map((operation) => operation.id)).toEqual([2]);
    });

    it('keeps the row when the API refuses', () => {
      operationsApiMock.deleteOperation.mockReturnValue(
        of({ isSucceeded: false, message: 'in use', errors: [], data: null }),
      );
      const store = createStore([createOperation({ id: 1 })]);

      store.deleteOperation(store.operations()[0]);

      expect(store.operations()).toHaveLength(1);
    });
  });
});
