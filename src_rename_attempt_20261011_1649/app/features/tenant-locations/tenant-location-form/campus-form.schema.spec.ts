import { CampusType } from '@shared/interfaces';

import { CampusFormModel, campusSchema } from './campus-form.schema';

const validModel: CampusFormModel = {
  locationCode: 'HYD-HO',
  locationName: 'Hyderabad Head Office',
  locationType: CampusType.HeadOffice,
  isHeadOffice: true,

  countryId: 1,
  stateId: 2,
  districtId: 3,
  localityId: 4,
  address: 'Gachibowli',
  landmark: '',
  postalCode: '500032',

  latitude: null,
  longitude: null,
  isGeoFenceEnabled: false,
  geoFenceRadiusMeters: null,
  timeZoneId: 'Asia/Kolkata',

  isAttendanceAllowed: true,
  isBiometricEnabled: false,

  isActive: true,
};

const issuePaths = (model: CampusFormModel): string[] => {
  const result = campusSchema.safeParse(model);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('campusSchema', () => {
  it('accepts a fully filled location', () => {
    expect(issuePaths(validModel)).toEqual([]);
  });

  it('requires the identity fields', () => {
    const paths = issuePaths({
      ...validModel,
      locationCode: '',
      locationName: '',
      locationType: null,
      countryId: null,
      stateId: null,
      timeZoneId: '',
    });

    expect(paths).toEqual(
      expect.arrayContaining([
        'locationCode',
        'locationName',
        'locationType',
        'countryId',
        'timeZoneId',
      ]),
    );
  });

  it('rejects a state without a country', () => {
    expect(issuePaths({ ...validModel, countryId: null, stateId: 2 })).toContain('countryId');
  });

  describe('geo-fence', () => {
    it('requires a radius once the fence is on', () => {
      const paths = issuePaths({
        ...validModel,
        isGeoFenceEnabled: true,
        latitude: 17.385044,
        longitude: 78.486671,
        geoFenceRadiusMeters: null,
      });

      expect(paths).toContain('geoFenceRadiusMeters');
    });

    it('requires both coordinates once the fence is on', () => {
      const paths = issuePaths({
        ...validModel,
        isGeoFenceEnabled: true,
        geoFenceRadiusMeters: 150,
        latitude: null,
        longitude: null,
      });

      expect(paths).toEqual(expect.arrayContaining(['latitude', 'longitude']));
    });

    it('accepts a complete fence', () => {
      expect(
        issuePaths({
          ...validModel,
          isGeoFenceEnabled: true,
          latitude: 17.385044,
          longitude: 78.486671,
          geoFenceRadiusMeters: 150,
        }),
      ).toEqual([]);
    });
  });

  describe('coordinates', () => {
    it('accepts the boundary values', () => {
      expect(issuePaths({ ...validModel, latitude: 90, longitude: 180 })).toEqual([]);
      expect(issuePaths({ ...validModel, latitude: -90, longitude: -180 })).toEqual([]);
    });

    it('rejects values past the boundary', () => {
      expect(issuePaths({ ...validModel, latitude: 91, longitude: 181 })).toEqual(
        expect.arrayContaining(['latitude', 'longitude']),
      );
    });

    it('asks for the missing half of a pair', () => {
      expect(issuePaths({ ...validModel, latitude: 17.385044, longitude: null })).toContain(
        'longitude',
      );
      expect(issuePaths({ ...validModel, latitude: null, longitude: 78.486671 })).toContain(
        'latitude',
      );
    });
  });
});
