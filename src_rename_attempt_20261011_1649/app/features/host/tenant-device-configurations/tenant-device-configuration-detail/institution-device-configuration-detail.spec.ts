import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { vi } from 'vitest';

import { DeviceCommunicationType, InstitutionDeviceConfigurationRow } from '@shared/interfaces';

import { InstitutionDeviceConfigurationDetail } from './institution-device-configuration-detail';

function createConfiguration(
  overrides: Partial<InstitutionDeviceConfigurationRow> = {},
): InstitutionDeviceConfigurationRow {
  return {
    id: 1,
    institutionId: 'TEN00005',
    institutionDeviceId: '9',
    ipAddress: '192.168.1.50',
    macAddress: null,
    devicePort: 4370,
    communicationType: DeviceCommunicationType.Wss,
    serverHost: null,
    serverPort: null,
    serverPath: null,
    serverUrl: null,
    pushMode: null,
    heartbeatIntervalSeconds: null,
    timeZoneId: null,
    configuration: null,
    isEnrollmentEnabled: false,
    isAttendancePushEnabled: false,
    isAutoSyncEnabled: false,
    ...overrides,
  };
}

describe('InstitutionDeviceConfigurationDetail', () => {
  let fixture: ComponentFixture<InstitutionDeviceConfigurationDetail>;

  /** `sections` is protected; bracket access is the sanctioned escape hatch. */
  const sections = () =>
    fixture.componentInstance['sections']() as {
      title: string;
      items: { label: string; value: string; fullWidth?: boolean; mono?: boolean }[];
    }[];

  const itemValue = (sectionTitle: string, label: string) =>
    sections()
      .find((section) => section.title === sectionTitle)
      ?.items.find((item) => item.label === label);

  const render = async (
    configuration?: InstitutionDeviceConfigurationRow,
    institutionName?: string,
    canRotate = false,
  ) => {
    fixture = TestBed.createComponent(InstitutionDeviceConfigurationDetail);
    fixture.componentRef.setInput('configuration', configuration);
    fixture.componentRef.setInput('institutionName', institutionName);
    fixture.componentRef.setInput('canRotate', canRotate);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InstitutionDeviceConfigurationDetail],
      providers: [MessageService, DatePipe],
    }).compileComponents();
  });

  it('renders no sections without a configuration', async () => {
    await render(undefined);

    expect(sections()).toEqual([]);
  });

  it('leads with Connection, the question the sheet is opened to answer', async () => {
    await render(createConfiguration());

    expect(sections()[0].title).toBe('Connection');
  });

  it('formats connection telemetry and falls back to the em dash when it is missing', async () => {
    await render(
      createConfiguration({
        lastSyncDateTime: '2026-08-29T14:30:00',
        lastHeartbeatDateTime: null,
      }),
    );

    expect(itemValue('Connection', 'Last Sync')?.value).toBe('29 Aug 2026, 14:30');
    expect(itemValue('Connection', 'Last Heartbeat')?.value).toBe('—');
  });

  it('prefers the institution name over the raw id, and falls back to the id', async () => {
    await render(createConfiguration(), 'TechNova Solutions');
    expect(itemValue('Assignment', 'Institution')?.value).toBe('TechNova Solutions');

    await render(createConfiguration());
    expect(itemValue('Assignment', 'Institution')?.value).toBe('TEN00005');
  });

  it('leaves the strip facts to the strip', async () => {
    await render(createConfiguration({ isEnrollmentEnabled: true }));

    const labels = sections().flatMap((section) => section.items.map((item) => item.label));

    expect(labels).not.toContain('Communication Type');
    expect(labels).not.toContain('Enrollment Enabled');
    expect(labels).not.toContain('Attendance Push');
    expect(labels).not.toContain('Auto Sync');
  });

  it('pretty-prints a JSON configuration as a full-width code block', async () => {
    await render(createConfiguration({ configuration: '{"batchSize":100,"sslEnabled":true}' }));

    const item = itemValue('Custom Settings', 'Configuration');

    expect(item?.value).toBe('{\n  "batchSize": 100,\n  "sslEnabled": true\n}');
    expect(item?.fullWidth).toBe(true);
    expect(item?.mono).toBe(true);
  });

  it('shows a non-JSON configuration exactly as it was typed', async () => {
    await render(createConfiguration({ configuration: 'batchSize=100\nsslEnabled=true' }));

    expect(itemValue('Custom Settings', 'Configuration')?.value).toBe(
      'batchSize=100\nsslEnabled=true',
    );
  });

  it('gives the long values a full-width cell so the 480px panel can hold them', async () => {
    await render(
      createConfiguration({
        serverUrl: 'https://hrms-api.technova.example/api/v1/attendance',
        lastConnectionError: 'ECONNREFUSED after 3 retries',
      }),
    );

    expect(itemValue('Server', 'Server URL')?.fullWidth).toBe(true);
    expect(itemValue('Connection', 'Error')?.fullWidth).toBe(true);
  });

  it('says so once instead of showing a column of dashes when nothing has been reported', async () => {
    // A never-connected device would otherwise fill the tallest block on the sheet with blanks.
    await render(createConfiguration());

    expect(sections()[0].items).toEqual([
      { label: 'Status', value: 'No connection activity reported yet.', fullWidth: true },
    ]);
  });

  it('shows four dated rows and no failure rows once a device has reported', async () => {
    await render(createConfiguration({ lastSyncDateTime: '2026-08-29T14:30:00' }));

    expect(sections()[0].items.map((item) => item.label)).toEqual([
      'Last Sync',
      'Last Heartbeat',
      'Last Attendance',
      'Last Connected',
    ]);
  });

  it('appends the failure pair only when a connection has failed', async () => {
    await render(
      createConfiguration({
        lastFailedConnectionDateTime: '2026-08-29T09:05:00',
        lastConnectionError: 'ECONNREFUSED after 3 retries',
      }),
    );

    expect(itemValue('Connection', 'Last Failure')?.value).toBe('29 Aug 2026, 09:05');
    expect(itemValue('Connection', 'Error')?.value).toBe('ECONNREFUSED after 3 retries');
  });

  it('hides the rotate button without canRotate', async () => {
    await render(createConfiguration(), undefined, false);

    expect(fixture.nativeElement.querySelector('p-button[label="Rotate Gateway URL"]')).toBeFalsy();
  });

  it('emits rotate from the footer button when canRotate is granted', async () => {
    await render(createConfiguration(), undefined, true);
    const rotate = vi.fn();
    fixture.componentInstance.rotate.subscribe(rotate);

    fixture.debugElement.nativeElement
      .querySelector('p-button[label="Rotate Gateway URL"] button')
      .click();

    expect(rotate).toHaveBeenCalled();
  });
});
