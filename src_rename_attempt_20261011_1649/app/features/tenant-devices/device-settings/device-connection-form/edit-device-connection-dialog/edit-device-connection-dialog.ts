import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';

import { InstitutionDeviceConfigurationRow } from '@shared/interfaces';

import { DeviceConnectionForm } from '../device-connection-form';

export interface EditDeviceConnectionDialogData {
  institutionId: string;
  institutionDeviceId: string;
  deviceName: string | null;
  existing: InstitutionDeviceConfigurationRow;
}

/**
 * Thin `DialogService` host around `DeviceConnectionForm` for the "edit an existing connection"
 * case. The inline page embeds the form directly for "create"; editing opens it here instead so the
 * settings tabs underneath do not have to make room for the whole form.
 *
 * Closes with `true` on save so the opener knows to reload telemetry, `false` on cancel.
 */
@Component({
  selector: 'app-edit-device-connection-dialog',
  imports: [DeviceConnectionForm],
  template: `
    <app-device-connection-form
      dialog
      [institutionId]="data.institutionId"
      [institutionDeviceId]="data.institutionDeviceId"
      [deviceName]="data.deviceName"
      [existing]="data.existing"
      (saved)="onSaved()"
      (cancelled)="onCancel()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditDeviceConnectionDialog {
  readonly #dialogRef = inject(DynamicDialogRef);

  protected readonly data = inject(DynamicDialogConfig).data as EditDeviceConnectionDialogData;

  onSaved(): void {
    this.#dialogRef.close(true);
  }

  onCancel(): void {
    this.#dialogRef.close(false);
  }
}
