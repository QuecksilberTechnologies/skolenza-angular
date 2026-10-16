/**
 * StaffMember-to-device mappings behind `/api/StaffDeviceEnrollment/*` — one staffMember on one
 * host-owned `InstitutionDevice`.
 *
 * ASSUMED CONTRACT — swagger publishes the request DTOs and query params but no response schema, so
 * the row, the envelope, and the joined display fields are assumed from the house convention.
 * Templates guard them with `?? '-'`.
 *
 * Identifiers on this controller are **opaque strings**, not numbers: `id`, `institutionDeviceId` and
 * `institutionCardId` are all encrypted ids.
 *
 * Credentials are not part of the enrollment record. Face, PIN and card each have their own
 * endpoint and are only callable once the enrollment exists — see
 * `docs/specs/SKOLENZA_DEVICE_ANGULAR_HANDOFF.md` §5.3. The read side never returns a raw PIN, a
 * raw card number, face bytes, the device-side enroll id, or the staffMember database id; it returns
 * the four command statuses instead.
 *
 * A institution user may only manage the enrollment; the `InstitutionDevice` itself is host-owned and
 * read-only here. Deactivating or deleting the device is rejected while an active enrollment exists.
 */

/** One weekly access window. `dayOfWeek` is the backend `WorkPatternDay` enum, 1-7. */
export interface StaffMemberDeviceAccessWindow {
  dayOfWeek: number;
  /** `HH:mm:ss` local time. */
  startLocalTime: string;
  endLocalTime: string;
  isActive: boolean;
}

/** Fields shared by the create and update DTOs and echoed back on reads. */
export interface StaffMemberDeviceEnrollmentFields {
  staffMemberId: string;
  institutionDeviceId: string;
  /**
   * Present on the DTO, but the backend does not honour it during create — the handoff spec says
   * to create the enrollment first and then call `card/bind`. Nothing in the app sends it.
   */
  institutionCardId?: string | null;
  /** Full ISO date-time. */
  accessEffectiveFromDateTime: string | null;
  accessEffectiveToDateTime: string | null;
  accessWindows: StaffMemberDeviceAccessWindow[] | null;
  isActive: boolean;
}

export interface StaffMemberDeviceEnrollmentRow extends StaffMemberDeviceEnrollmentFields {
  id: string;
  staffMemberName?: string | null;
  staffMemberCode?: string | null;
  deviceName?: string | null;
  deviceCode?: string | null;
  serialNumber?: string | null;
  institutionLocationId?: number | null;
  institutionLocationName?: string | null;
  /** Queued-command state per credential, shown as the deployment status. */
  faceCommandStatus?: string | null;
  cardCommandStatus?: string | null;
  pinCommandStatus?: string | null;
  userActivationCommandStatus?: string | null;
  addedById?: number;
  addedDateTime?: string;
  updatedById?: number | null;
  updatedDateTime?: string | null;
  isUpdatingStatus?: boolean; // NG
  isDeleting?: boolean; // NG
}

/** Query params are PascalCase on this controller. */
export interface GetStaffMemberDeviceEnrollmentsReq {
  Search?: string | null;
  StaffMemberId?: string | null;
  InstitutionDeviceId?: string | null;
  InstitutionLocationId?: number | null;
  IsActive?: boolean | null;
  PageNumber?: number | null;
  PageSize?: number | null;
}

export interface GetStaffMemberDeviceEnrollmentsRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: StaffMemberDeviceEnrollmentRow[];
  pageNumber?: number;
  pageSize?: number;
  totalRecords?: number;
  totalPages?: number;
}

export interface GetStaffMemberDeviceEnrollmentRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: StaffMemberDeviceEnrollmentRow | null;
}

export type CreateStaffMemberDeviceEnrollmentReq = Omit<
  StaffMemberDeviceEnrollmentFields,
  'institutionCardId'
>;

/** `/update` carries the id in the body and replaces the record, so every field has to be resent. */
export type UpdateStaffMemberDeviceEnrollmentReq = CreateStaffMemberDeviceEnrollmentReq & { id: string };

export interface UpdateStaffMemberDeviceEnrollmentStatusReq {
  id: string;
  isActive: boolean;
}

/**
 * `POST /card/bind`. The card is picked by its opaque id — a institution never sees, types, or stores a
 * raw card number. The backend checks that the card belongs to this institution, is active, and is
 * `Available`, then flips it to `Assigned` and queues the device command.
 */
export interface BindStaffMemberDeviceCardReq {
  enrollmentId: string;
  institutionCardId: string;
}

/**
 * `POST /credential/remove`. `credentialType` is an unnamed backend enum (1-3) resolved to a label
 * at runtime through `DeviceDdlOptionsApi.getStaffMemberDeviceCredentials()`, the same way the card
 * inventory resolves its statuses - the numbering is the backend's to own.
 */
export interface RemoveStaffMemberDeviceCredentialReq {
  enrollmentId: string;
  credentialType: number;
}

/**
 * `POST /StaffDeviceEnrollment/pin/upsert`. Write-only: the PIN is never returned by any read,
 * so it is never rendered back, cached or logged - the field is cleared as soon as it is sent.
 *
 * The face upload at `/face/upsert` takes `multipart/form-data` instead (`enrollmentId` plus one
 * JPEG or PNG under 2 MB as `faceImage`), so it has no request interface of its own.
 */
export interface SetStaffMemberDevicePinReq {
  enrollmentId: string;
  pin: string;
}

