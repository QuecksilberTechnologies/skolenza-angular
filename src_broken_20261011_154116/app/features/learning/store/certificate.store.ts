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

import { Common, LearningCertificateApi } from '@core/services';
import { Certificate } from '@shared/interfaces';

interface CertificateState {
  certificates: Certificate[];
}

const initialState: CertificateState = {
  certificates: [],
};

export const CertificateStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const certificateApi = inject(LearningCertificateApi);
    const commonService = inject(Common);

    const certificatesResource = rxResource({
      stream: () =>
        certificateApi.getCertificates().pipe(
          tap((res) => {
            if (!res.isSucceeded) commonService.showMessage(res.message, 'error');
            patchState(store, { certificates: res.isSucceeded ? res.data : [] });
          }),
          map((res) => res.data),
        ),
    });

    return { certificatesResource };
  }),
  withComputed(({ certificatesResource }) => ({
    isLoading: computed(() => certificatesResource.isLoading()),
  })),
  withMethods((store) => ({
    reload: (): void => {
      store.certificatesResource.reload();
    },
  })),
);
