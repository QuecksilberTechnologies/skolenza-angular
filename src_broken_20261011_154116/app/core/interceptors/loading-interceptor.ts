import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';

import { LoadingStore } from '@core/services/loading-store';

export const SKIP_LOADING = new HttpContextToken<boolean>(() => false);

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingStore = inject(LoadingStore);

  // Check if request should skip loading indicator
  const skipLoading = req.context.get(SKIP_LOADING);

  if (!skipLoading) {
    loadingStore.busy();
  }

  return next(req).pipe(
    finalize(() => {
      if (!skipLoading) {
        loadingStore.idle();
      }
    }),
  );
};
