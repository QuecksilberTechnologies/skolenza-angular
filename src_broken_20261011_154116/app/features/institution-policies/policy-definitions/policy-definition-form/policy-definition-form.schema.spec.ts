import { describe, expect, it } from 'vitest';

import { AttendanceLocationScope } from '@shared/interfaces';

import { PolicyDefinitionModel, policyDefinitionSchema } from './policy-definition-form.schema';

const validModel = (): PolicyDefinitionModel => ({
  policyTypeId: 1,
  policyCode: 'CLIENT_SITE_ATTENDANCE',
  policyName: 'Client Site Attendance',
  summary: '',
  ownerDepartmentId: null,
  defaultCurrencyCode: 'INR',
  effectiveFrom: new Date(2026, 8, 26),
  effectiveTo: null,
  changeSummary: 'Initial version',
  leaveTypeIds: [],
  rules: [],
  applicability: [],
  requiresLeaveTypeTargets: false,
  requiresAttendanceConfiguration: true,
  attendanceConfiguration: {
    attendanceLocationScope: AttendanceLocationScope.AssignedLocations,
    allowBiometric: false,
    allowMobile: true,
    allowWeb: false,
    allowManualAttendance: false,
    allowWorkFromHome: false,
    requireGeoFenceForOffice: true,
    requireGpsForRemote: false,
    allowOutsideLocationWithApproval: false,
  },
});

describe('policyDefinitionSchema attendance configuration', () => {
  it('accepts an Attendance policy when at least one channel is enabled', () => {
    expect(policyDefinitionSchema.safeParse(validModel()).success).toBe(true);
  });

  it('rejects an Attendance policy when every channel is disabled', () => {
    const model = validModel();
    model.attendanceConfiguration.allowMobile = false;

    const result = policyDefinitionSchema.safeParse(model);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Enable at least one attendance channel');
  });

  it('rejects an Attendance policy when API location-scope options are unavailable', () => {
    const model = validModel();
    model.attendanceConfiguration.attendanceLocationScope = null;

    const result = policyDefinitionSchema.safeParse(model);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Location scope is required');
  });

  it('does not apply Attendance channel validation to another policy category', () => {
    const model = validModel();
    model.requiresAttendanceConfiguration = false;
    model.attendanceConfiguration.allowMobile = false;
    model.attendanceConfiguration.attendanceLocationScope = null;

    expect(policyDefinitionSchema.safeParse(model).success).toBe(true);
  });
});
