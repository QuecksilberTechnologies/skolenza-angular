import { Clipboard } from '@angular/cdk/clipboard';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, submit, validateStandardSchema } from '@angular/forms/signals';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { finalize } from 'rxjs';

import { Common } from '@core/services';
import { FormSelect } from '@shared/components/form-inputs/form-select/form-select';
import { FormText } from '@shared/components/form-inputs/form-text/form-text';
import { AgentRegistration, MonitoredStaffMember } from '@shared/interfaces';

import { StaffMemberMonitoringApi } from '../staffMember-monitoring-api';
import { RegisterAgentModel, registerAgentSchema } from './register-agent-dialog.schema';

/**
 * Registers an staffMember's PC agent and shows the credential the API returns exactly once.
 *
 * Two phases in one component, like `DeviceBootstrapDialog`: the form, then the credential. The
 * result replaces the form rather than closing the dialog, since closing would destroy the only
 * copy. Closes with the `AgentRegistration` so the page can refresh statuses and the policy; the
 * caller must not keep `agentCredential`.
 *
 * `moduleId` / `operationId` are added by `moduleOperationInterceptor` (`STAFF_DEVICE_ENROLMENTS` / Assign).
 */
@Component({
  selector: 'app-register-agent-dialog',
  imports: [ButtonModule, TooltipModule, FormSelect, FormText],
  templateUrl: './register-agent-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class RegisterAgentDialog {
  readonly #api = inject(StaffMemberMonitoringApi);
  readonly #commonService = inject(Common);
  readonly #dialogConfig = inject(DynamicDialogConfig);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #destroyRef = inject(DestroyRef);
  readonly #clipboard = inject(Clipboard);

  protected readonly staffMembers = (this.#dialogConfig.data?.staffMembers ?? []) as MonitoredStaffMember[];

  protected readonly isSaving = signal(false);
  /** Flipped by the first submit attempt, so every outstanding error surfaces at once. */
  protected readonly submitted = signal(false);
  /** Non-null once the agent is registered - the dialog's second phase. */
  protected readonly result = signal<AgentRegistration | null>(null);
  protected readonly hasCopied = signal(false);

  protected readonly model = signal<RegisterAgentModel>({
    staffMemberId: (this.#dialogConfig.data?.staffMemberId as string | null) ?? '',
    deviceName: '',
  });

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, registerAgentSchema);
  });

  onSubmit(): void {
    if (this.isSaving()) return;

    this.submitted.set(true);
    this.f().markAsTouched();
    if (this.f().invalid()) return;

    submit(this.f, async () => {
      const { staffMemberId, deviceName } = this.model();
      this.isSaving.set(true);

      this.#api
        .registerAgent({ staffMemberId, deviceName: deviceName.trim() })
        .pipe(
          finalize(() => this.isSaving.set(false)),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: (res) => {
            if (res.isSucceeded && res.data) {
              this.result.set(res.data);
              return;
            }
            this.#commonService.showMessage(res.message, 'error');
          },
          error: (err) => this.#commonService.showMessage(err.message, 'error'),
        });
    });
  }

  copyCredential(credential: string): void {
    this.#clipboard.copy(credential);
    this.hasCopied.set(true);
    this.#commonService.showMessage(
      'Agent credential copied. Enter it in the agent now.',
      'success',
    );
  }

  onClose(): void {
    this.#dialogRef.close(this.result() ?? undefined);
  }
}

