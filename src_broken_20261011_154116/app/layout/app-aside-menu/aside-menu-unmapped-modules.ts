/**
 * `moduleCode`s `GET /Navigation/my-menu` publishes that are deliberately absent from
 * `ASIDE_MENU_MODULE_UI`, each with the reason.
 *
 * A code missing from the map is silently not rendered, so "we meant that" and "we forgot that"
 * look identical in the sidebar. This table is the difference: it is data rather than a comment, so
 * `aside-menu-module-map.spec.ts` can hold the two sets disjoint and fail the moment a code is
 * listed here and mapped as well.
 *
 * Adding an entry is a decision to keep a granted module out of the menu. Delete the entry when the
 * screen ships and the code earns a row in the map.
 */
export const ASIDE_MENU_UNMAPPED_MODULES: Readonly<Record<string, string>> = {
  // Institution scope - the nine self-service tabs of `/app/profile`. They already render as tabs inside
  // that one page, so mapping them would put nine duplicate links in the menu. Each is its own
  // module because each tab carries its own Verify / Allow Editing grant.
  STAFF_OVERVIEW: 'A tab of /app/profile, not a page of its own.',
  STAFF_BANK_DETAILS: 'A tab of /app/profile, not a page of its own.',
  STAFF_CONTACT_DETAILS: 'A tab of /app/profile, not a page of its own.',
  STAFF_EXPERIENCE: 'A tab of /app/profile, not a page of its own.',
  STAFF_INSURANCE: 'A tab of /app/profile, not a page of its own.',
  STAFF_IDENTITY: 'A tab of /app/profile, not a page of its own.',
  STAFF_QUALIFICATIONS: 'A tab of /app/profile, not a page of its own.',
  STAFF_DEPENDANTS: 'A tab of /app/profile, not a page of its own.',
  STAFF_DOCUMENTS: 'A tab of /app/profile, not a page of its own.',

  // Institution scope - the connection create/edit/delete this code grants lives inside the per-device
  // settings page (`my-devices/:institutionDeviceId/device-settings`), not a list of its own. Mapping it
  // pointed a second leaf at `my-devices` and lit both it and `INSTITUTION_DEVICE_SETUP` at once.
  INSTITUTION_DEVICE_CONFIGURATION:
    'No list screen. Reached as My Devices -> a row -> Device Settings; INSTITUTION_DEVICE_SETUP owns the my-devices leaf.',

  // Host scope - codes with no screen behind them, left out so the sidebar does not link nowhere.
  HOST_DEVICE_INVENTORY:
    '/host/devices is not built. Its parent HOST_DEVICE_MGMT has no other child, so the group drops with it.',
  HOST_INSTITUTION_EMAIL_CONFIG:
    'No host-side institution email administration screen. The institution-scope twin is INSTITUTION_EMAIL_CONFIG.',
  HOST_INSTITUTION_CREATE:
    'Reached as Institutions -> New. The code exists so the create request can resolve its own module and operation (core/interceptors/module-operation-routes.ts).',
  HOST_ROLE_PERMISSIONS:
    'Its route needs a :hostRoleId param (host-roles.routes.ts, permissions/:hostRoleId), so it is a row action on Host Roles.',

  // Institution scope - the rest of the Institution Policy tree (docs/specs/INSTITUTION_POLICY/). Policy Types and
  // Policy Definitions have screens and are mapped, at the module's own `institution-policies` prefix
  // (see the comment on `features.routes.ts`'s `institution-policies` route for why it is not
  // `/app/policies/*`, the prefix the UI planning doc names). Map each leaf below as its screen ships.
  INSTITUTION_POLICY_ASSIGNMENTS:
    'Reached as the Assignments tab of the policy version workspace (institution-policies/:policyId/versions/:versionId). A standalone list screen is still planned at /app/institution-policies/assignments.',
  INSTITUTION_POLICY_EXCEPTIONS:
    'Reached as the Exceptions tab of the policy version workspace. A standalone list screen is still planned at /app/institution-policies/exceptions.',
  INSTITUTION_POLICY_ACKNOWLEDGEMENTS:
    'Reached as the Acknowledgements tab of the policy version workspace. A standalone list screen is still planned at /app/institution-policies/acknowledgements.',
  INSTITUTION_POLICY_AUDIT:
    'Reached as the Audit tab of the policy version workspace. A standalone list screen is still planned at /app/institution-policies/audit.',
};


