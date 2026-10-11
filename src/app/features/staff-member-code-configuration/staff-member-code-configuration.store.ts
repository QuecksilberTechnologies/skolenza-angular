import { computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { finalize } from 'rxjs';

import { ApiError, Common, InstitutionsApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import {
  StaffMemberCodePattern,
  StaffMemberCodePatternPreview,
  StaffMemberCodePatternPreviewRow,
  SaveStaffMemberCodePatternReq,
} from '@shared/interfaces';

/** The leaf `GET /Navigation/my-menu` publishes this screen under. */
const MODULE_CODE = 'INSTITUTION_STAFF_CODE';

/** A stale preview answers 409, and the only cure is taking a fresh one. */
const PREVIEW_STALE = 409;

interface StaffMemberCodeConfigurationState {
  institutionId: string | null;
  /** `null` until the read resolves; `false` there means the institution has no pattern yet. */
  hasExistingPattern: boolean | null;
  existingPattern: StaffMemberCodePattern | null;
  preview: StaffMemberCodePatternPreview | null;
  /** The pattern the current preview was taken for, so confirm cannot send a different one. */
  previewedPattern: StaffMemberCodePattern | null;
  /** Starts `true` so the form never flashes its defaults before the pattern in place arrives. */
  isLoading: boolean;
  isPreviewing: boolean;
  isApplying: boolean;
}

const initialState: StaffMemberCodeConfigurationState = {
  institutionId: null,
  hasExistingPattern: null,
  existingPattern: null,
  preview: null,
  previewedPattern: null,
  isLoading: true,
  isPreviewing: false,
  isApplying: false,
};

export const StaffMemberCodeConfigurationStore = signalStore(
  withState(initialState),
  withComputed(({ preview, previewedPattern, existingPattern, hasExistingPattern }) => {
    const rows = computed<StaffMemberCodePatternPreviewRow[]>(() => preview()?.staffMembers ?? []);
    /** Rows whose code actually changes, so the user can judge the blast radius before applying. */
    const changedCount = computed(
      () => rows().filter((row) => row.currentCode !== row.proposedCode).length,
    );

    return {
      rows,
      changedCount,
      /**
       * The previewed pattern is the one already saved and no code would change, so Apply would do
       * nothing. A first-ever pattern is never a no-op: it still has to be saved.
       */
      isNoOp: computed(() => {
        const previewed = previewedPattern();
        const existing = existingPattern();
        if (!hasExistingPattern() || !previewed || !existing || changedCount() > 0) return false;

        // The read returns the length as a number where the form holds a string.
        return (
          previewed.prefix === existing.prefix &&
          previewed.separator === existing.separator &&
          String(previewed.runningNumberLength) === String(existing.runningNumberLength) &&
          previewed.includeYear === existing.includeYear &&
          previewed.includeMonth === existing.includeMonth &&
          previewed.includeDepartment === existing.includeDepartment
        );
      }),
      /** Rows the backend flagged, usually a missing or unreadable joining date. */
      issueCount: computed(
        () => (preview()?.staffMembers ?? []).filter((row) => (row.errors?.length ?? 0) > 0).length,
      ),
      lastUsedNumber: computed(() => preview()?.lastUsedNumber ?? null),
      /** The backend's own gate on the Apply button. */
      canCommit: computed(() => preview()?.canCommit === true),
      hasPreview: computed(() => previewedPattern() !== null),
      /**
       * Rows came back but none of them carries a field this screen knows how to show. Swagger
       * publishes no response schema for these routes, so a drift is possible - and it has to be
       * visible rather than rendering a table of dashes that looks like "no changes".
       */
      isRowShapeUnknown: computed(() => {
        const rows = preview()?.staffMembers ?? [];
        if (rows.length === 0) return false;

        return !rows.some(
          (row) => row.currentCode != null || row.proposedCode != null || row.name != null,
        );
      }),
    };
  }),
  withMethods((store) => {
    const institutionsApi = inject(InstitutionsApi);
    const commonService = inject(Common);
    const featurePageStore = inject(FeaturePageStore);
    const destroyRef = inject(DestroyRef);

    /**
     * Resolved per call rather than once: this screen can render before `my-menu` has been read,
     * and POST wants `Add` where PUT wants `Update`.
     */
    const ids = (operationName: string) => {
      const { ModuleId, OperationId } = featurePageStore.moduleOperationIds(
        MODULE_CODE,
        operationName,
      );
      return { moduleId: ModuleId, operationId: OperationId };
    };

    /**
     * Refuses to send when the tree publishes no id for this screen.
     *
     * Sending `moduleId: undefined` is not the same as sending nothing: `withBodyIdentifiers` fills
     * an undefined key from the `institution` controller fallback, so the write would be authorised
     * against `HOST_INSTITUTION_LIST` / `Update` instead of the staff-member-code module. Failing loudly is
     * the only safe answer.
     */
    const resolved = (operationName: string) => {
      const identifiers = ids(operationName);
      if (identifiers.moduleId === undefined || identifiers.operationId === undefined) {
        commonService.showMessage(
          'This session has no permission entry for staffMember code configuration, so the change cannot be sent.',
          'error',
        );
        return null;
      }
      return identifiers;
    };

    /** A institution with no pattern yet creates one with POST; everyone else changes theirs with PUT. */
    const save = (body: SaveStaffMemberCodePatternReq) =>
      store.hasExistingPattern()
        ? institutionsApi.updateStaffMemberCodePattern(body)
        : institutionsApi.addStaffMemberCodePattern(body);

    const operationFor = () => (store.hasExistingPattern() ? 'Update' : 'Add');

    return {
      setInstitutionId(institutionId: string | null): void {
        patchState(store, { institutionId });
      },

      /** Reads the pattern in place, so the form opens on it rather than on an empty default. */
      loadExistingPattern(): void {
        const institutionId = store.institutionId();
        if (!institutionId) {
          patchState(store, { isLoading: false });
          return;
        }

        patchState(store, { isLoading: true });

        institutionsApi
          .getStaffMemberCodePattern(institutionId)
          .pipe(
            finalize(() => patchState(store, { isLoading: false })),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              const existingPattern = res.isSucceeded ? res.data : null;
              patchState(store, { existingPattern, hasExistingPattern: !!existingPattern });
            },
            // A institution that has never had a pattern is the create case, not an error to shout about.
            error: () => patchState(store, { existingPattern: null, hasExistingPattern: false }),
          });
      },

      /** Sends `confirm: false` and keeps the pattern the answer belongs to. */
      preview(pattern: StaffMemberCodePattern): void {
        if (store.isPreviewing() || store.isApplying()) return;

        const identifiers = resolved(operationFor());
        if (!identifiers) return;

        patchState(store, { isPreviewing: true, preview: null, previewedPattern: null });

        save({ pattern, confirm: false, ...identifiers })
          .pipe(
            finalize(() => patchState(store, { isPreviewing: false })),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (!res.isSucceeded) {
                commonService.showMessage(res.message, 'error');
                return;
              }
              patchState(store, { preview: res.data, previewedPattern: pattern });
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      /**
       * Confirms the preview the user actually saw: the same pattern, plus its hash. A 409 means
       * the preview went stale, so it is discarded and the user is asked to take a new one instead
       * of the app quietly re-previewing and committing something unseen.
       */
      apply(onApplied: () => void): void {
        const pattern = store.previewedPattern();
        const previewHash = store.preview()?.previewHash ?? null;
        if (!pattern || !store.canCommit() || store.isApplying()) return;

        const identifiers = resolved(operationFor());
        if (!identifiers) return;

        patchState(store, { isApplying: true });

        save({ pattern, confirm: true, previewHash, ...identifiers })
          .pipe(
            finalize(() => patchState(store, { isApplying: false })),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
              if (!res.isSucceeded) return;

              patchState(store, {
                preview: null,
                previewedPattern: null,
                existingPattern: pattern,
                hasExistingPattern: true,
              });
              onApplied();
            },
            error: (err: ApiError) => {
              if (err.status === PREVIEW_STALE) {
                patchState(store, { preview: null, previewedPattern: null });
                commonService.showMessage(
                  'The preview is out of date because the staffMember list changed. Preview again before applying.',
                  'warn',
                );
                return;
              }
              commonService.showMessage(err.message, 'error');
            },
          });
      },

      /** Editing the pattern invalidates the preview it was taken for. */
      clearPreview(): void {
        if (store.previewedPattern() === null && store.preview() === null) return;
        patchState(store, { preview: null, previewedPattern: null });
      },
    };
  }),
);

