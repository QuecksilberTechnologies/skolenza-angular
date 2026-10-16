import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';

import { TableLoader } from '@shared/components/table-loader/table-loader';
import { Assessment } from '@shared/interfaces';

import { AssessmentStore } from '../store/assessment.store';

@Component({
  selector: 'app-ld-assessments',
  imports: [ButtonModule, TableLoader],
  providers: [AssessmentStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.isLoading()) {
      <app-table-loader />
    } @else if (store.result(); as result) {
      <!-- Result panel -->
      <div
        class="mx-auto max-w-lg rounded-xl border border-border-light bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <span
          class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full text-4xl"
          [class]="
            result.passed
              ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300'
              : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300'
          "
        >
          <i [class]="result.passed ? 'pi pi-check' : 'pi pi-times'" aria-hidden="true"></i>
        </span>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-zinc-100">{{ result.score }}%</h2>
        <p
          class="mt-1 text-sm font-semibold"
          [class]="result.passed ? 'text-green-600' : 'text-red-600'"
        >
          {{ result.passed ? 'Passed' : 'Failed' }}
        </p>
        <p class="mt-2 text-sm text-gray-500 dark:text-zinc-400">
          {{ result.correct }} of {{ result.total }} correct
        </p>

        <ul class="mt-5 flex flex-col gap-2 text-left">
          @for (q of store.questions(); track q.id; let i = $index) {
            <li
              class="flex items-start gap-2 rounded-lg border border-border-light p-3 text-sm dark:border-zinc-800"
            >
              <i
                class="mt-0.5"
                [class]="
                  store.selected()?.questions?.[i]?.correctIndex === answerOf(q.id)
                    ? 'pi pi-check-circle text-green-500'
                    : 'pi pi-times-circle text-red-500'
                "
                aria-hidden="true"
              ></i>
              <div>
                <p class="font-medium text-gray-800 dark:text-zinc-200">{{ q.text }}</p>
                <p class="text-xs text-green-600 dark:text-green-400">
                  Correct: {{ q.options[q.correctIndex] }}
                </p>
              </div>
            </li>
          }
        </ul>

        <div class="mt-6 flex justify-center gap-2">
          <p-button label="Retake" icon="pi pi-replay" (onClick)="retake()" />
          <p-button
            label="Back to list"
            icon="pi pi-arrow-left"
            severity="secondary"
            [outlined]="true"
            (onClick)="exit()"
          />
        </div>
      </div>
    } @else if (store.selected(); as quiz) {
      <!-- Quiz runner -->
      <div
        class="mx-auto max-w-2xl rounded-xl border border-border-light bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div class="mb-4 flex items-center justify-between gap-3">
          <h2 class="text-base font-semibold text-gray-900 dark:text-zinc-100">
            {{ quiz.courseTitle }}
          </h2>
          <span
            class="flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold tabular-nums"
            [class]="
              remaining() <= 30
                ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300'
                : 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-200'
            "
            role="timer"
            aria-live="polite"
          >
            <i class="pi pi-clock text-xs" aria-hidden="true"></i>
            {{ clock() }}
          </span>
        </div>

        <!-- progress -->
        <div
          class="mb-1 flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400"
        >
          <span>Question {{ store.currentIndex() + 1 }} of {{ store.questions().length }}</span>
          <span>{{ store.answeredCount() }} answered</span>
        </div>
        <div class="mb-5 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-700">
          <div
            class="h-full rounded-full bg-primary-500 transition-all"
            [style.width.%]="((store.currentIndex() + 1) / store.questions().length) * 100"
          ></div>
        </div>

        @if (store.currentQuestion(); as q) {
          <fieldset>
            <legend class="mb-4 text-lg font-medium text-gray-900 dark:text-zinc-100">
              {{ q.text }}
            </legend>
            <div class="flex flex-col gap-2">
              @for (option of q.options; track $index) {
                <label
                  class="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition"
                  [class]="
                    answerOf(q.id) === $index
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-border-light hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-800'
                  "
                >
                  <input
                    type="radio"
                    [name]="q.id"
                    class="accent-primary-500"
                    [checked]="answerOf(q.id) === $index"
                    (change)="store.answer(q.id, $index)"
                  />
                  <span class="text-gray-800 dark:text-zinc-200">{{ option }}</span>
                </label>
              }
            </div>
          </fieldset>
        }

        <div class="mt-6 flex items-center justify-between">
          <p-button
            label="Previous"
            icon="pi pi-chevron-left"
            severity="secondary"
            [outlined]="true"
            [disabled]="store.isFirst()"
            (onClick)="store.prev()"
          />
          @if (store.isLast()) {
            <p-button
              label="Submit"
              icon="pi pi-check"
              severity="success"
              [disabled]="store.answeredCount() < store.questions().length"
              (onClick)="submit()"
            />
          } @else {
            <p-button
              label="Next"
              icon="pi pi-chevron-right"
              iconPos="right"
              (onClick)="store.next()"
            />
          }
        </div>
      </div>
    } @else {
      <!-- List -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        @for (a of store.assessments(); track a.id) {
          <article
            class="flex flex-col rounded-xl border border-border-light bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <span class="text-xs font-medium text-primary-600 dark:text-primary-300">
              {{ a.category }}
            </span>
            <h3 class="mt-1 text-base font-semibold text-gray-900 dark:text-zinc-100">
              {{ a.courseTitle }}
            </h3>
            <div
              class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-zinc-400"
            >
              <span>
                <i class="pi pi-list mr-1" aria-hidden="true"></i>
                {{ a.questions.length }} questions
              </span>
              <span>
                <i class="pi pi-clock mr-1" aria-hidden="true"></i>
                {{ a.durationMinutes }} min
              </span>
              <span>
                <i class="pi pi-flag mr-1" aria-hidden="true"></i>
                Pass {{ a.passingScore }}%
              </span>
            </div>
            <p-button
              label="Start Quiz"
              icon="pi pi-play"
              size="small"
              styleClass="mt-4 w-full"
              (onClick)="start(a)"
            />
          </article>
        } @empty {
          <p class="text-sm text-gray-400">No assessments available.</p>
        }
      </div>
    }
  `,
})
export default class LdAssessments {
  protected readonly store = inject(AssessmentStore);
  readonly #destroyRef = inject(DestroyRef);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly remaining = signal(0);
  protected readonly clock = computed(() => {
    const s = this.remaining();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  });

  #intervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.#destroyRef.onDestroy(() => this.#stopTimer());
    // auto-stop the timer once a result exists
    effect(() => {
      if (this.store.result()) this.#stopTimer();
    });
  }

  protected answerOf(questionId: string): number | undefined {
    return this.store.answers()[questionId];
  }

  protected start(a: Assessment): void {
    this.store.select(a.id);
    this.remaining.set(a.durationMinutes * 60);
    this.#startTimer();
  }

  protected submit(): void {
    this.#stopTimer();
    this.store.submit();
  }

  protected retake(): void {
    this.store.retake();
    const quiz = this.store.selected();
    if (quiz) this.remaining.set(quiz.durationMinutes * 60);
    this.#startTimer();
  }

  protected exit(): void {
    this.#stopTimer();
    this.store.exit();
  }

  #startTimer(): void {
    this.#stopTimer();
    if (!this.#isBrowser) return;
    this.#intervalId = setInterval(() => {
      const next = this.remaining() - 1;
      if (next <= 0) {
        this.remaining.set(0);
        this.submit();
      } else {
        this.remaining.set(next);
      }
    }, 1000);
  }

  #stopTimer(): void {
    if (this.#intervalId !== null) {
      clearInterval(this.#intervalId);
      this.#intervalId = null;
    }
  }
}
