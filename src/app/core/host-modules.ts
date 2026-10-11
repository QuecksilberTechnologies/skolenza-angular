/** `moduleName` values from `GET /Host/get-host-modules` (`moduleScope: 2`).
 *
 *  These are the keys `hasModulePermissionGuard()` and `CurrentUserPermissionsStore`
 *  match against for host sessions — they must stay byte-identical to the backend.
 *
 *  The catalog has no module of its own for the Institutions screen or for Modules
 *  management, so both ride the parent `Host` key — one grant therefore covers
 *  both screens until the backend models them separately.
 */
export const HOST_MODULE = {
  /** Parent module — covers host management as a whole. */
  host: 'Host',
  hostUser: 'HostUser',
  hostRole: 'HostRole',
  subscriptionPlan: 'Subscription-Plan',
  billing: 'Billing',
} as const;
