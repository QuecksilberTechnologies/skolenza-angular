import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { vi } from 'vitest';

import { Common } from '@core/services';
import { CurrentUserPermissionsStore } from '@core/stores';

import { superAdminGuard } from './super-admin-guard';

const REDIRECT_TO = '/app/setting/appearance';

function runGuard() {
  return TestBed.runInInjectionContext(() =>
    superAdminGuard(REDIRECT_TO)({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  ) as Promise<boolean | UrlTree>;
}

describe('superAdminGuard', () => {
  const commonMock = { showMessage: vi.fn() };
  const urlTree = {} as UrlTree;
  const routerMock = { parseUrl: vi.fn().mockReturnValue(urlTree) };

  let isSuperAdmin = false;
  let ensureLoaded: ReturnType<typeof vi.fn>;

  function configure(superAdmin: boolean) {
    isSuperAdmin = false;
    // The flag is only patched once the permission load resolves — mirroring the store,
    // so a guard that reads it too early would fail this test.
    ensureLoaded = vi.fn().mockImplementation(async () => {
      isSuperAdmin = superAdmin;
    });

    TestBed.configureTestingModule({
      providers: [
        { provide: Common, useValue: commonMock },
        { provide: Router, useValue: routerMock },
        {
          provide: CurrentUserPermissionsStore,
          useValue: {
            ensureLoaded,
            isSuperAdmin: () => isSuperAdmin,
          },
        },
      ],
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should let a super admin through', async () => {
    configure(true);

    await expect(runGuard()).resolves.toBe(true);
    expect(ensureLoaded).toHaveBeenCalled();
    expect(commonMock.showMessage).not.toHaveBeenCalled();
    expect(routerMock.parseUrl).not.toHaveBeenCalled();
  });

  it('should redirect everyone else to the fallback tab instead of the dashboard', async () => {
    configure(false);

    await expect(runGuard()).resolves.toBe(urlTree);
    expect(routerMock.parseUrl).toHaveBeenCalledWith(REDIRECT_TO);
    expect(commonMock.showMessage).toHaveBeenCalledWith(
      'Only a super admin can manage these settings',
      'error',
    );
  });

  it('should wait for permissions to load before deciding', async () => {
    configure(true);

    const result = await runGuard();

    expect(ensureLoaded).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
  });
});
