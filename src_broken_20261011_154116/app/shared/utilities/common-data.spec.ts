import { InstitutionLocationType, WorkMode } from '@shared/interfaces';

import {
  CONCRETE_WORK_MODES,
  dateWindowCovers,
  isInstitutionLocationTypeCompatibleWithWorkMode,
  INSTITUTION_LOCATION_TYPES,
  workModeDisallowsLocation,
  workModeRequiresExecutionLocation,
  workModeRequiresPrimaryLocation,
} from './common-data';

describe('institution location type contract', () => {
  it('matches the backend InstitutionLocationType numeric values', () => {
    expect(InstitutionLocationType.HeadOffice).toBe(1);
    expect(InstitutionLocationType.Branch).toBe(2);
    expect(InstitutionLocationType.Office).toBe(3);
    expect(InstitutionLocationType.Plant).toBe(4);
    expect(InstitutionLocationType.Warehouse).toBe(5);
    expect(InstitutionLocationType.ClientSite).toBe(6);
    expect(InstitutionLocationType.ProjectSite).toBe(7);
    expect(InstitutionLocationType.Campus).toBe(8);
    expect(InstitutionLocationType.RemoteOffice).toBe(9);
  });

  it('exposes every backend location type as a selectable option', () => {
    expect(INSTITUTION_LOCATION_TYPES.map((option) => option.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(INSTITUTION_LOCATION_TYPES.find((option) => option.code === 'CLIENT_SITE')?.id).toBe(
      InstitutionLocationType.ClientSite,
    );
  });

  it('uses the API work-mode compatibility rules', () => {
    expect(
      isInstitutionLocationTypeCompatibleWithWorkMode(
        WorkMode.ClientSite,
        InstitutionLocationType.ClientSite,
      ),
    ).toBe(true);
    expect(
      isInstitutionLocationTypeCompatibleWithWorkMode(
        WorkMode.ClientSite,
        InstitutionLocationType.HeadOffice,
      ),
    ).toBe(false);
    expect(
      isInstitutionLocationTypeCompatibleWithWorkMode(WorkMode.Field, InstitutionLocationType.ProjectSite),
    ).toBe(true);
    expect(
      isInstitutionLocationTypeCompatibleWithWorkMode(
        WorkMode.WorkFromHome,
        InstitutionLocationType.RemoteOffice,
      ),
    ).toBe(false);
  });
});

describe('staffMember work configuration rules', () => {
  it('keeps arrangement and day-level location requirements distinct', () => {
    expect(workModeRequiresPrimaryLocation(WorkMode.Hybrid)).toBe(true);
    expect(workModeRequiresExecutionLocation(WorkMode.Hybrid)).toBe(false);
    expect(workModeRequiresPrimaryLocation(WorkMode.Field)).toBe(false);
    expect(workModeRequiresExecutionLocation(WorkMode.Field)).toBe(true);
    expect(workModeDisallowsLocation(WorkMode.WorkFromHome)).toBe(true);
  });

  it('offers only concrete modes for patterns and overrides', () => {
    expect(CONCRETE_WORK_MODES.map((mode) => mode.id)).toEqual([
      WorkMode.Office,
      WorkMode.WorkFromHome,
      WorkMode.Field,
      WorkMode.ClientSite,
    ]);
  });

  it('checks inclusive and open-ended assignment coverage', () => {
    expect(dateWindowCovers('2026-01-01', null, '2026-02-01', null)).toBe(true);
    expect(dateWindowCovers('2026-02-02', null, '2026-02-01', null)).toBe(false);
    expect(dateWindowCovers('2026-01-01', '2026-12-31', '2026-02-01', null)).toBe(false);
    expect(dateWindowCovers('2026-01-01', '2026-12-31', '2026-02-01', '2026-11-30')).toBe(true);
  });
});
