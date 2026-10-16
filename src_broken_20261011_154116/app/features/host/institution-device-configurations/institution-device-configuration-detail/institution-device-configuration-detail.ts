import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { TagModule } from '@openng/optimus-ui/tag';

import { Common } from '@core/services';
import { InstitutionDeviceConfigurationRow } from '@shared/interfaces';
import { DEVICE_COMMUNICATION_TYPES } from '@shared/utilities/common-data';

interface DetailItem {
  label: string;
  value: string;
  /** Spans both grid columns. For values the 480px panel cannot fit in half its width. */
  fullWidth?: boolean;
  /** Renders as a code block — preserves the newlines the pretty-printer puts in. */
  mono?: boolean;
}

interface DetailSection {
  title: string;
  items: DetailItem[];
}

/** The sanctioned empty-value placeholder. Named so the template can paint it as a placeholder. */
const EMPTY = '—';

const text = (value: string | number | null | undefined): string =>
  value === null || value === undefined || value === '' ? EMPTY : `${value}`;

/**
 * The form accepts JSON *or* `key=value` lines, so anything that does not parse is shown as the
 * host typed it rather than swallowed.
 */
const formatConfiguration = (value: string | null | undefined): string => {
  if (!value) {
    return EMPTY;
  }

  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
};

/**
 * Read-only configuration summary for the row detail sheet.
 *
 * The grid shows six columns; the connection telemetry, the server path, push mode, heartbeat and
 * the raw `configuration` blob stay reachable here.
 */
@Component({
  selector: 'app-institution-device-configuration-detail',
  imports: [ButtonModule, TagModule],
  templateUrl: './institution-device-configuration-detail.html',
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstitutionDeviceConfigurationDetail {
  readonly #commonService = inject(Common);

  readonly configuration = input<InstitutionDeviceConfigurationRow | undefined>();
  /** The row carries only `institutionId`; the grid holds the lookup, so the name travels as an input. */
  readonly institutionName = input<string>();
  readonly canRotate = input(false);
  readonly closePopup = output();
  readonly rotate = output();

  /** So the template can render an absent value as a placeholder rather than as content. */
  protected readonly emptyValue = EMPTY;

  protected readonly communicationTypeLabel = computed(
    () =>
      DEVICE_COMMUNICATION_TYPES.find((type) => type.id === this.configuration()?.communicationType)
        ?.label ?? EMPTY,
  );

  protected readonly sections = computed<DetailSection[]>(() => {
    const configuration = this.configuration();
    if (!configuration) {
      return [];
    }

    return [
      // First, because "is this device actually reaching us?" is what the sheet is opened to answer.
      { title: 'Connection', items: this.#connectionItems(configuration) },
      {
        title: 'Assignment',
        items: [
          { label: 'Institution', value: text(this.institutionName() || configuration.institutionId) },
          {
            label: 'Device',
            value: text(configuration.deviceName ?? configuration.institutionDeviceId),
          },
          { label: 'Device Code', value: text(configuration.deviceCode) },
          { label: 'Model', value: text(configuration.deviceMasterName) },
          { label: 'Serial No', value: text(configuration.deviceMasterSNo) },
        ],
      },
      // Communication type is not repeated here — the chip strip above owns it.
      {
        title: 'Network',
        items: [
          { label: 'IP Address', value: text(configuration.ipAddress) },
          { label: 'MAC Address', value: text(configuration.macAddress) },
          { label: 'Device Port', value: text(configuration.devicePort) },
          { label: 'Time Zone', value: text(configuration.timeZoneId) },
        ],
      },
      {
        title: 'Server',
        items: [
          { label: 'Server Host', value: text(configuration.serverHost) },
          { label: 'Server Port', value: text(configuration.serverPort) },
          { label: 'Server Path', value: text(configuration.serverPath) },
          { label: 'Push Mode', value: text(configuration.pushMode) },
          { label: 'Heartbeat (seconds)', value: text(configuration.heartbeatIntervalSeconds) },
          { label: 'Server URL', value: text(configuration.serverUrl), fullWidth: true },
        ],
      },
      // The three behaviour toggles live in the chip strip, so only the blob is left down here.
      {
        title: 'Custom Settings',
        items: [
          {
            label: 'Configuration',
            value: formatConfiguration(configuration.configuration),
            fullWidth: true,
            mono: true,
          },
        ],
      },
    ];
  });

  onCancel() {
    this.closePopup.emit();
  }

  onRotate() {
    this.rotate.emit();
  }

  /**
   * A device that has never called home would otherwise fill the tallest block on the sheet with
   * six em dashes, so the empty case says so once. Labels stay short enough not to wrap in the
   * ~200px column the 480px panel leaves them, and the failure pair only appears when there is one.
   */
  #connectionItems(configuration: InstitutionDeviceConfigurationRow): DetailItem[] {
    const hasFailure =
      !!configuration.lastFailedConnectionDateTime || !!configuration.lastConnectionError;
    const hasActivity =
      hasFailure ||
      !!configuration.lastSyncDateTime ||
      !!configuration.lastHeartbeatDateTime ||
      !!configuration.lastAttendanceReceivedDateTime ||
      !!configuration.lastSuccessfulConnectionDateTime;

    if (!hasActivity) {
      return [{ label: 'Status', value: 'No connection activity reported yet.', fullWidth: true }];
    }

    const items: DetailItem[] = [
      { label: 'Last Sync', value: this.#dateText(configuration.lastSyncDateTime) },
      { label: 'Last Heartbeat', value: this.#dateText(configuration.lastHeartbeatDateTime) },
      {
        label: 'Last Attendance',
        value: this.#dateText(configuration.lastAttendanceReceivedDateTime),
      },
      {
        label: 'Last Connected',
        value: this.#dateText(configuration.lastSuccessfulConnectionDateTime),
      },
    ];

    if (hasFailure) {
      items.push(
        {
          label: 'Last Failure',
          value: this.#dateText(configuration.lastFailedConnectionDateTime),
        },
        { label: 'Error', value: text(configuration.lastConnectionError), fullWidth: true },
      );
    }

    return items;
  }

  #dateText(value: string | null | undefined): string {
    return value ? text(this.#commonService.getFormattedDate(value, 'dd MMM yyyy, HH:mm')) : EMPTY;
  }
}
