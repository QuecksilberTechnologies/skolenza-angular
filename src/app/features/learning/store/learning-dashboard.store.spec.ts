import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { throwError } from 'rxjs';
import { vi } from 'vitest';

import { LearningDashboardApi } from '@core/services';

import { LearningDashboardStore } from './learning-dashboard.store';

describe('LearningDashboardStore', () => {
  const learningDashboardApiMock = { getDashboard: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    learningDashboardApiMock.getDashboard.mockReturnValue(throwError(() => new Error('boom')));

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        DatePipe,
        LearningDashboardStore,
        { provide: LearningDashboardApi, useValue: learningDashboardApiMock },
      ],
    });
  });

  it('keeps the page rendering when the dashboard call fails', async () => {
    // An errored resource makes `value()` throw, which aborts change detection for the
    // whole page instead of blanking a single card.
    const store = TestBed.inject(LearningDashboardStore);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.dashboard()).toBeNull();
    expect(store.kpis()).toBeNull();
    expect(store.continueLearning()).toEqual([]);
    expect(store.isLoading()).toBe(false);
  });
});
