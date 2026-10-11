import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthApi, Common } from '@core/services';
import { CurrentUserPermissionsStore } from '@core/stores';

import { hasModulePermissionGuard } from './has-module-permission-guard';

const MODULE = 'StaffMembers';

function runGuard() {
  return TestBed.runInInjectionContext(() =>
    hasModulePermissionGuard(MODULE)({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  ) as Promise<boolean | UrlTree>;
}

describe('hasModulePermissionGuard', () => {
  const commonMock = { showMessage: vi.fn() };
  const authApiMock = { redirectToDashboard: vi.fn() };
  const urlTree = {} as UrlTree;
  const routerMock = { createUrlTree: vi.fn().mockReturnValue(urlTree) };

  let canAccess = false;
  let loadFailed = false;
  let ensureLoaded: ReturnType<typeof vi.fn>;

  function configure(options: { canAccess: boolean; loadFailed?: boolean }) {
    canAccess = false;
    loadFailed = false;
    // Both flags only settle once the load resolves, so a guard that reads them
    // before awaiting ensureLoaded() would fail these tests.
    ensureLoaded = vi.fn().mockImplementation(async () => {
      canAccess = options.canAccess;
      loadFailed = options.loadFailed ?? false;
    });

    TestBed.configureTestingModule({
      providers: [
        { provide: Common, useValue: commonMock },
        { provide: AuthApi, useValue: authApiMock },
        { provide: Router, useValue: routerMock },
        {
          provide: CurrentUserPermissionsStore,
          useValue: {
            ensureLoaded,
            canAccessOrUnknown: () => canAccess,
            hasLoadFailed: () => loadFailed,
          },
        },
      ],
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should let a permitted module through', async () => {
    configure({ canAccess: true });

    await expect(runGuard()).resolves.toBe(true);
    expect(ensureLoaded).toHaveBeenCalledTimes(1);
    expect(routerMock.createUrlTree).not.toHaveBeenCalled();
    expect(commonMock.showMessage).not.toHaveBeenCalled();
  });

  it('should send a denied module to the access-denied page, naming it', async () => {
    configure({ canAccess: false });

    await expect(runGuard()).resolves.toBe(urlTree);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/app/access-denied'], {
      queryParams: { module: MODULE },
    });
    // The page carries the message, so a toast on top would only repeat it.
    expect(commonMock.showMessage).not.toHaveBeenCalled();
    expect(authApiMock.redirectToDashboard).not.toHaveBeenCalled();
  });

  it('should treat a failed permission load as a transient error, not a denial', async () => {
    configure({ canAccess: false, loadFailed: true });

    await expect(runGuard()).resolves.toBe(false);
    expect(commonMock.showMessage).toHaveBeenCalledWith(
      'Could not load your permissions. Please try again.',
      'error',
    );
    expect(authApiMock.redirectToDashboard).toHaveBeenCalledTimes(1);
    expect(routerMock.createUrlTree).not.toHaveBeenCalled();
  });
});
