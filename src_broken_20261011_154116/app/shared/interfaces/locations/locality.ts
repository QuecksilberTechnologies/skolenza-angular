export interface GetLocalitiesReq {
  UserStaffMemberId: string;
  DistrictId: number;
  TodaysDate: string;
}

export interface GetLocalitiesRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: Locality[];
}

/**
 * A city, town or village inside a district (`GET /Location/Locality/option`).
 *
 * Swagger documents the endpoint's parameters but types its `200` as bare `OK`, and nothing in
 * `docs/specs/` carries a sample, so the field names follow the `<entity>Name` shape every other
 * `/Location` option endpoint uses (`countryName`, `stateName`, `districtName`). If a locality
 * select ever renders blank labels, this is the first thing to check.
 */
export interface Locality {
  id: number;
  districtId: number;
  localityName: string;
  isActive: boolean;
}
