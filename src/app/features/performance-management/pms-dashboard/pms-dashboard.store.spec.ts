import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { Common, PerformanceManagementApi } from '@core/services';
import { Feedback, Goal, PmsDashboard, PmsResponse, Review } from '@shared/interfaces';

import { PmsDashboardStore } from './pms-dashboard.store';

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

const goal = (over: Partial<Goal>): Goal => ({
  id: 'g',
  title: 't',
  description: '',
  category: 'Business',
  weight: 10,
  progress: 50,
  startDate: '2026-01-01',
  dueDate: '2026-06-30',
  status: 'Pending',
  ownerId: 'e',
  ownerName: 'J',
  ...over,
});

const review = (over: Partial<Review>): Review => ({
  id: 'r',
  cycle: 'Q1-2026',
  staffMemberId: 'e',
  staffMemberName: 'J',
  reviewerId: 'm',
  reviewerName: 'M',
  selfReview: '',
  managerReview: '',
  goalsRating: 0,
  competencies: [],
  overallRating: 0,
  comments: '',
  status: 'Pending',
  dueDate: '2026-04-10',
  ...over,
});

const feedback: Feedback = {
  id: 'f',
  fromId: 'a',
  fromName: 'A',
  toId: 'b',
  toName: 'B',
  type: 'Appreciation',
  visibility: 'Public',
  message: 'hi',
  createdAt: '2026-05-01T00:00:00Z',
};

const dashboard: PmsDashboard = {
  kpis: {
    activeGoals: 0,
    pendingReviews: 0,
    completedReviews: 0,
    feedbackReceived: 0,
    averageRating: 0,
  },
  goalProgress: { labels: [], values: [] },
  ratingTrend: { labels: ['Q4-2025'], values: [4] },
};

function setup() {
  const api = {
    getGoals: () =>
      of(
        res<Goal[]>([
          goal({ status: 'Pending' }),
          goal({ status: 'Completed', category: 'Technical', progress: 100 }),
        ]),
      ),
    getReviews: () =>
      of(
        res<Review[]>([
          review({ status: 'Completed', overallRating: 4 }),
          review({ status: 'Pending' }),
        ]),
      ),
    getFeedback: () => of(res<Feedback[]>([feedback])),
    getDashboard: () => of(res<PmsDashboard>(dashboard)),
  };
  TestBed.configureTestingModule({
    providers: [
      PmsDashboardStore,
      { provide: PerformanceManagementApi, useValue: api },
      { provide: Common, useValue: { showMessage: () => {} } },
    ],
  });
  return TestBed.inject(PmsDashboardStore);
}

describe('PmsDashboardStore', () => {
  it('derives KPIs from goals/reviews/feedback', () => {
    const store = setup();
    store.loadDashboard();
    const kpis = store.kpis();
    expect(kpis.activeGoals).toBe(1);
    expect(kpis.completedReviews).toBe(1);
    expect(kpis.pendingReviews).toBe(1);
    expect(kpis.feedbackReceived).toBe(1);
    expect(kpis.averageRating).toBe(4);
  });

  it('computes goalProgress series per category', () => {
    const store = setup();
    store.loadDashboard();
    const series = store.goalProgress();
    const tech = series.values[series.labels.indexOf('Technical')];
    expect(tech).toBe(100);
  });

  it('keeps ratingTrend from the dashboard mock', () => {
    const store = setup();
    store.loadDashboard();
    expect(store.ratingTrendSeries()?.values).toEqual([4]);
  });
});
