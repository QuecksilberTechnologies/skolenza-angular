import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { Common } from '@core/services';
import { Course, CourseLevel } from '@shared/interfaces';

import { CourseStore } from './course.store';

const course = (id: string, over: Partial<Course> = {}): Course => ({
  id,
  title: `Course ${id}`,
  instructor: 'Inst',
  category: 'Engineering',
  level: 'Beginner' as CourseLevel,
  durationHours: 5,
  rating: 4,
  ratingCount: 10,
  enrolledCount: 100,
  language: 'English',
  thumbnail: '',
  banner: '',
  tags: [],
  skills: ['Angular'],
  description: '',
  sections: [],
  resources: [],
  reviews: [],
  ...over,
});

const COURSES: Course[] = [
  course('1', { category: 'Engineering', level: 'Beginner', durationHours: 4, rating: 4.0 }),
  course('2', {
    category: 'Design',
    level: 'Intermediate',
    durationHours: 8,
    rating: 4.8,
    title: 'UX Design',
  }),
  course('3', { category: 'Engineering', level: 'Advanced', durationHours: 12, rating: 4.6 }),
  course('4', { category: 'Data', level: 'Beginner', durationHours: 10, rating: 4.2 }),
  course('5', { category: 'Engineering', level: 'Beginner', durationHours: 6, rating: 3.9 }),
  course('6', { category: 'Security', level: 'Intermediate', durationHours: 7, rating: 4.4 }),
  course('7', { category: 'Engineering', level: 'Beginner', durationHours: 5, rating: 4.1 }),
  course('8', { category: 'Leadership', level: 'Advanced', durationHours: 9, rating: 4.7 }),
];

const RESPONSE = {
  isSucceeded: true,
  message: '',
  errors: [],
  pageNumber: 1,
  pageSize: 8,
  totalRecords: 8,
  totalPages: 1,
  data: COURSES,
};

describe('CourseStore', () => {
  let store: InstanceType<typeof CourseStore>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CourseStore,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Common, useValue: { showMessage: vi.fn() } },
      ],
    });
    store = TestBed.inject(CourseStore);
    TestBed.tick();
    http = TestBed.inject(HttpTestingController);
    http.expectOne('data/learning/courses.json').flush(RESPONSE);
    TestBed.tick();
  });

  afterEach(() => http.verify());

  it('loads courses and derives filter options', () => {
    expect(store.courses().length).toBe(8);
    expect(store.categories()).toContain('Engineering');
    expect(store.skills()).toContain('Angular');
  });

  it('filters by category', () => {
    store.setCategory('Design');
    expect(store.filteredCourses().map((c) => c.id)).toEqual(['2']);
  });

  it('filters by level, duration and rating', () => {
    store.setLevel('Advanced');
    expect(store.filteredCourses().every((c) => c.level === 'Advanced')).toBe(true);
    store.setLevel(null);
    store.setMaxDuration(5);
    expect(store.filteredCourses().every((c) => c.durationHours <= 5)).toBe(true);
    store.setMaxDuration(null);
    store.setMinRating(4.5);
    expect(store.filteredCourses().every((c) => c.rating >= 4.5)).toBe(true);
  });

  it('searches across title', () => {
    store.setSearch('ux');
    expect(store.filteredCourses().map((c) => c.id)).toEqual(['2']);
  });

  it('paginates with infinite scroll accumulation', () => {
    expect(store.visibleCourses().length).toBe(6);
    expect(store.hasMore()).toBe(true);
    store.loadMore();
    expect(store.visibleCourses().length).toBe(8);
    expect(store.hasMore()).toBe(false);
  });

  it('resets visible count when a filter changes', () => {
    store.loadMore();
    expect(store.visibleCourses().length).toBe(8);
    store.setCategory('Engineering');
    expect(store.visibleCourses().length).toBe(4);
  });

  it('optimistically adds a course', () => {
    store.addCourse(course('9', { title: 'New' }));
    expect(store.courses()[0].id).toBe('9');
    expect(store.courses().length).toBe(9);
  });

  it('optimistically deletes a course', () => {
    store.deleteCourse('1');
    expect(store.courses().some((c) => c.id === '1')).toBe(false);
    expect(store.courses().length).toBe(7);
  });
});
