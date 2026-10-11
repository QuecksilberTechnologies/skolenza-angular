import { PlanFeature } from '@shared/utilities/subscription-plan';

/** `GET /Subscription/get-all-subscription-plan` — query keys are PascalCase. Only `IsActive` is
 *  required; the rest narrow the list. */
export interface GetAllSubscriptionPlanReq {
  IsActive: boolean;
  PlanName?: string | null;
  MaxUsers?: number | null;
  PerDayPrice?: number | null;
  MonthlyPrice?: number | null;
  YearlyPrice?: number | null;
}

export interface GetAllSubscriptionPlanRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: SubscriptionPlan[];
}

/**
 * `POST /Subscription/get-all-host-subscription-plans` — the host grid's paged list. Body keys are
 * camelCase. `isActive: null` is the "All" option; the API method drops the key from the body
 * rather than sending an explicit null. The legacy endpoint has no such mode.
 */
export interface GetHostSubscriptionPlansReq {
  search?: string | null;
  isActive: boolean | null;
  pageNumber: number;
  pageSize: number;
}

/** The page sits alongside `data` in the envelope rather than nested inside it. */
export interface GetHostSubscriptionPlansRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: SubscriptionPlan[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

/** `/Subscription/delete-subscription-plan` — replies with `SubscriptionMutationRes`. */
export interface DeleteSubscriptionPlanReq {
  id: number;
}

export interface SubscriptionPlan {
  id: number;
  planName: string;
  maxUsers: number;
  perDayPrice: number;
  isFree: boolean;
  monthlyPrice: number;
  yearlyPrice: number;
  isMostPopular: boolean | null;
  isCustom: boolean | null;
  currencyKey: string;
  modules: IModule[];
  period?: string; // NG
  price?: number; // NG
  features?: PlanFeature[]; // NG
  isUpdatingStatus?: boolean; // NG
  /** Returned by the host list endpoint; optional because `get-all-subscription-plan` omits it. */
  isActive?: boolean;
}

// moduleName
export interface IModule {
  id: number;
  moduleName: string;
  displayName: string;
  parentModuleId: number | null;
  childModules: IModule[];
  operations: unknown[];
}

/** `/Subscription/add` — the endpoint carries no `modules`, so plan/module mapping is not settable here. */
export interface CreateSubscriptionPlanReq {
  planName: string;
  maxUsers: number;
  isMostPopular: boolean;
  isCustom: boolean;
  currencyKey: string;
  perDayPrice: number;
  isFree: boolean;
  monthlyPrice: number;
  yearlyPrice: number;
  isActive: boolean;
}

/** `PUT /Subscription/{id}` — the API expects the id in both the path and the body. */
export interface UpdateSubscriptionPlanReq extends CreateSubscriptionPlanReq {
  id: number;
}

/** `/Subscription` mutation endpoints return the standard envelope without a typed payload. */
export interface SubscriptionMutationRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: unknown;
}

// Institution Plan
/** `GET /Subscription/get-institution-subscription-plan-info` — query keys are PascalCase. */
export interface GetInstitutionSubscriptionPlanReq {
  StaffMemberId: number;
  RoleId: number;
  InstitutionId: number;
  Id?: number | null;
  SubscriptionPlanId?: number | null;
  StartDate?: string | null;
  EndDate?: string | null;
  IsActive?: boolean | null;
  IsTrial?: boolean | null;
}

export interface GetInstitutionSubscriptionPlanRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: InstitutionSubscriptionPlan;
}

/** The response names the dates `subscription*`, unlike the request which uses `startDate`/`endDate`. */
export interface InstitutionSubscriptionPlan {
  id: number;
  institutionId: number | null;
  subscriptionPlanId: number;
  subscriptionStartDate: string;
  subscriptionEndDate: string | null;
  isActive: boolean;
  paymentTxnId: string | null;
  paymentMode: string | null;
  isTrial: boolean;
}

/**
 * `GET /InstitutionType/get-institution-subscription-plan` — the list variant, named in the plural to
 * avoid colliding with the singular `GET /Subscription/get-institution-subscription-plan-info` pair.
 * Query keys are PascalCase, and this endpoint honours `SubscriptionPlanId`.
 */
export interface GetInstitutionSubscriptionPlansReq {
  SubscriptionPlanId?: number | null;
  InstitutionId?: number | null;
  IsActive?: boolean | null;
  IsTrial?: boolean | null;
}

/** A plan with no subscribers answers `isSucceeded: false` with `data: null` — that is an empty
 *  result, not a failure, so callers must not treat it as an error. */
export interface GetInstitutionSubscriptionPlansRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: InstitutionSubscriptionPlan[] | null;
}

