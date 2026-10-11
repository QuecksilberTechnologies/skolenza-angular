# Subscription API Coverage Report

## Context

The backend exposes 7 `/api/Subscription/...` endpoints (see the Swagger docs at
https://axionpro-api.onrender.com/swagger/index.html). This report records which of them the Angular
frontend actually calls, and whether each call is wired to real UI or is dead code. It is an audit
deliverable — no source code was changed to produce it. It is the companion to
[`host-api-coverage-report.md`](./host-api-coverage-report.md).

All Subscription HTTP calls live in a single service:
`src/app/core/services/subscriptions-api.ts` (class `SubscriptionsApi`, base
`${environment.apiUrl}/Subscription`). No other file builds a `/Subscription/...` URL.

Legend: ✅ implemented and wired to UI · ⚠️ implemented but unused · ❌ not implemented.

## Coverage

| #   | Endpoint                              | Status | API method (`subscriptions-api.ts`) | Consumers                                                                                               |
| --- | ------------------------------------- | ------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | GET get-all-subscription-plan         | ✅     | `getAllSubscriptionPlan` :32        | `pricing.store.ts:49`, `dashboard-host.store.ts:110`, `tenant-form.ts:130`, `subscription.store.ts:105` |
| 2   | POST get-all-host-subscription-plans  | ✅     | `getHostSubscriptionPlans` :39      | `host/subscriptions/subscriptions.store.ts:77`                                                          |
| 3   | GET get-tenant-subscription-plan-info | ✅     | `getTenantSubscriptionPlan` :48     | `features/subscription/subscription.store.ts:106`                                                       |
| 4   | GET get-all-tenant-accessible-modules | ✅     | `getTenantAccessibleModules` :66    | `host/tenants/tenant-modules/tenant-modules.store.ts:71`                                                |
| 5   | POST add                              | ✅     | `addSubscriptionPlan` :59           | `subscription-plan-form.ts:178`                                                                         |
| 6   | PUT {id}                              | ✅     | `updateSubscriptionPlan` :74        | `subscription-plan-form.ts:177`, `subscriptions.store.ts:155` (active toggle), `:207`, `:211` (bulk)    |
| 7   | POST delete-subscription-plan         | ✅     | `deleteSubscriptionPlan` :66        | `subscriptions.store.ts:178` ← `subscriptions.ts:374`                                                   |

**Totals: 7 wired · 0 implemented but unused · 0 absent.**

## Notes

- `IndustriesApi.getTenantSubscriptionPlans` (`industries-api.ts:54`) is a **different** endpoint on
  a different controller, despite the near-identical name. It feeds
  `subscription-plan-detail.ts:55` and `subscriptions.store.ts:94`. Do not mistake it for row 3.
- There is no dedicated activate/deactivate endpoint. The plan status toggle reuses `PUT {id}` —
  see `subscriptions.store.ts:155`, and `:207`/`:211` for the bulk activate/deactivate path.
- `updateSubscriptionPlan` sends the id in the path **and** the body; the comment at
  `subscriptions-api.ts:73` records this, and `tenants-api.ts:124` cross-references it for the
  equivalent tenant endpoint.
- Row 4 was absent when this report was first written and has since been implemented. It backs the
  **Tenants → Modules & operations** screen, with query params typed in
  `shared/interfaces/tenant-operation.ts:29`. The call currently fails server-side with
  `400 "A valid identifier is required."` — Issue 3 in
  [`api-issues-for-backend.md`](./api-issues-for-backend.md).
- Rows 1 and 3 are also consumed outside the Host area: the public pricing page
  (`features/authentication/pricing`) and the tenant-side `features/subscription` screen.

## Suggested follow-ups

1. Unblock row 4 — the method and its screen exist; the endpoint rejects the only identifier a host
   holds. Needs an answer to Issue 3 before the screen can render anything.
2. Consider renaming `IndustriesApi.getTenantSubscriptionPlans` to name its controller, so it stops
   colliding with `SubscriptionsApi.getTenantSubscriptionPlan` in autocomplete and review.

## How to re-verify

Grep `src/` for `'/Subscription/'` string literals and for each `SubscriptionsApi` method name.
Every match should appear in the table above.
