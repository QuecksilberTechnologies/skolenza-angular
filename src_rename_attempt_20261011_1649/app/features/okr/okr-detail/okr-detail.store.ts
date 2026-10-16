import { computed, DestroyRef, inject } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { map, of, tap } from 'rxjs';

import { Common, OkrApi } from '@core/services';
import { IOkrAttachment, IOkrComment } from '@shared/interfaces';

interface OkrDetailState {
  okrId: string;
  comments: IOkrComment[];
  attachments: IOkrAttachment[];
}

const initialState: OkrDetailState = {
  okrId: '',
  comments: [],
  attachments: [],
};

export const OkrDetailStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const okrApi = inject(OkrApi);

    const okrResource = rxResource({
      params: () => store.okrId(),
      stream: ({ params }) =>
        params ? okrApi.getOkr(params).pipe(map((res) => res.data)) : of(null),
    });

    const extrasResource = rxResource({
      params: () => store.okrId(),
      stream: ({ params }) =>
        params
          ? okrApi.getOkrDetailExtras(params).pipe(
              tap((res) => {
                if (res.isSucceeded) {
                  patchState(store, {
                    comments: res.data.comments,
                    attachments: res.data.attachments,
                  });
                }
              }),
              map((res) => res.data),
            )
          : of(null),
    });

    return { okrResource, extrasResource };
  }),
  withComputed(({ okrResource, extrasResource }) => ({
    // `value()` throws in the error status and would abort change detection for the whole
    // page; `hasValue()` short-circuits, so an outage stays distinguishable from a 404.
    okr: computed(() => (okrResource.hasValue() ? okrResource.value() : null)),
    extras: computed(() => (extrasResource.hasValue() ? extrasResource.value() : null)),
    hasLoadError: computed(() => okrResource.status() === 'error'),
    isLoading: computed(() => okrResource.isLoading() || extrasResource.isLoading()),
  })),
  withMethods((store) => {
    const commonService = inject(Common);
    const okrApi = inject(OkrApi);
    const destroyRef = inject(DestroyRef);

    return {
      setOkrId(id: string): void {
        patchState(store, { okrId: id });
      },

      reload(): void {
        store.okrResource.reload();
        store.extrasResource.reload();
      },

      downloadAttachment(attachment: IOkrAttachment): void {
        okrApi
          .downloadAttachment(attachment)
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe((res) =>
            commonService.showMessage(res.message, res.isSucceeded ? 'info' : 'error'),
          );
      },

      uploadAttachment(file: File): void {
        okrApi
          .uploadAttachment(store.okrId(), file)
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe((res) => {
            if (res.isSucceeded) {
              patchState(store, { attachments: [res.data, ...store.attachments()] });
            }
            commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          });
      },

      async addComment(message: string): Promise<void> {
        const text = message.trim();
        if (!text) return;
        const loginInfo = await commonService.getLoginInfo();
        const author = loginInfo?.user?.fullName ?? 'You';
        const initials = author
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase();

        const comment: IOkrComment = {
          id: `cmt-${Date.now()}`,
          author,
          initials,
          message: text,
          createdAt: new Date().toISOString(),
        };
        patchState(store, { comments: [comment, ...store.comments()] });
        commonService.showMessage('Comment added', 'success');
      },
    };
  }),
);
