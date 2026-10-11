import { environment } from '@env/environment';

/**
 * What the user is told when a screen reaches for a route the deployed API does not serve.
 *
 * One sentence for every such route: the caller cannot distinguish "controller never shipped" from
 * "this one action never shipped", and neither can the user do anything about either.
 */
export const UNAVAILABLE_ROUTE_MESSAGE = 'This feature is not available on the server yet.';

/**
 * Controllers the API does not expose at all - every route under them 404s.
 *
 * Verified twice against `https://skolenza-api.onrender.com` on 2026-09-20: absent from
 * `swagger/v1/swagger.json`, and 404 on the live host while their documented siblings answer
 * 400/401/415. The UI for these features is built and routed; only the backend is missing, so the
 * calls are gated here rather than the screens deleted. Delete a row when its controller ships.
 *
 * Matched on the first path segment after `environment.apiUrl`, lowercased. `Insurance` is the
 * standalone `/api/Insurance` controller, not the live `/api/Staff/Insurance/*` routes, whose
 * first segment is `staffMember`.
 */
const UNAVAILABLE_CONTROLLERS = new Set([
  'attendancepolicy',
  'insurance',
  'leave',
  'leaverule',
  'policymappingleavetype',
  'policytype',
  'policytypeinsurancemap',
]);

/**
 * Single routes whose controller is otherwise live, keyed `METHOD /lowercase/path`.
 *
 * Each has a documented sibling that does something else: `StaffMember/Sensitive` publishes only
 * `Create` and `get`, `UserModuleRolePermission` assigns permissions to a *role* rather than to an
 * staffMember, `Asset` has no assignment route at all, and `TicketHeader` lists headers only by
 * classification. None is a rename, so none can be repointed.
 */
const UNAVAILABLE_ROUTES = new Set([
  'POST /staff-member/sensitive/update',
  'GET /role/get-permissions',
  'POST /usermodulerolepermission/assign-staff-member-permissions',
  'POST /asset/assign-staff-member',
  'POST /staff/insurance/staff-member-insurance-enroll',
  'GET /staff/insurance/get-all-enroll',
  'DELETE /staff/insurance/delete',
  'GET /ticket/ticketheader/get-all',
]);

/**
 * Whether the API is known not to serve this request.
 *
 * Matching is case-insensitive on the path because ASP.NET routing is, and the app does not always
 * spell a route the way the spec does.
 */
export function isUnavailableRoute(method: string, url: string): boolean {
  if (!url.startsWith(environment.apiUrl)) return false;

  // `req.url` excludes params passed through the `params` option, but a call site is free to embed
  // a query string in the URL - strip it so the key stays literal either way.
  const path = url.slice(environment.apiUrl.length).split('?')[0].toLowerCase();

  const controller = path.split('/')[1] ?? '';
  if (UNAVAILABLE_CONTROLLERS.has(controller)) return true;

  return UNAVAILABLE_ROUTES.has(`${method.toUpperCase()} ${path}`);
}

