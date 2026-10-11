/**
 * Institution-scoped, location-based holidays behind `/api/Holiday` (renamed from `/api/HolidayCalandar`),
 * matched case-insensitively, same as everywhere else.
 *
 * ASSUMED CONTRACT — swagger (https://skolenza-api.onrender.com/swagger/v1/swagger.json, read
 * 2026-09-22) publishes the request DTOs and query params for every route below, but declares no
 * response schema anywhere on this controller: every `200` is `{ "description": "OK" }` with no
 * `content`. The row shape past the write DTOs' own fields (`isActive`, `locationName`), and the
 * envelope on every response, are assumed from the house convention (see `GetDepartmentsResponse`) —
 * the same gap `campus.ts` documents for `/Campus`. Templates should guard the
 * assumed fields with `?? '-'` until this is confirmed live.
 *
 * `ModuleId`/`OperationId` are confirmed rather than assumed — each route's own swagger description
 * names them directly ("Requires the Add operation for INSTITUTION_POLICY_HOLIDAY_CALENDAR", etc.; `my-menu`
 * has since renamed the code to `INSTITUTION_POLICY_HOLIDAY`, module id 118) — and are stamped by `moduleOperationInterceptor` (`MODULE_OPERATION_ROUTES`, `CONTROLLER_MODULE_FALLBACK`
 * under `holiday`), so no call site here builds them by hand.
 */

import { ApiEnvelope } from './common/api-envelope';

/** Fields shared by the create/update DTOs (`SaveHolidayRequestDTO` / `UpdateHolidayRequestDTO`). */
export interface HolidayFields {
  campusId: number;
  holidayName: string;
  /** Date-only (`yyyy-MM-dd`), no time component. */
  holidayDate: string;
  isOptional: boolean;
  description: string | null;
  icon: string | null;
}

/**
 * A row as `GET /get` and `GET /{id}` return it. See the file doc for what past the write DTOs' own
 * fields is assumed rather than confirmed.
 */
export interface Holiday extends HolidayFields {
  id: number;
  /** `GET /get` lists only active holidays; `GET /{id}` returns inactive too. Never settable by the
   *  write DTOs — the only documented way to flip it is `DELETE /{id}` (soft-delete). */
  isActive: boolean;
  /** ASSUMED: not on the write DTOs; echoed for display the way `CampusRow.locationName` is. */
  locationName?: string | null;
}

/** Query filters shared by `GET /get` and `GET /export` — both optional, both scoped to the
 *  authenticated institution regardless. */
export interface GetHolidaysReq {
  CampusId?: number | null;
  HolidayYear?: number | null;
}

export interface GetHolidaysRes extends ApiEnvelope<Holiday[]> {
  errors?: unknown[];
}

export interface GetHolidayRes extends ApiEnvelope<Holiday | null> {
  errors?: unknown[];
}

export type CreateHolidayReq = HolidayFields;

/** `PUT /{id}` replaces the record, so the body carries every field, not just the changed ones. */
export type UpdateHolidayReq = HolidayFields & { id: number };

export interface HolidayMutationRes extends ApiEnvelope<Holiday | null> {
  errors?: unknown[];
}

/** `statusCode` values the Holidays page reads off `GET /calendar-display-constants`. */
export const MANDATORY_HOLIDAY_CODE = 'MANDATORY_HOLIDAY';
export const OPTIONAL_HOLIDAY_CODE = 'OPTIONAL_HOLIDAY';

/**
 * One staffMember-calendar status style (`HolidayCalendarStyleDTO`). Swagger declares no schema for
 * this route; the shape is read from the backend source. `priority` resolves date overlaps —
 * the highest value wins.
 */
export interface HolidayCalendarStyle {
  statusCode: string;
  label: string;
  backgroundColor: string;
  textColor: string;
  priority: number;
}

/** The two palette entries the Holidays page badges read; `null` when the API omits one. */
export interface HolidayTypeStyles {
  mandatory: HolidayCalendarStyle | null;
  optional: HolidayCalendarStyle | null;
}

export interface HolidayCalendarDisplayConstants {
  styles: HolidayCalendarStyle[];
}

export interface GetHolidayCalendarDisplayConstantsRes extends ApiEnvelope<HolidayCalendarDisplayConstants | null> {
  errors?: unknown[];
}

/** `POST /import`'s response: swagger declares no schema at all here either. */
export interface ImportHolidaysRes extends ApiEnvelope<unknown> {
  errors?: unknown[];
}

