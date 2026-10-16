import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { TagModule } from '@openng/optimus-ui/tag';

import { Common } from '@core/services';
import { InstitutionDeviceRow } from '@shared/interfaces';

interface DetailItem {
  label: string;
  value: string;
  /** Sub-identifier printed under the value, the way the grid prints a code under its name. */
  sub?: string;
}

interface DetailSection {
  title: string;
  items: DetailItem[];
}

/** The sanctioned empty-value placeholder. */
const EMPTY = '—';

const text = (value: string | number | null | undefined): string =>
  value === null || value === undefined || value === '' ? EMPTY : `${value}`;

/**
 * Read-only device summary for the row detail sheet.
 *
 * The grid shows seven columns; the installation stamp, the notes and the joined-in location and
 * model codes stay reachable here. Connection settings are not part of this record — they live on
 * the device's `InstitutionDeviceConfiguration`.
 */
@Component({
  selector: 'app-institution-device-detail',
  imports: [ButtonModule, TagModule],
  templateUrl: './institution-device-detail.html',
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstitutionDeviceDetail {
  readonly #commonService = inject(Common);

  readonly device = input<InstitutionDeviceRow | undefined>();
  readonly canUpdate = input(false);
  readonly closePopup = output();
  readonly edit = output();

  /** The template greys a value that is only this placeholder. */
  protected readonly emptyValue = EMPTY;

  /**
   * The chip strip owns status, attendance and configuration, and the header owns the device name
   * and code — none of the four is repeated down here.
   */
  protected readonly sections = computed<DetailSection[]>(() => {
    const device = this.device();
    if (!device) {
      return [];
    }

    return [
      {
        title: 'Assignment',
        items: [
          { label: 'Institution', value: text(device.institutionName ?? device.institutionId) },
          {
            label: 'Location',
            value: text(device.campusName ?? device.campusId),
            sub: device.locationCode ?? undefined,
          },
          {
            label: 'Device Model',
            value: text(device.deviceMasterName ?? device.deviceMasterId),
            sub: device.deviceMasterModelNo ?? undefined,
          },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Installed On', value: this.#dateTime(device.installedDateTime) },
          { label: 'Installed By', value: text(device.installedBy) },
          { label: 'Installation Note', value: text(device.installationRemark) },
        ],
      },
      {
        title: 'Notes',
        items: [
          { label: 'Description', value: text(device.description) },
          { label: 'Remark', value: text(device.remark) },
        ],
      },
    ];
  });

  #dateTime(value: string | null | undefined): string {
    return value ? this.#commonService.getFormattedDate(value, 'dd MMM yyyy, HH:mm') : EMPTY;
  }

  onCancel() {
    this.closePopup.emit();
  }

  onEdit() {
    this.edit.emit();
  }
}
