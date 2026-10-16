import { ApiEnvelope } from './common/api-envelope';

/**
 * `/api/host/billing/*` — the HostAdmin billing surface (backend `HostBillingAdministrationDTOs.cs`
 * and `HostBillingConfigurationDTOs.cs`).
 *
 * Every write DTO nests `ModuleId` / `OperationId` under `permissionRequest`, and every read takes
 * them on the query. `moduleOperationInterceptor` fills both, so none of the request shapes below
 * carry them.
 */

/** `my-menu` module codes for the seven billing leaves, all children of `HOST_SUBSCRIPTIONS`. */
export const HOST_BILLING_MODULE = {
  configuration: 'HOST_BILLING_CONFIGURATION',
  planPrices: 'HOST_BILLING_PLAN_PRICES',
  taxRules: 'HOST_BILLING_TAX_RULES',
  transactions: 'HOST_BILLING_TRANSACTIONS',
  refunds: 'HOST_BILLING_REFUNDS',
  reconciliation: 'HOST_BILLING_RECONCILIATION',
  audit: 'HOST_BILLING_AUDIT',
} as const;

export type HostBillingRes<T> = ApiEnvelope<T>;

/** `BillingPageResult<T>` — paging travels inside `data`, not on the envelope. */
export interface HostBillingPage<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
}

/** `HostBillingListRequestDTO` — transactions, refunds and audit share it. */
export interface HostBillingListReq {
  PageNumber?: number;
  PageSize?: number;
  Search?: string | null;
  Status?: string | null;
}

export type HostBillingCycle = 'Monthly' | 'Yearly';

export interface HostPlanPrice {
  id: number;
  subscriptionPlanId: number;
  planName: string;
  countryCode: string;
  currencyCode: string;
  billingCycle: HostBillingCycle;
  baseAmount: number;
  /** `yyyy-MM-dd` (`DateOnly`). */
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
}

export interface HostPlanPriceReq {
  subscriptionPlanId: number;
  countryCode: string;
  currencyCode: string;
  billingCycle: HostBillingCycle;
  baseAmount: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
}

export interface HostTaxRule {
  id: number;
  countryCode: string;
  taxCode: string;
  taxName: string;
  ratePercent: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  configurationJson: string | null;
}

export interface HostTaxRuleReq {
  countryCode: string;
  taxCode: string;
  taxName: string;
  ratePercent: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  configurationJson: string | null;
}

export interface HostPaymentTransaction {
  id: number;
  billingOrderId: string;
  institutionId: number;
  institutionName: string | null;
  status: string;
  paymentMethod: string | null;
  currencyCode: string;
  amount: number;
  gatewayPaymentId: string | null;
  bankReference: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  paidAt: string | null;
  addedDateTime: string;
}

export interface HostRefund {
  id: string;
  paymentTransactionId: number;
  institutionId: number;
  amount: number;
  currencyCode: string;
  reason: string;
  /** Stays `Requested` until the provider worker confirms — never show it as refunded before. */
  status: string;
  gatewayRefundId: string | null;
  requestedByHostUserId: number;
  requestedAt: string;
  completedAt: string | null;
  failureMessage: string | null;
}

export interface HostRefundReq {
  paymentTransactionId: number;
  amount: number;
  reason: string;
  /** A fresh UUID per intended refund — a retry of the same intent reuses it. */
  idempotencyKey: string;
}

export interface HostReconciliationSummary {
  stalePendingOrders: number;
  failedWebhookEvents: number;
  pendingWebhookEvents: number;
  failedPaymentAttempts: number;
  requestedRefunds: number;
  generatedAt: string;
}

export interface HostBillingAuditEntry {
  id: number;
  institutionId: number | null;
  entityType: string;
  entityId: string;
  action: string;
  oldStatus: string | null;
  newStatus: string | null;
  actorType: string;
  actorId: number | null;
  correlationId: string | null;
  metadataJson: string | null;
  addedDateTime: string;
}

/** Credentials never leave the server — only the three `has*` presence flags do. */
export interface HostBillingConfiguration {
  id: number;
  gatewayCode: string;
  gatewayName: string;
  environment: string;
  sellerLegalName: string | null;
  sellerBillingEmail: string | null;
  sellerBillingPhone: string | null;
  countryCode: string;
  stateCode: string | null;
  postalCode: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  taxRegistrationNumber: string | null;
  invoicePrefix: string;
  paymentRetryCount: number;
  gracePeriodDays: number;
  paymentTimeoutMinutes: number;
  reconciliationLookbackDays: number;
  isActive: boolean;
  /** Optimistic concurrency token — a stale one answers 409 and the form must reload. */
  version: number;
  hasClientId: boolean;
  hasClientSecret: boolean;
  hasWebhookSecret: boolean;
}

export interface HostBillingConfigurationReq {
  sellerLegalName: string;
  sellerBillingEmail: string;
  sellerBillingPhone: string | null;
  countryCode: string;
  stateCode: string;
  postalCode: string;
  addressLine1: string;
  addressLine2: string | null;
  taxRegistrationNumber: string;
  invoicePrefix: string;
  paymentRetryCount: number;
  gracePeriodDays: number;
  paymentTimeoutMinutes: number;
  reconciliationLookbackDays: number;
  isActive: boolean;
  version: number;
}
