import { AttendanceLocationScope } from '@shared/interfaces';

import { AttendancePolicyFormModel, attendancePolicySchema } from './attendance-policy-form.schema';

const validModel: AttendancePolicyFormModel = {
  policyTypeId: 4,
  policyName: 'Hybrid Attendance',
  description: '',
  remark: '',

  attendanceLocationScope: AttendanceLocationScope.AssignedLocations,
  requireGeoFenceForOffice: true,
  requireGpsForRemote: false,
  allowOutsideLocationWithApproval: false,

  allowBiometric: true,
  allowMobile: false,
  allowWeb: false,
  allowManualAttendance: false,
  allowWorkFromHome: false,

  isActive: true,
};

const issuePaths = (model: AttendancePolicyFormModel): string[] => {
  const result = attendancePolicySchema.safeParse(model);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('attendancePolicySchema', () => {
  it('accepts a valid policy', () => {
    expect(issuePaths(validModel)).toEqual([]);
  });

  it('requires the policy type, name and scope', () => {
    const paths = issuePaths({
      ...validModel,
      policyTypeId: null,
      policyName: '',
      attendanceLocationScope: null,
    });

    expect(paths).toEqual(
      expect.arrayContaining(['policyTypeId', 'policyName', 'attendanceLocationScope']),
    );
  });

  it('rejects a policy with no attendance channel', () => {
    const paths = issuePaths({
      ...validModel,
      allowBiometric: false,
      allowMobile: false,
      allowWeb: false,
      allowManualAttendance: false,
    });

    expect(paths).toContain('allowBiometric');
  });

  it('rejects requiring GPS for remote when work from home is off', () => {
    expect(
      issuePaths({ ...validModel, requireGpsForRemote: true, allowWorkFromHome: false }),
    ).toContain('requireGpsForRemote');
  });

  it('rejects an office geo-fence when attendance is allowed from anywhere', () => {
    expect(
      issuePaths({
        ...validModel,
        attendanceLocationScope: AttendanceLocationScope.RemoteAnywhere,
        requireGeoFenceForOffice: true,
      }),
    ).toContain('requireGeoFenceForOffice');
  });

  it('rejects work from home under a primary-location-only scope', () => {
    expect(
      issuePaths({
        ...validModel,
        attendanceLocationScope: AttendanceLocationScope.PrimaryLocationOnly,
        allowWorkFromHome: true,
      }),
    ).toContain('attendanceLocationScope');
  });

  it('accepts work from home with GPS under a wider scope', () => {
    expect(
      issuePaths({
        ...validModel,
        attendanceLocationScope: AttendanceLocationScope.AnyInstitutionLocation,
        allowWorkFromHome: true,
        requireGpsForRemote: true,
      }),
    ).toEqual([]);
  });
});
