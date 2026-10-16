import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { Common, PerformanceManagementApi } from '@core/services';
import { Goal, PmsResponse } from '@shared/interfaces';

import { PmsGoalsStore } from './pms-goals.store';

const goal = (id: string, over: Partial<Goal> = {}): Goal => ({
  id,
  title: `Goal ${id}`,
  description: '',
  category: 'Business',
  weight: 20,
  progress: 50,
  startDate: '2026-01-01',
  dueDate: '2026-06-30',
  status: 'Pending',
  ownerId: 'e-1',
  ownerName: 'Jane',
  ...over,
});

const res = <T>(data: T): PmsResponse<T> => ({
  isSucceeded: true,
  message: 'ok',
  errors: [],
  data,
  pageNumber: 1,
  pageSize: 10,
  totalRecords: Array.isArray(data) ? data.length : 1,
  totalPages: 1,
});

function setup(goals: Goal[]) {
  const api = {
    getGoals: () => of(res(goals)),
    saveGoal: (g: Goal) => of(res(g)),
    deleteById: (id: string) => of(res(id)),
  };
  TestBed.configureTestingModule({
    providers: [
      PmsGoalsStore,
      { provide: PerformanceManagementApi, useValue: api },
      { provide: Common, useValue: { showMessage: () => {} } },
    ],
  });
  return TestBed.inject(PmsGoalsStore);
}

describe('PmsGoalsStore', () => {
  it('loadGoals populates goals and weightTotal', () => {
    const store = setup([goal('1', { weight: 30 }), goal('2', { weight: 40 })]);
    store.loadGoals();
    expect(store.goals().length).toBe(2);
    expect(store.weightTotal()).toBe(70);
  });

  it('activeGoals excludes Completed and Cancelled', () => {
    const store = setup([
      goal('1', { status: 'Pending' }),
      goal('2', { status: 'Completed' }),
      goal('3', { status: 'Cancelled' }),
    ]);
    store.loadGoals();
    expect(store.activeGoals()).toBe(1);
  });

  it('setStatusFilter filters the list', () => {
    const store = setup([goal('1', { status: 'Pending' }), goal('2', { status: 'Draft' })]);
    store.loadGoals();
    store.setStatusFilter('Draft');
    expect(store.filteredGoals().map((g) => g.id)).toEqual(['2']);
  });

  it('updateProgress to 100 marks the goal Completed', () => {
    const store = setup([goal('1', { progress: 50, status: 'Pending' })]);
    store.loadGoals();
    store.updateProgress('1', 100);
    const updated = store.goals().find((g) => g.id === '1');
    expect(updated?.progress).toBe(100);
    expect(updated?.status).toBe('Completed');
  });

  it('deleteGoal removes the goal optimistically', () => {
    const store = setup([goal('1'), goal('2')]);
    store.loadGoals();
    store.deleteGoal('1');
    expect(store.goals().map((g) => g.id)).toEqual(['2']);
  });

  it('saveGoal upserts an existing goal', () => {
    const store = setup([goal('1', { title: 'Old' })]);
    store.loadGoals();
    store.saveGoal(goal('1', { title: 'New' }));
    expect(store.goals().find((g) => g.id === '1')?.title).toBe('New');
  });
});
