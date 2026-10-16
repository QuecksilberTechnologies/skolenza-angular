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
import { Assessment, QuizResult } from '@shared/interfaces';

interface AssessmentState {
  assessments: Assessment[];
  selectedId: string | null;
  answers: Record<string, number>;
  currentIndex: number;
  submitted: boolean;
}

const initialState: AssessmentState = {
  assessments: [],
  selectedId: null,
  answers: {},
  currentIndex: 0,
  submitted: false,
};

export const AssessmentStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const learningApi = inject(LearningApi);
    const commonService = inject(Common);

    const assessmentsResource = rxResource({
      stream: () =>
        learningApi.getAssessments().pipe(
          tap((res) => {
            if (!res.isSucceeded) commonService.showMessage(res.message, 'error');
            patchState(store, { assessments: res.isSucceeded ? res.data : [] });
          }),
          map((res) => res.data),
        ),
    });

    return { assessmentsResource };
  }),
  withComputed(
    ({ assessments, selectedId, answers, currentIndex, submitted, assessmentsResource }) => {
      const selected = computed(() => assessments().find((a) => a.id === selectedId()) ?? null);
      const questions = computed(() => selected()?.questions ?? []);
      const result = computed<QuizResult | null>(() => {
        const quiz = selected();
        if (!quiz || !submitted()) return null;
        const total = quiz.questions.length;
        const correct = quiz.questions.filter((q) => answers()[q.id] === q.correctIndex).length;
        const score = total ? Math.round((correct / total) * 100) : 0;
        return { score, correct, total, passed: score >= quiz.passingScore };
      });

      return {
        isLoading: computed(() => assessmentsResource.isLoading()),
        selected,
        questions,
        currentQuestion: computed(() => questions()[currentIndex()] ?? null),
        answeredCount: computed(() => Object.keys(answers()).length),
        isLast: computed(() => currentIndex() >= questions().length - 1),
        isFirst: computed(() => currentIndex() === 0),
        result,
      };
    },
  ),
  withMethods((store) => {
    const learningApi = inject(LearningApi);
    return {
      select(id: string): void {
        patchState(store, { selectedId: id, answers: {}, currentIndex: 0, submitted: false });
      },
      exit(): void {
        patchState(store, { selectedId: null, answers: {}, currentIndex: 0, submitted: false });
      },
      answer(questionId: string, optionIndex: number): void {
        patchState(store, { answers: { ...store.answers(), [questionId]: optionIndex } });
      },
      next(): void {
        const max = store.questions().length - 1;
        patchState(store, { currentIndex: Math.min(store.currentIndex() + 1, max) });
      },
      prev(): void {
        patchState(store, { currentIndex: Math.max(store.currentIndex() - 1, 0) });
      },
      goTo(index: number): void {
        patchState(store, { currentIndex: index });
      },
      submit(): void {
        patchState(store, { submitted: true });
        const quiz = store.selected();
        if (!quiz) return;
        const total = quiz.questions.length;
        const correct = quiz.questions.filter(
          (q) => store.answers()[q.id] === q.correctIndex,
        ).length;
        const score = total ? Math.round((correct / total) * 100) : 0;
        learningApi
          .submitQuiz({ score, correct, total, passed: score >= quiz.passingScore })
          .subscribe();
      },
      retake(): void {
        patchState(store, { answers: {}, currentIndex: 0, submitted: false });
      },
    };
  }),
);
