import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { SelectModule } from '@openng/optimus-ui/select';

import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { Course, CourseLevel } from '@shared/interfaces';

import { CourseStore } from '../store/course.store';
import { LdCourseCard } from '../ui/ld-course-card';

@Component({
  selector: 'app-ld-catalog',
  imports: [
    SelectModule,
    InputTextModule,
    FormsModule,
    LdCourseCard,
    TableLoader,
    TableEmptyMessage,
  ],
  providers: [CourseStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border-light bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <span class="relative">
        <i
          class="pi pi-search pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-gray-400"
          aria-hidden="true"
        ></i>
        <input
          pInputText
          type="search"
          placeholder="Search courses"
          class="w-64 !pl-9"
          aria-label="Search catalog"
          [ngModel]="store.filter().search ?? ''"
          (ngModelChange)="store.setSearch($event)"
        />
      </span>
      <p-select
        [options]="store.categories()"
        placeholder="Category"
        [showClear]="true"
        styleClass="w-44"
        ariaLabel="Filter by category"
        [ngModel]="store.filter().category ?? null"
        (ngModelChange)="store.setCategory($event)"
      />
      <p-select
        [options]="store.skills()"
        placeholder="Skill"
        [showClear]="true"
        styleClass="w-44"
        ariaLabel="Filter by skill"
        [ngModel]="store.filter().skill ?? null"
        (ngModelChange)="store.setSkill($event)"
      />
      <p-select
        [options]="levelOptions"
        placeholder="Level"
        [showClear]="true"
        styleClass="w-40"
        ariaLabel="Filter by level"
        [ngModel]="store.filter().level ?? null"
        (ngModelChange)="store.setLevel($event)"
      />
      <p-select
        [options]="durationOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="Duration"
        [showClear]="true"
        styleClass="w-40"
        ariaLabel="Filter by duration"
        [ngModel]="store.filter().maxDuration ?? null"
        (ngModelChange)="store.setMaxDuration($event)"
      />
      <p-select
        [options]="ratingOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="Rating"
        [showClear]="true"
        styleClass="w-40"
        ariaLabel="Filter by rating"
        [ngModel]="store.filter().minRating ?? null"
        (ngModelChange)="store.setMinRating($event)"
      />
      <span class="ml-auto text-sm text-gray-500 dark:text-zinc-400">
        {{ store.resultCount() }} {{ store.resultCount() === 1 ? 'course' : 'courses' }}
      </span>
    </div>

    @if (store.isLoading()) {
      <app-table-loader />
    } @else if (!store.resultCount()) {
      <app-table-empty-message
        icon="pi pi-objects-column"
        message="No courses match your filters"
        subMessage="Try clearing a filter or searching for something else."
      />
    } @else {
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        @for (course of store.visibleCourses(); track course.id) {
          <app-ld-course-card
            [course]="course"
            (enroll)="store.enroll($event)"
            (view)="openCourse($event)"
          />
        }
      </div>
      <div #sentinel class="h-8"></div>
      @if (store.hasMore()) {
        <p class="py-4 text-center text-sm text-gray-400 dark:text-zinc-500">Loading more…</p>
      }
    }
  `,
})
export default class LdCatalog {
  protected readonly store = inject(CourseStore);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  private readonly sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');

  protected readonly levelOptions: CourseLevel[] = ['Beginner', 'Intermediate', 'Advanced'];
  protected readonly durationOptions = [
    { label: 'Up to 4h', value: 4 },
    { label: 'Up to 8h', value: 8 },
    { label: 'Up to 12h', value: 12 },
  ];
  protected readonly ratingOptions = [
    { label: '4.0+', value: 4 },
    { label: '4.5+', value: 4.5 },
  ];

  constructor() {
    afterNextRender(() => {
      const observer = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting && this.store.hasMore()) {
          this.store.loadMore();
        }
      });
      const el = this.sentinel()?.nativeElement;
      if (el) observer.observe(el);
    });
  }

  protected openCourse(course: Course): void {
    this.store.selectCourse(course.id);
    this.#router.navigate(['../catalog', course.id], { relativeTo: this.#route });
  }
}
