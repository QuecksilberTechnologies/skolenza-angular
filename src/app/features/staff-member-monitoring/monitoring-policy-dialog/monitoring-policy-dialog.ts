import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, submit, validateStandardSchema } from '@angular/forms/signals';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { finalize } from 'rxjs';

import { Common } from '@core/services';
import { FormActionBar } from '@shared/components/form-action-bar/form-action-bar';
import { FormNumber } from '@shared/components/form-inputs/form-number/form-number';
import { FormSwitch } from '@shared/components/form-inputs/form-switch/form-switch';
import { MonitoringPolicy } from '@shared/interfaces';

import { StaffMemberMonitoringApi } from '../staff-member-monitoring-api';
import { MonitoringPolicyModel, monitoringPolicySchema } from './monitoring-policy-dialog.schema';

const BYTES_PER_GB = 1024 ** 3;

/** The backend handoff's reference policy, used until one is saved in this session. */
export const DEFAULT_MONITORING_POLICY: MonitoringPolicy = {
  minimumCaptureIntervalSeconds: 300,
  maximumCaptureIntervalSeconds: 600,
  heartbeatIntervalSeconds: 60,
  delayedAfterSeconds: 180,
  unreachableAfterSeconds: 600,
  offlineRetentionDays: 3,
  maximumOfflineBytes: 2 * BYTES_PER_GB,
  imageQuality: 70,
  captureAllMonitors: true,
};

/**
 * Creates or replaces the Institution's monitoring policy. Closes with the saved `MonitoringPolicy`.
 *
 * `moduleId` / `operationId` are added by `moduleOperationInterceptor` (`STAFF_DEVICE_ENROLMENTS` / Assign).
 */
@Component({
  selector: 'app-monitoring-policy-dialog',
  imports: [FormActionBar, FormNumber, FormSwitch],
  templateUrl: './monitoring-policy-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class MonitoringPolicyDialog {
  readonly #api = inject(StaffMemberMonitoringApi);
  readonly #commonService = inject(Common);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #destroyRef = inject(DestroyRef);

  readonly #policy =
    (inject(DynamicDialogConfig).data?.policy as MonitoringPolicy | null) ??
    DEFAULT_MONITORING_POLICY;

  protected readonly isSaving = signal(false);
  /** Flipped by the first submit attempt, so every outstanding error surfaces at once. */
  protected readonly submitted = signal(false);

  protected readonly model = signal<MonitoringPolicyModel>({
    minimumCaptureIntervalSeconds: this.#policy.minimumCaptureIntervalSeconds,
    maximumCaptureIntervalSeconds: this.#policy.maximumCaptureIntervalSeconds,
    heartbeatIntervalSeconds: this.#policy.heartbeatIntervalSeconds,
    delayedAfterSeconds: this.#policy.delayedAfterSeconds,
    unreachableAfterSeconds: this.#policy.unreachableAfterSeconds,
    offlineRetentionDays: this.#policy.offlineRetentionDays,
    maximumOfflineGb: this.#policy.maximumOfflineBytes / BYTES_PER_GB,
    imageQuality: this.#policy.imageQuality,
    captureAllMonitors: this.#policy.captureAllMonitors,
  });

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, monitoringPolicySchema);
  });

  onSubmit(): void {
    if (this.isSaving()) return;

    this.submitted.set(true);
    this.f().markAsTouched();
    if (this.f().invalid()) return;

    submit(this.f, async () => {
      const { maximumOfflineGb, ...rest } = this.model();
      // The schema has rejected every null by now.
      const body = {
        ...rest,
        maximumOfflineBytes: Math.round(maximumOfflineGb! * BYTES_PER_GB),
      } as MonitoringPolicy;

      this.isSaving.set(true);
      this.#api
        .upsertPolicy(body)
        .pipe(
          finalize(() => this.isSaving.set(false)),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: (res) => {
            this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            if (res.isSucceeded) this.#dialogRef.close(res.data ?? body);
          },
          error: (err) => this.#commonService.showMessage(err.message, 'error'),
        });
    });
  }

  onCancel(): void {
    this.#dialogRef.close();
  }
}

