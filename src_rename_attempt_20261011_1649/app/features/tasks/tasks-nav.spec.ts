import { describe, expect, it } from 'vitest';

import { Task } from '@shared/interfaces';

import { isDueToday, isOverdue, TODAY } from './tasks-nav';

function makeTask(partial: Partial<Task>): Task {
  return {
    id: 't1',
    title: 't',
    description: '',
    status: 'Todo',
    priority: 'Medium',
    category: 'Feature',
    assigneeId: 'emp-1',
    assigneeName: 'A',
    reporterId: 'emp-9',
    reporterName: 'R',
    startDate: '2026-06-01',
    dueDate: '2026-06-01',
    completedDate: null,
    estimatedHours: 0,
    actualHours: 0,
    progress: 0,
    tags: [],
    attachments: [],
    comments: [],
    checklist: [],
    activity: [],
    isRecurring: false,
    createdAt: '',
    updatedAt: '',
    ...partial,
  };
}

describe('isOverdue', () => {
  it('flags open tasks past due', () => {
    expect(isOverdue(makeTask({ dueDate: '2026-07-01', status: 'InProgress' }))).toBe(true);
  });

  it('ignores completed or cancelled tasks', () => {
    expect(isOverdue(makeTask({ dueDate: '2026-07-01', status: 'Completed' }))).toBe(false);
    expect(isOverdue(makeTask({ dueDate: '2026-07-01', status: 'Cancelled' }))).toBe(false);
  });

  it('ignores tasks due today or later', () => {
    expect(isOverdue(makeTask({ dueDate: TODAY, status: 'Todo' }))).toBe(false);
    expect(isOverdue(makeTask({ dueDate: '2026-08-01', status: 'Todo' }))).toBe(false);
  });
});

describe('isDueToday', () => {
  it('flags open tasks due today', () => {
    expect(isDueToday(makeTask({ dueDate: TODAY, status: 'Todo' }))).toBe(true);
  });

  it('ignores completed tasks due today', () => {
    expect(isDueToday(makeTask({ dueDate: TODAY, status: 'Completed' }))).toBe(false);
  });
});
