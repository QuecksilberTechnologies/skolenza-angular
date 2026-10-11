# Tenant Policy UI Planning

## Current phase

The persistence, EF mappings, permission pipeline, core policy APIs, approval-stage
administration/enforcement and operational list APIs are implemented locally. See
[TENANT_POLICY_API.md](TENANT_POLICY_API.md) for callable routes and examples.
Durable bulk endpoints and UI contract are implemented locally. PostgreSQL
lifecycle testing and deployed acceptance remain pending release gates.

## Screen evaluation

The professional flow needs **12 screens/views**. Seven are menu leaf modules;
the remaining five are nested detail/workflow views.

| # | Screen | Route | Menu module | Main responsibility |
| --- | --- | --- | --- | --- |
| 1 | Policy dashboard | `/app/policies/dashboard` | Parent landing | Counts, expiring policies, pending approvals and acknowledgements |
| 2 | Policy types | `/app/policies/types` | Policy Types | Tenant policy-type CRUD and category mapping |
| 3 | Policy list | `/app/policies` | Policy Definitions | Search, status, effective date and current version |
| 4 | Policy editor wizard | `/app/policies/new` and `/:id/edit` | Nested | Identity, rules, applicability, documents and validation |
| 5 | Version history | `/app/policies/:id/versions` | Nested | Compare, clone and inspect immutable versions |
| 6 | Applicability preview | `/app/policies/:id/applicability` | Nested | Test which employees/locations match before publish |
| 7 | Assignments | `/app/policies/assignments` | Policy Assignments | Resolved assignments, manual assign/remove and bulk import |
| 8 | Exceptions | `/app/policies/exceptions` | Policy Exceptions | Temporary overrides and approval status |
| 9 | Approval inbox | `/app/policies/approvals` | Policy Approvals | Review, approve, reject and publish |
| 10 | Acknowledgements | `/app/policies/acknowledgements` | Policy Acknowledgements | Delivery, viewed/accepted status and reminders |
| 11 | Audit | `/app/policies/audit` | Policy Audit | Before/after evidence and export |
| 12 | Bulk import/report dialog | contextual | Nested | Template, upload, preview, confirm, progress and report |

Documents belong inside the policy editor/version viewer, so a separate document
menu is unnecessary. Category, status, rule type and document type are lookup data.

## Editor wizard sections

1. Basic information: type, code, name, owner, currency and summary.
2. Version: version number, effective dates and change summary.
3. Rules: typed rule cards with schema-driven fields; custom JSON is an advanced option.
4. Applicability: include/exclude geography and organization filters with priority.
5. Documents: upload, language, visibility, checksum and document type.
6. Preview: matched employee count, conflicts and validation warnings.
7. Submission: approval route and final confirmation.

## Permission behavior

UI must discover ModuleId and OperationId from the authenticated menu/permission
response. Numeric IDs must never be hard-coded. Hide or disable actions according
to operations mapped to each module. A valid authenticated user without an action
must receive 403 when endpoints are implemented; invalid/expired authentication remains 401.

## API handoff

The implemented API groups cover lookups, policy types, policy drafts, version
cloning, rules/applicability replacement, approval stages and progress, lifecycle
transitions, resolution, assignments, exceptions and acknowledgements. Exact contracts are maintained in
[TENANT_POLICY_API.md](TENANT_POLICY_API.md).
