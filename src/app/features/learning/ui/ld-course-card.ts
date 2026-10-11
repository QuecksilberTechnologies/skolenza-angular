import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';

import { Course } from '@shared/interfaces';

import { LdRating } from './ld-rating';

@Component({
  selector: 'app-ld-course-card',
  imports: [ButtonModule, LdRating],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="group flex h-full flex-col overflow-hidden rounded-xl border-0 bg-white shadow transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
    >
      <button
        type="button"
        class="relative block aspect-video w-full overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        (click)="view.emit(course())"
        [attr.aria-label]="'View ' + course().title"
      >
        <img
          [src]="course().thumbnail"
          [alt]="course().title + ' thumbnail'"
          width="640"
          height="360"
          loading="lazy"
          class="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        <span
          class="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/40 to-transparent"
          aria-hidden="true"
        ></span>
        <span
          class="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm"
        >
          {{ course().level }}
        </span>
      </button>

      <div class="flex flex-1 flex-col gap-2 p-4">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-medium text-primary-600 dark:text-primary-300">
            {{ course().category }}
          </span>
          <app-ld-rating [value]="course().rating" [count]="course().ratingCount" />
        </div>

        <h3 class="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-zinc-100">
          {{ course().title }}
        </h3>
        <p class="text-xs text-gray-500 dark:text-zinc-400">
          <i class="pi pi-user mr-1 text-[0.65rem]" aria-hidden="true"></i>
          {{ course().instructor }}
        </p>
        <p class="line-clamp-2 text-xs text-gray-500 dark:text-zinc-400">
          {{ course().description }}
        </p>

        <div class="mt-1 flex flex-wrap gap-1">
          @for (tag of course().tags; track tag) {
            <span
              class="rounded-md bg-gray-100 px-2 py-0.5 text-[0.65rem] font-medium text-gray-600 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {{ tag }}
            </span>
          }
        </div>

        <div
          class="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 pt-3 dark:border-zinc-800"
        >
          <span class="text-xs text-gray-500 dark:text-zinc-400">
            <i class="pi pi-clock mr-1 text-[0.65rem]" aria-hidden="true"></i>
            {{ course().durationHours }}h
          </span>
          <p-button
            label="Enroll"
            icon="pi pi-plus"
            size="small"
            (onClick)="enroll.emit(course())"
          />
        </div>
      </div>
    </article>
  `,
})
export class LdCourseCard {
  readonly course = input.required<Course>();
  readonly enroll = output<Course>();
  readonly view = output<Course>();
}
