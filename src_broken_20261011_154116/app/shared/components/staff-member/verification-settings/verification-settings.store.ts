import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

import { CompletionPercentage } from '@shared/interfaces';

interface VerificationSettingsState {
  completionPercentages: CompletionPercentage[];
  isLoadingPercentages: boolean;
  isSavingBulkUpdate: boolean;
}

const initialState: VerificationSettingsState = {
  completionPercentages: [],
  isLoadingPercentages: false,
  isSavingBulkUpdate: false,
};

export const VerificationSettingsStore = signalStore(
  withState(initialState),
  withMethods((store) => ({
    setCompletionPercentages(data: CompletionPercentage[]) {
      patchState(store, { completionPercentages: data });
    },
    setIsLoadingPercentages(value: boolean) {
      patchState(store, { isLoadingPercentages: value });
    },
    setIsSavingBulkUpdate(value: boolean) {
      patchState(store, { isSavingBulkUpdate: value });
    },
  })),
);
