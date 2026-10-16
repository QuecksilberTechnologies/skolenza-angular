import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { Common } from '@core/services';
import { Assessment } from '@shared/interfaces';

import { AssessmentStore } from './assessment.store';

const ASSESSMENT: Assessment = {
  id: 'qz',
  courseTitle: 'Test',
  category: 'Eng',
  durationMinutes: 5,
  passingScore: 50,
  questions: [
    { id: 'q1', text: 'one', options: ['a', 'b'], correctIndex: 0 },
    { id: 'q2', text: 'two', options: ['a', 'b'], correctIndex: 1 },
  ],
};

const RESPONSE = {
  isSucceeded: true,
  message: '',
  errors: [],
  pageNumber: 1,
  pageSize: 1,
  totalRecords: 1,
  totalPages: 1,
  data: [ASSESSMENT],
};

describe('AssessmentStore', () => {
  let store: InstanceType<typeof AssessmentStore>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AssessmentStore,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Common, useValue: { showMessage: vi.fn() } },
      ],
    });
    store = TestBed.inject(AssessmentStore);
    TestBed.tick();
    http = TestBed.inject(HttpTestingController);
    http.expectOne('data/learning/assessments.json').flush(RESPONSE);
    TestBed.tick();
  });

  afterEach(() => http.verify());

  it('loads assessments', () => {
    expect(store.assessments().length).toBe(1);
    expect(store.isLoading()).toBe(false);
  });

  it('select initialises quiz state', () => {
    store.select('qz');
    expect(store.selected()?.id).toBe('qz');
    expect(store.currentIndex()).toBe(0);
    expect(store.questions().length).toBe(2);
    expect(store.result()).toBeNull();
  });

  it('records answers and counts them', () => {
    store.select('qz');
    store.answer('q1', 0);
    expect(store.answeredCount()).toBe(1);
    store.answer('q2', 1);
    expect(store.answeredCount()).toBe(2);
  });

  it('scores a fully correct submission as passed', () => {
    store.select('qz');
    store.answer('q1', 0);
    store.answer('q2', 1);
    store.submit();
    const r = store.result();
    expect(r).toEqual({ score: 100, correct: 2, total: 2, passed: true });
  });

  it('scores a fully wrong submission as failed', () => {
    store.select('qz');
    store.answer('q1', 1);
    store.answer('q2', 0);
    store.submit();
    expect(store.result()).toEqual({ score: 0, correct: 0, total: 2, passed: false });
  });

  it('treats score equal to passingScore as passed', () => {
    store.select('qz');
    store.answer('q1', 0); // correct
    store.answer('q2', 0); // wrong → 50%
    store.submit();
    expect(store.result()?.score).toBe(50);
    expect(store.result()?.passed).toBe(true);
  });

  it('retake clears answers and submission', () => {
    store.select('qz');
    store.answer('q1', 0);
    store.submit();
    store.retake();
    expect(store.answeredCount()).toBe(0);
    expect(store.result()).toBeNull();
  });

  it('navigates between questions within bounds', () => {
    store.select('qz');
    store.prev();
    expect(store.currentIndex()).toBe(0);
    store.next();
    expect(store.currentIndex()).toBe(1);
    store.next();
    expect(store.currentIndex()).toBe(1);
  });
});
