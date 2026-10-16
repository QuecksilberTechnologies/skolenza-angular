import { computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { map, tap } from 'rxjs';

import { Common, LearningApi } from '@core/services';
import { Course, CourseFilter, CourseLevel } from '@shared/interfaces';

const PAGE_STEP = 6;

interface CourseState {
  courses: Course[];
  filter: CourseFilter;
  visibleCount: number;
  selectedId: string | null;
}

const initialState: CourseState = {
  courses: [],
  filter: {},
  visibleCount: PAGE_STEP,
  selectedId: null,
};

const unique = (values: string[]): string[] => [...new Set(values)].sort();

const matches = (c: Course, f: CourseFilter): boolean => {
  const term = f.search?.trim().toLowerCase();
  if (term) {
    const haystack =
      `${c.title} ${c.instructor} ${c.tags.join(' ')} ${c.skills.join(' ')}`.toLowerCase();
    if (!haystack.includes(term)) return false;
  }
  if (f.category && c.category !== f.category) return false;
  if (f.skill && !c.skills.includes(f.skill)) return false;
  if (f.level && c.level !== f.level) return false;
  if (f.maxDuration != null && c.durationHours > f.maxDuration) return false;
  if (f.minRating != null && c.rating < f.minRating) return false;
  return true;
};

export const CourseStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const learningApi = inject(LearningApi);
    const commonService = inject(Common);

    const coursesResource = rxResource({
      stream: () =>
        learningApi.getCourses().pipe(
          tap((res) => {
            if (!res.isSucceeded) commonService.showMessage(res.message, 'error');
            patchState(store, { courses: res.isSucceeded ? res.data : [] });
          }),
          map((res) => res.data),
        ),
    });

    return { coursesResource };
  }),
  withComputed(({ courses, filter, visibleCount, selectedId, coursesResource }) => {
    const filteredCourses = computed(() => courses().filter((c) => matches(c, filter())));
    return {
      isLoading: computed(() => coursesResource.isLoading()),
      categories: computed(() => unique(courses().map((c) => c.category))),
      skills: computed(() => unique(courses().flatMap((c) => c.skills))),
      filteredCourses,
      visibleCourses: computed(() => filteredCourses().slice(0, visibleCount())),
      hasMore: computed(() => visibleCount() < filteredCourses().length),
      resultCount: computed(() => filteredCourses().length),
      selectedCourse: computed(() => courses().find((c) => c.id === selectedId()) ?? null),
    };
  }),
  withMethods((store) => {
    const learningApi = inject(LearningApi);
    const commonService = inject(Common);

    const setFilter = (patch: Partial<CourseFilter>): void =>
      patchState(store, { filter: { ...store.filter(), ...patch }, visibleCount: PAGE_STEP });

    return {
      setSearch: (search: string): void => setFilter({ search }),
      setCategory: (category: string | null): void => setFilter({ category }),
      setSkill: (skill: string | null): void => setFilter({ skill }),
      setLevel: (level: CourseLevel | null): void => setFilter({ level }),
      setMaxDuration: (maxDuration: number | null): void => setFilter({ maxDuration }),
      setMinRating: (minRating: number | null): void => setFilter({ minRating }),
      clearFilters: (): void => patchState(store, { filter: {}, visibleCount: PAGE_STEP }),
      loadMore: (): void => patchState(store, { visibleCount: store.visibleCount() + PAGE_STEP }),
      selectCourse: (id: string): void => patchState(store, { selectedId: id }),
      reload: (): void => {
        store.coursesResource.reload();
      },
      enroll(course: Course): void {
        learningApi.enroll(course).subscribe((res) => {
          commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
        });
      },
      addCourse(course: Course): void {
        patchState(store, { courses: [course, ...store.courses()] });
        learningApi.saveCourse(course).subscribe((res) => {
          commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
        });
      },
      updateCourse(course: Course): void {
        patchState(store, {
          courses: store.courses().map((c) => (c.id === course.id ? course : c)),
        });
        learningApi.saveCourse(course).subscribe((res) => {
          commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
        });
      },
      deleteCourse(id: string): void {
        patchState(store, { courses: store.courses().filter((c) => c.id !== id) });
        learningApi.deleteCourse(id).subscribe((res) => {
          commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
        });
      },
    };
  }),
);
