import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';

import { Common } from '@core/services';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableLoader } from '@shared/components/table-loader/table-loader';

import { CourseStore } from '../store/course.store';
import { LdRating } from '../ui/ld-rating';

type DetailTab = 'overview' | 'curriculum' | 'resources' | 'discussion' | 'reviews' | 'certificate';

@Component({
  selector: 'app-ld-course-details',
  imports: [ButtonModule, DatePipe, LdRating, TableLoader, TableEmptyMessage],
  providers: [CourseStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.isLoading()) {
      <app-table-loader />
    } @else if (store.selectedCourse(); as course) {
      <article
        class="overflow-hidden rounded-xl border border-border-light bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <!-- Banner -->
        <div class="relative h-44 w-full sm:h-56">
          <img
            [src]="course.banner"
            [alt]="course.title + ' banner'"
            class="h-full w-full object-cover"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10"></div>
          <div class="absolute bottom-0 left-0 p-5 text-white">
            <span class="rounded-full bg-primary-500 px-2 py-0.5 text-xs font-medium">
              {{ course.category }}
            </span>
            <h1 class="mt-2 text-xl font-bold sm:text-2xl">{{ course.title }}</h1>
            <p class="mt-1 text-sm opacity-90">
              <i class="pi pi-user mr-1" aria-hidden="true"></i>
              {{ course.instructor }}
            </p>
          </div>
        </div>

        <!-- Meta + actions -->
        <div
          class="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border-light px-5 py-3 text-sm text-gray-600 dark:border-zinc-800 dark:text-zinc-300"
        >
          <span>
            <i class="pi pi-clock mr-1" aria-hidden="true"></i>
            {{ course.durationHours }}h
          </span>
          <span>
            <i class="pi pi-signal mr-1" aria-hidden="true"></i>
            {{ course.level }}
          </span>
          <span>
            <i class="pi pi-globe mr-1" aria-hidden="true"></i>
            {{ course.language }}
          </span>
          <app-ld-rating [value]="course.rating" [count]="course.ratingCount" />
          <span class="ml-auto flex gap-2">
            <p-button label="Enroll" icon="pi pi-plus" size="small" (onClick)="enroll()" />
            <p-button
              label="Mark Complete"
              icon="pi pi-check"
              size="small"
              severity="success"
              [outlined]="true"
              (onClick)="markComplete()"
            />
          </span>
        </div>

        <!-- Tabs -->
        <div
          role="tablist"
          aria-label="Course details"
          class="flex gap-1 overflow-x-auto border-b border-border-light px-3 dark:border-zinc-800"
        >
          @for (tab of tabs; track tab.id) {
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="activeTab() === tab.id"
              class="shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              [class]="
                activeTab() === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-300'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              "
              (click)="activeTab.set(tab.id)"
            >
              {{ tab.label }}
            </button>
          }
        </div>

        <!-- Panels -->
        <div class="p-5 text-sm text-gray-700 dark:text-zinc-300">
          @switch (activeTab()) {
            @case ('overview') {
              <p class="leading-relaxed">{{ course.description }}</p>
              <h3 class="mt-4 mb-2 font-semibold text-gray-900 dark:text-zinc-100">Skills</h3>
              <div class="flex flex-wrap gap-2">
                @for (skill of course.skills; track skill) {
                  <span
                    class="rounded-md bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-200"
                  >
                    {{ skill }}
                  </span>
                }
              </div>
            }
            @case ('curriculum') {
              @for (section of course.sections; track section.id) {
                <div class="mb-4">
                  <h3 class="mb-2 font-semibold text-gray-900 dark:text-zinc-100">
                    {{ section.title }}
                  </h3>
                  <ul class="divide-y divide-border-light dark:divide-zinc-800">
                    @for (lesson of section.lessons; track lesson.id) {
                      <li class="flex items-center gap-3 py-2">
                        <i
                          [class]="lessonIcon(lesson.type)"
                          class="text-primary-500"
                          aria-hidden="true"
                        ></i>
                        <span class="flex-1">{{ lesson.title }}</span>
                        <span class="text-xs text-gray-400 tabular-nums">
                          {{ lesson.durationMinutes }} min
                        </span>
                      </li>
                    }
                  </ul>
                </div>
              } @empty {
                <p class="text-gray-400">Curriculum coming soon.</p>
              }
            }
            @case ('resources') {
              @if (course.resources.length) {
                <ul class="flex flex-col gap-2">
                  @for (res of course.resources; track res.id) {
                    <li>
                      <a
                        [href]="res.url"
                        class="inline-flex items-center gap-2 text-primary-600 hover:underline dark:text-primary-300"
                      >
                        <i class="pi pi-paperclip" aria-hidden="true"></i>
                        {{ res.title }}
                      </a>
                    </li>
                  }
                </ul>
              } @else {
                <p class="text-gray-400">No resources attached.</p>
              }
            }
            @case ('discussion') {
              <p class="text-gray-400">Discussion threads will appear here.</p>
            }
            @case ('reviews') {
              @if (course.reviews.length) {
                <ul class="flex flex-col gap-4">
                  @for (review of course.reviews; track review.id) {
                    <li class="border-b border-border-light pb-3 dark:border-zinc-800">
                      <div class="flex items-center justify-between gap-2">
                        <span class="font-medium text-gray-900 dark:text-zinc-100">
                          {{ review.author }}
                        </span>
                        <app-ld-rating [value]="review.rating" />
                      </div>
                      <p class="mt-1">{{ review.comment }}</p>
                      <p class="mt-1 text-xs text-gray-400">
                        {{ review.date | date: 'mediumDate' }}
                      </p>
                    </li>
                  }
                </ul>
              } @else {
                <p class="text-gray-400">No reviews yet.</p>
              }
            }
            @case ('certificate') {
              <p>
                Complete all lessons and pass the final assessment to earn a verifiable certificate
                for
                <strong>{{ course.title }}</strong>
                .
              </p>
            }
          }
        </div>
      </article>
    } @else {
      <app-table-empty-message
        icon="pi pi-search"
        message="Course not found"
        subMessage="The course you're looking for doesn't exist or was removed."
      />
    }
  `,
})
export default class LdCourseDetails {
  protected readonly store = inject(CourseStore);
  readonly #route = inject(ActivatedRoute);
  readonly #common = inject(Common);

  protected readonly activeTab = signal<DetailTab>('overview');
  protected readonly tabs: { id: DetailTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'curriculum', label: 'Curriculum' },
    { id: 'resources', label: 'Resources' },
    { id: 'discussion', label: 'Discussion' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'certificate', label: 'Certificate' },
  ];

  constructor() {
    const id = this.#route.snapshot.paramMap.get('id');
    if (id) this.store.selectCourse(id);
  }

  protected enroll(): void {
    const course = this.store.selectedCourse();
    if (course) this.store.enroll(course);
  }

  protected markComplete(): void {
    this.#common.showMessage('Course marked complete.', 'success');
  }

  protected lessonIcon(type: 'video' | 'reading' | 'quiz'): string {
    return type === 'video'
      ? 'pi pi-play-circle'
      : type === 'quiz'
        ? 'pi pi-question-circle'
        : 'pi pi-book';
  }
}
