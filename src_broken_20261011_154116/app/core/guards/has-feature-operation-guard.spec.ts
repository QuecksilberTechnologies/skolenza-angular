import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FeaturePageStore } from '@core/stores';

import { hasFeatureOperationGuard } from './has-feature-operation-guard';

const MODULE = 'INSTITUTION_POLICY_DEFINITIONS';

function runGuard() {
  return TestBed.runInInjectionContext(() =>
    hasFeatureOperationGuard(MODULE, 'Add')(
      {} as ActivatedRouteSnapshot,
      {} as RouterStateSnapshot,
    ),
  ) as Promise<boolean | UrlTree>;
}

describe('hasFeatureOperationGuard', () => {
  const urlTree = {} as UrlTree;
  const routerMock = { createUrlTree: vi.fn().mockReturnValue(urlTree) };

  let permitted = false;
  let canPerformOrUnknown: ReturnType<typeof vi.fn>;

  function configure(options: { permitted: boolean }) {
    permitted = false;
    canPerformOrUnknown = vi.fn(() => permitted);
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerMock },
        {
          provide: FeaturePageStore,
          useValue: {
            // The grant only settles once the tree loads, so a guard that reads it before
            // awaiting whenLoaded() would fail these tests.
            whenLoaded: vi.fn().mockImplementation(async () => {
              permitted = options.permitted;
            }),
            canPerformOrUnknown,
          },
        },
      ],
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lets a granted or unpublished operation through', async () => {
    configure({ permitted: true });

    await expect(runGuard()).resolves.toBe(true);
    expect(canPerformOrUnknown).toHaveBeenCalledWith(MODULE, 'Add');
  });

  it('sends a denied operation to the access-denied page', async () => {
    configure({ permitted: false });

    await expect(runGuard()).resolves.toBe(urlTree);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/app/access-denied'], {
      queryParams: { module: MODULE, operation: 'Add' },
    });
  });
});

