import { MonitoringPolicyModel, monitoringPolicySchema } from './monitoring-policy-dialog.schema';

const valid: MonitoringPolicyModel = {
  minimumCaptureIntervalSeconds: 300,
  maximumCaptureIntervalSeconds: 600,
  heartbeatIntervalSeconds: 60,
  delayedAfterSeconds: 180,
  unreachableAfterSeconds: 600,
  offlineRetentionDays: 3,
  maximumOfflineGb: 2,
  imageQuality: 70,
  captureAllMonitors: true,
};

const issuePaths = (patch: Partial<MonitoringPolicyModel>) =>
  monitoringPolicySchema
    .safeParse({ ...valid, ...patch })
    .error?.issues.map((issue) => issue.path.join('.')) ?? [];

describe('monitoringPolicySchema', () => {
  it('accepts the documented reference policy', () => {
    expect(issuePaths({})).toEqual([]);
  });

  it('allows equal capture bounds but not a maximum below the minimum', () => {
    expect(issuePaths({ maximumCaptureIntervalSeconds: 300 })).toEqual([]);
    expect(issuePaths({ maximumCaptureIntervalSeconds: 299 })).toEqual([
      'maximumCaptureIntervalSeconds',
    ]);
  });

  it('requires heartbeat < delayed < unreachable', () => {
    expect(issuePaths({ delayedAfterSeconds: 60 })).toEqual(['delayedAfterSeconds']);
    expect(issuePaths({ unreachableAfterSeconds: 180 })).toEqual(['unreachableAfterSeconds']);
  });

  it('enforces the server minimums and quality range', () => {
    expect(issuePaths({ minimumCaptureIntervalSeconds: 59 })).toContain(
      'minimumCaptureIntervalSeconds',
    );
    expect(issuePaths({ heartbeatIntervalSeconds: 14 })).toContain('heartbeatIntervalSeconds');
    expect(issuePaths({ imageQuality: 101 })).toEqual(['imageQuality']);
    expect(issuePaths({ maximumOfflineGb: 0 })).toEqual(['maximumOfflineGb']);
  });

  it('reports a blank field as required', () => {
    expect(issuePaths({ offlineRetentionDays: null })).toEqual(['offlineRetentionDays']);
  });
});
