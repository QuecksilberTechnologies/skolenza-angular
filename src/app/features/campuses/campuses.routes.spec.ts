import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { describe, expect, it, vi } from 'vitest';

import { AuthApi } from '@core/services/auth-api';
import { Common } from '@core/services/common';
import { CurrentUserPermissionsStore } from '@core/stores';

import { INSTITUTION_CAMPUSES_ROUTES } from './campuses.routes';

describe('Campus form route permissions', () => {
  it.each([
    ['new', 'Add'],
    [':campusId/edit', 'Update'],
  ])('checks the Campus %s route against its %s permission', async (path, operation) => {
    let permitted = true;
    const canPerform = vi.fn(
      (module: string, action: string) =>
        permitted && module === 'Campuses' && action === operation,
    );
    const denied = {} as UrlTree;
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CurrentUserPermissionsStore,
          useValue: { ensureLoaded: async () => {}, canPerform, hasLoadFailed: () => false },
        },
        { provide: AuthApi, useValue: { redirectToDashboard: vi.fn() } },
        { provide: Common, useValue: { showMessage: vi.fn() } },
        { provide: Router, useValue: { createUrlTree: vi.fn().mockReturnValue(denied) } },
      ],
    });

    const guard = INSTITUTION_CAMPUSES_ROUTES.find((route) => route.path === path)!
      .canActivate![0] as CanActivateFn;
    const result = TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
    await expect(result).resolves.toBe(true);
    expect(canPerform).toHaveBeenCalledWith('Campuses', operation);

    permitted = false;
    const deniedResult = TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
    await expect(deniedResult).resolves.toBe(denied);
  });
});
