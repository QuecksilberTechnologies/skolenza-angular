# `ruleConfiguration` has no per-rule-type schema and no execution contract, so a saved rule is text and nothing more

**Component:** AxionPro API - `TenantPolicy` controller, `POST /api/TenantPolicy`, `PUT /{policyId}/versions/{versionId}`
**Severity:** Major - HR can save a policy that looks authoritative and produces no business effect
**Reported:** 2026-09-22
**Environment:** `https://axionpro-api.onrender.com`

## Summary

`PolicyRuleType` publishes thirteen categories through `GET /api/TenantPolicy/lookups` - Eligibility,
Entitlement, Accrual, Carry Forward, Sandwich, Limit, Attendance Channel, Late Penalty, Overtime,
Approval, Reimbursement, Calendar, Custom Rule. Each names a business behaviour.

The payload that is supposed to express that behaviour is a free-form string. From
`TENANT_POLICY_API.md`:

> `ruleConfiguration` and exception `overrideConfiguration` are JSON object strings.
> Arrays and scalar JSON values are rejected.

That is the entire contract. The only validation is "parses as a JSON object". Nothing states which
keys an Entitlement rule takes, what units are legal, what ranges are accepted, or what - if
anything - consumes the stored value.

Two distinct things are missing, and both are backend decisions:

1. **A per-rule-type schema.** What keys does `policyRuleTypeId = <Entitlement>` require?
2. **An execution contract.** Does any downstream service read `PolicyRule.RuleConfiguration`?

## Reproduce

```bash
curl -X POST 'https://axionpro-api.onrender.com/api/TenantPolicy' \
  -H 'authorization: Bearer <tenant token>' \
  -H 'content-type: application/json' \
  -d '{ "moduleId": <Policy Definitions>, "operationId": <Add>,
        "policyTypeId": <Annual Leave>, "policyCode": "RULE-SCHEMA-PROBE",
        "policyName": "Rule schema probe", "defaultCurrencyCode": "INR",
        "effectiveFrom": "2026-10-01", "changeSummary": "probe",
        "rules": [{ "policyRuleTypeId": <Entitlement>, "ruleName": "Annual entitlement",
                    "ruleOrder": 1, "ruleConfiguration": "{\"nonsense\":true}" }],
        "applicability": [] }'
```

**Actual:** HTTP 200. The rule is stored verbatim. `{"nonsense":true}` on an Entitlement rule is as
valid to this API as `{"days":18,"unit":"DAY"}`.

Then publish that version and resolve it for an employee. The resolve response names the policy;
no leave balance, accrual or entitlement anywhere in the product changes.

## Impact

An HR user selects **Entitlement**, types `{"days":18,"unit":"DAY"}`, publishes, and reasonably
concludes that employees matching the applicability now have 18 days. They do not. The generic
policy engine records terms; it does not execute them. The legacy leave feature still owns actual
balances, and there is no link between the two.

The client currently mitigates this with a hint under the textarea
(`policy-definition-form.html:272`) reading "the policy engine records this text as the version's
terms, it does not calculate leave, balances or payouts from it" - but a warning label is not a
substitute for the contract. The same gap also blocks:

- a guided rule editor, which needs named fields per rule type rather than a raw textarea;
- any client-side validation of a rule the backend will later reject or silently ignore;
- typing `ruleConfiguration` as anything narrower than `string`.

Rule ordering is the one part that _is_ specified (`ruleOrder` unique per version), which makes the
silence on everything else more conspicuous.

## Suggested fix

Two deliverables, in this order.

**1. Publish the schema per rule type.** Extend the `ruleTypes` entries in
`GET /api/TenantPolicy/lookups` with the shape each one accepts, so a client reads it rather than
hard-coding it - the same rule the module already applies to `ModuleId` and `OperationId`:

```json
{
  "id": 2,
  "code": "ENTITLEMENT",
  "name": "Entitlement",
  "configurationSchema": {
    "days": { "type": "number", "required": true, "minimum": 0 },
    "unit": { "type": "string", "required": true, "enum": ["DAY", "HOUR"] },
    "proRata": { "type": "boolean", "required": false, "default": false }
  }
}
```

Shape above is illustrative. Whatever form it takes - JSON Schema, a flat field list, or a link to a
per-type document - it must be machine-readable and served from the API.

Then validate against it on create and update, so an Entitlement rule carrying `{"nonsense":true}`
is a 400, not a stored row.

**2. State the execution contract per category.** For each rule type, document which service reads
the stored configuration and what it does with it, or state plainly that the type is
record-keeping only for now. `TENANT_POLICY_API.md` is the place. Categories that no service
consumes should say so, so nobody ships a policy expecting an effect that does not exist.

## Verifying the fix

1. `GET /api/TenantPolicy/lookups`. Expect each `ruleTypes` entry to carry its configuration schema.
2. Re-run the repro. Expect a 400 naming the unrecognised key, not a 200.
3. Post a rule matching the published schema. Expect a 200 and a round-trip through
   `GET /api/TenantPolicy/{policyId}` with the configuration intact.
4. For any rule type documented as executable, publish a version and confirm the documented
   downstream effect actually occurs.
5. In the web app, the rule editor renders named fields for a rule type with a published schema, and
   falls back to the raw textarea only for `Custom Rule`.

## Client-side follow-up

This ticket is the backend half. The client work, once the schemas are served:

- `src/app/shared/interfaces/tenant-policy/tenant-policy-type.ts` - add `configurationSchema` to the
  rule-type lookup option.
- `src/app/features/tenant-policies/policy-definitions/policy-definition-form/policy-definition-form.schema.ts`
  (`ruleRowSchema`) - validate `ruleConfiguration` against the selected type's schema instead of the
  current "is it a JSON object" check.
- `src/app/features/tenant-policies/policy-definitions/policy-definition-form/policy-definition-form.html:255-283`
  - replace the textarea with generated fields per rule type, keeping the textarea for Custom Rule,
    and drop the "does not calculate" hint once execution is documented.

## Related

- `docs/backend-tickets/tenant-policy-exception-approval-status-undocumented.md` - the same class of
  gap on `exceptionType` and `overrideConfiguration`.
