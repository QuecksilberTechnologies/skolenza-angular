import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject, isDevMode } from '@angular/core';
import { from, switchMap } from 'rxjs';

import { ModuleCodeCandidates } from '@core/feature-page-identifiers';
import { FeaturePageStore } from '@core/stores';

import { ModuleOperationRoute, resolveModuleOperationRoute } from './module-operation-routes';

type FeaturePages = InstanceType<typeof FeaturePageStore>;

/**
 * Attaches the `ModuleId` / `OperationId` the API authorises against, so no call site has to
 * remember to. Every request whose controller `resolveModuleOperationRoute` recognises is touched —
 * an explicit `MODULE_OPERATION_ROUTES` row where one exists, the controller-level fallback
 * otherwise.
 *
 * The ids come from `GET /Navigation/my-menu` via `FeaturePageStore`, keyed on the leaf page's
 * `moduleCode` — not from `Institution/get-all-institution-operations`, which is a different id space and is
 * empty for a live institution.
 *
 * `DENY_CONTROLLERS` is load-bearing: `Navigation/my-menu` is on it, so the request this
 * interceptor may park on can never park on itself. `Institution/get-all-institution-operations` and
 * `Auth/refresh-token` are denied for the same reason one step removed — a parked request 401s,
 * `authInterceptor` refreshes through a fresh call that re-enters this chain, and that refresh
 * would then wait on the request it is trying to unblock.
 */
export const moduleOperationInterceptor: HttpInterceptorFn = (req, next) => {
  const route = resolveModuleOperationRoute(req.method, req.url);
  if (!route) return next(req);

  const featurePages = inject(FeaturePageStore);

  // A tree is already in hand — hydrated synchronously from localStorage in the store's `onInit`,
  // or fetched at login. Dispatch on this tick rather than hop a microtask. A stale tree still
  // resolves the right ids; the aside menu owns revalidation.
  if (featurePages.isLoaded()) {
    return next(withIdentifiers(req, route, featurePages));
  }

  // Cold start with a cleared cache. `ensureLoaded()` de-dupes the whole first wave onto one
  // request, resolves on success, on an empty payload and on failure, and never rejects — so a
  // request can neither idle forever nor inherit a poisoned promise: the store drops its memo
  // unconditionally, so the next request after a failure retries.
  return from(featurePages.ensureLoaded()).pipe(
    switchMap(() => next(withIdentifiers(req, route, featurePages))),
  );
};

function withIdentifiers(
  req: HttpRequest<unknown>,
  route: ModuleOperationRoute,
  featurePages: FeaturePages,
): HttpRequest<unknown> {
  const candidates = typeof route.module === 'function' ? route.module(req.body) : route.module;
  // A dynamic module the body did not name. Send it bare rather than guess a tab.
  if (!candidates || !candidates.length) return req;

  const { ModuleId, OperationId } = featurePages.moduleOperationIds(candidates, route.operation);

  // Nothing resolved — send the request bare. An absent param is the honest "we don't know"; a
  // zero or an empty string is a value the API would try to authorise against.
  if (ModuleId === undefined && OperationId === undefined) return req;

  if (isDevMode() && OperationId === undefined) {
    warnUnresolvedOperation(route, candidates, featurePages);
  }

  switch (route.carrier) {
    case 'query':
      return withQueryIdentifiers(req, ModuleId, OperationId);
    case 'permissionRequest':
      return withPermissionRequestIdentifiers(req, ModuleId, OperationId);
    default:
      return withBodyIdentifiers(req, ModuleId, OperationId);
  }
}

/**
 * The page resolved and the operation did not. Two causes, and the tree cannot tell them apart: the
 * row names an operation this page never publishes, or this session was simply not granted it —
 * `my-menu` lists only granted operations. Silent in production, loud here, because the first is
 * otherwise invisible until a 403 that reads like the second.
 */
function warnUnresolvedOperation(
  route: ModuleOperationRoute,
  candidates: ModuleCodeCandidates,
  featurePages: FeaturePages,
): void {
  console.warn(
    `[moduleOperation] ${route.method} ${route.path}: ` +
      `"${featurePages.resolvedModuleCode(candidates, route.operation)}" publishes no ` +
      `"${route.operation}" operation for this session. Either the row is wrong or the ` +
      `operation is not granted — check the leaf in GET /Navigation/my-menu.`,
  );
}

/**
 * Params passed through the `params` option and params a call site baked into the URL land in two
 * different places, and `resolveModuleOperationRoute` deliberately matches URLs carrying the
 * second. Reading only `req.params` would append a duplicate the API resolves arbitrarily.
 *
 * Compared case-insensitively because ASP.NET query binding is: a hand-written `?moduleId=99`
 * still counts as the call site having set it.
 */
function hasQueryParam(req: HttpRequest<unknown>, key: string): boolean {
  const query = req.urlWithParams.split('?')[1];
  if (query === undefined) return false;

  const wanted = key.toLowerCase();
  for (const name of new URLSearchParams(query).keys()) {
    if (name.toLowerCase() === wanted) return true;
  }

  return false;
}

function withQueryIdentifiers(
  req: HttpRequest<unknown>,
  moduleId: number | undefined,
  operationId: number | undefined,
): HttpRequest<unknown> {
  let params = req.params;

  if (moduleId !== undefined && !hasQueryParam(req, 'ModuleId')) {
    params = params.set('ModuleId', moduleId);
  }
  if (operationId !== undefined && !hasQueryParam(req, 'OperationId')) {
    params = params.set('OperationId', operationId);
  }

  return params === req.params ? req : req.clone({ params });
}

function withBodyIdentifiers(
  req: HttpRequest<unknown>,
  moduleId: number | undefined,
  operationId: number | undefined,
): HttpRequest<unknown> {
  const body = req.body;

  if (body instanceof FormData) {
    // The caller owns this instance and may still hold a reference to it, and `append` is not
    // idempotent — copy before adding anything.
    const copy = new FormData();
    body.forEach((value, key) => copy.append(key, value));

    if (moduleId !== undefined && !copy.has('ModuleId')) copy.append('ModuleId', String(moduleId));
    if (operationId !== undefined && !copy.has('OperationId')) {
      copy.append('OperationId', String(operationId));
    }

    return req.clone({ body: copy });
  }

  // A body carrier with no body at all: seed one, or the ids vanish silently — the exact failure
  // this interceptor exists to remove.
  if (body === null || body === undefined) {
    return req.clone({
      body: {
        ...(moduleId !== undefined ? { moduleId } : {}),
        ...(operationId !== undefined ? { operationId } : {}),
      },
    });
  }

  if (!isMergeableBody(body)) {
    // A string, array, blob or binary body: there is nothing to spread two fields onto. Fall back
    // to the query string rather than drop them — never worse than sending nothing, and the
    // warning is what gets the row's carrier corrected.
    return withUnmergeableBodyFallback(req, moduleId, operationId, 'body');
  }

  const merged: Record<string, unknown> = { ...body };
  if (moduleId !== undefined && merged['moduleId'] === undefined) merged['moduleId'] = moduleId;
  if (operationId !== undefined && merged['operationId'] === undefined) {
    merged['operationId'] = operationId;
  }

  return req.clone({ body: merged });
}

/**
 * The unmergeable-body escape hatch shared by both body carriers: warn once in dev, then fall back
 * to the query string rather than drop the ids.
 */
function withUnmergeableBodyFallback(
  req: HttpRequest<unknown>,
  moduleId: number | undefined,
  operationId: number | undefined,
  carrier: 'body' | 'permissionRequest',
): HttpRequest<unknown> {
  if (isDevMode()) {
    console.warn(
      `[moduleOperation] ${req.method} ${req.url}: ${carrier} carrier with an unmergeable body ` +
        `(${typeof req.body}) — sending the ids on the query string instead.`,
    );
  }

  return withQueryIdentifiers(req, moduleId, operationId);
}

/**
 * The same two ids, one level down inside a `permissionRequest` object.
 *
 * `/DefaultEmailConfig/create` and `/update` model the pair as a nested `PermissionRequestDTO`, so
 * the flat writer above would put them where ASP.NET binds nothing. A `permissionRequest` the call
 * site already set is left alone, for the same reason the flat writer skips keys it finds.
 */
function withPermissionRequestIdentifiers(
  req: HttpRequest<unknown>,
  moduleId: number | undefined,
  operationId: number | undefined,
): HttpRequest<unknown> {
  const identifiers = {
    ...(moduleId !== undefined ? { moduleId } : {}),
    ...(operationId !== undefined ? { operationId } : {}),
  };

  const body = req.body;

  // A body carrier with no body at all: seed one, or the ids vanish silently.
  if (body === null || body === undefined) {
    return req.clone({ body: { permissionRequest: identifiers } });
  }

  // `FormData` passes `isMergeableBody`, and spreading one yields an empty object — the whole
  // payload would vanish. It has no nesting to offer either way, so it goes on the query string.
  if (body instanceof FormData || !isMergeableBody(body)) {
    return withUnmergeableBodyFallback(req, moduleId, operationId, 'permissionRequest');
  }

  if (body['permissionRequest'] !== undefined) return req;

  return req.clone({ body: { ...body, permissionRequest: identifiers } });
}

/** A body we can spread two fields onto — not an array, a string, a blob or a binary buffer. */
function isMergeableBody(body: unknown): body is Record<string, unknown> {
  return (
    typeof body === 'object' &&
    !Array.isArray(body) &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer) &&
    !ArrayBuffer.isView(body) &&
    !(body instanceof URLSearchParams)
  );
}
