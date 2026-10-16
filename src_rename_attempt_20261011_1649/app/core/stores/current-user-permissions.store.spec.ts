import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { AccessBootstrapApi, HostApi, RolesApi, InstitutionsApi } from '@core/services';
import { LoginInfo, SessionUser } from '@shared/interfaces';

import { CurrentUserPermissionsStore } from './current-user-permissions.store';

function createLoginInfo(overrides: Partial<LoginInfo> = {}): LoginInfo {
  return {
    userType: 'InstitutionStaffMember',
    accessToken: 'tok',
    refreshToken: 'rtok',
    accessTokenExpiresAtUtc: '',
    refreshTokenExpiresAtUtc: '',
    user: {
      primaryRole: { roleId: 10, roleName: 'Manager', roleTypeId: 2, roleTypeName: 'StaffMember' },
    } as SessionUser,
    ...overrides,
  };
}

/** Trimmed from the live `/InstitutionUserAccess/bootstrap` response. */
function institutionBootstrapResponse() {
  return {
    isSucceeded: true,
    message: 'Institution user access retrieved successfully.',
    errors: [],
    data: {
      operationalMenus: [
        {
          mainModuleId: 1,
          mainModuleName: 'HR-Management',
          subModules: [
            {
              subModuleId: 2,
              subModuleName: 'StaffMember-Management',
              modules: [
                {
                  moduleId: 3,
                  moduleName: 'StaffMember',
                  displayName: 'StaffMember onboard',
                  imageIconWeb: null,
                  imageIconMobile: null,
                  path: null,
                  subModuleURL: 'staffMember-onboard',
                  iconURL: null,
                  dataViewStructureId: 1,
                  displayOn: 'Left-Menu',
                  operations: [
                    { operationId: 1, operationName: 'Add' },
                    { operationId: 2, operationName: 'Update' },
                    { operationId: 4, operationName: 'View' },
                    { operationId: 5, operationName: 'Approve' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

describe('CurrentUserPermissionsStore', () => {
  const rolesApiMock = { getRoleBasedPermissions: vi.fn() };
  const institutionsApiMock = { getInstitutionOperations: vi.fn() };
  const hostApiMock = { getHostRoleModulePermissions: vi.fn(), getHostUserById: vi.fn() };
  const accessApiMock = { getHostBootstrap: vi.fn(), getInstitutionBootstrap: vi.fn() };

  function storeHostLogin(hostRoleId: number): void {
    localStorage.setItem(
      'skolenza/loginInfo',
      JSON.stringify(
        createLoginInfo({
          userType: 'Host',
          user: null as unknown as SessionUser,
          hostUser: {
            hostUserId: 6,
            name: 'Host User',
            loginId: 'host@skolenza.in',
            email: 'host@skolenza.in',
          },
          hostRole: { hostRoleId, name: 'Host Role' },
        }),
      ),
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Backend default while the bootstrap endpoints are still being populated:
    // host answers with an empty catalog, institution 500s. Both fall back to the legacy path.
    accessApiMock.getHostBootstrap.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: { modules: [] } }),
    );
    accessApiMock.getInstitutionBootstrap.mockReturnValue(throwError(() => new Error('500')));
    hostApiMock.getHostUserById.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: { hostRoleId: 5 } }),
    );
    rolesApiMock.getRoleBasedPermissions.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [] }),
    );
    institutionsApiMock.getInstitutionOperations.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: { modules: [] } }),
    );
    hostApiMock.getHostRoleModulePermissions.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        errors: [],
        data: {
          hostRoleId: 5,
          hostRoleName: 'Support',
          modules: [
            {
              moduleId: 62,
              moduleName: 'HostUser',
              operations: [
                {
                  moduleOperationMappingId: 1,
                  operationId: 4,
                  operationName: 'View',
                  isAllowed: true,
                },
                {
                  moduleOperationMappingId: 2,
                  operationId: 3,
                  operationName: 'Delete',
                  isAllowed: false,
                },
              ],
            },
          ],
        },
      }),
    );

    TestBed.configureTestingModule({
      providers: [
        { provide: AccessBootstrapApi, useValue: accessApiMock },
        { provide: RolesApi, useValue: rolesApiMock },
        { provide: InstitutionsApi, useValue: institutionsApiMock },
        { provide: HostApi, useValue: hostApiMock },
      ],
    });
  });

  it('should treat the seeded host role as super admin without calling any permission API', async () => {
    storeHostLogin(1);

    const store = TestBed.inject(CurrentUserPermissionsStore);
    await store.loadFromStorage();

    expect(store.isSuperAdmin()).toBe(true);
    expect(store.isHostSession()).toBe(true);
    expect(accessApiMock.getHostBootstrap).not.toHaveBeenCalled();
    expect(hostApiMock.getHostRoleModulePermissions).not.toHaveBeenCalled();
    expect(rolesApiMock.getRoleBasedPermissions).not.toHaveBeenCalled();
  });

  it('should load host role permissions for a non-super-admin host', async () => {
    storeHostLogin(5);

    const store = TestBed.inject(CurrentUserPermissionsStore);
    await store.loadFromStorage();
    await store.ensureLoaded();

    expect(store.isSuperAdmin()).toBe(false);
    expect(store.isHostSession()).toBe(true);
    expect(hostApiMock.getHostRoleModulePermissions).toHaveBeenCalledWith(5);
    expect(rolesApiMock.getRoleBasedPermissions).not.toHaveBeenCalled();
    expect(store.canPerform('HostUser', 'View')).toBe(true);
    expect(store.canPerform('HostUser', 'Delete')).toBe(false);
    // Closed catalog: a module absent from the host response is denied, not assumed untracked.
    expect(store.canAccessOrUnknown('Institutions')).toBe(false);
  });

  it('should flag a failed host load instead of passing it off as an empty catalog', async () => {
    storeHostLogin(5);
    const success = hostApiMock.getHostRoleModulePermissions(5);
    hostApiMock.getHostRoleModulePermissions.mockClear();
    hostApiMock.getHostRoleModulePermissions.mockReturnValue(throwError(() => new Error('boom')));

    const store = TestBed.inject(CurrentUserPermissionsStore);
    await store.loadFromStorage();

    expect(store.hasLoadFailed()).toBe(true);
    expect(store.isLoaded()).toBe(false);

    // The next guard retries rather than denying for the rest of the session.
    hostApiMock.getHostRoleModulePermissions.mockReturnValue(success);
    await store.ensureLoaded();

    expect(store.hasLoadFailed()).toBe(false);
    expect(store.isLoaded()).toBe(true);
    expect(store.canPerform('HostUser', 'View')).toBe(true);
  });

  it('should load role permissions for an staffMember', async () => {
    localStorage.setItem('skolenza/loginInfo', JSON.stringify(createLoginInfo()));

    const store = TestBed.inject(CurrentUserPermissionsStore);
    await store.loadFromStorage();

    expect(store.isSuperAdmin()).toBe(false);
    expect(rolesApiMock.getRoleBasedPermissions).toHaveBeenCalledWith(10);
  });

  it('should prefer the host bootstrap over the legacy role-permission call', async () => {
    storeHostLogin(5);
    accessApiMock.getHostBootstrap.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        errors: [],
        data: {
          modules: [
            {
              moduleId: 62,
              moduleName: 'HostUser',
              operations: [
                {
                  moduleOperationMappingId: 1,
                  operationId: 4,
                  operationName: 'View',
                  isAllowed: true,
                },
                {
                  moduleOperationMappingId: 2,
                  operationId: 3,
                  operationName: 'Add',
                  isAllowed: false,
                },
              ],
            },
          ],
        },
      }),
    );

    const store = TestBed.inject(CurrentUserPermissionsStore);
    await store.loadFromStorage();
    await store.ensureLoaded();

    expect(accessApiMock.getHostBootstrap).toHaveBeenCalled();
    expect(hostApiMock.getHostRoleModulePermissions).not.toHaveBeenCalled();
    expect(store.canPerform('HostUser', 'View')).toBe(true);
    expect(store.canPerform('HostUser', 'Add')).toBe(false);
  });

  it('resolves a module id for a super admin, whose grant matrix is empty', async () => {
    localStorage.setItem(
      'skolenza/loginInfo',
      JSON.stringify(
        createLoginInfo({
          user: {
            primaryRole: {
              roleId: 1,
              roleName: 'Super Admin',
              roleTypeId: 1,
              roleTypeName: 'Admin',
            },
          } as SessionUser,
        }),
      ),
    );
    institutionsApiMock.getInstitutionOperations.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        errors: [],
        data: {
          modules: [
            {
              id: 19,
              moduleName: 'Institution Locations',
              isEnabled: true,
              operations: [
                { id: 4, operationName: 'View', operationType: 1, isEnabled: true },
                { id: 3, operationName: 'Delete', operationType: 1, isEnabled: true },
              ],
            },
            { id: 8, moduleName: 'StaffMembers', isEnabled: true, operations: [] },
          ],
        },
      }),
    );

    const store = TestBed.inject(CurrentUserPermissionsStore);
    await store.loadFromStorage();

    expect(store.isSuperAdmin()).toBe(true);
    // Resolved from the unfiltered catalog, so a module the grant matrix never lists still
    // yields ids instead of sending the request without them and taking a 403.
    expect(store.identifiersOf('Institution Locations', 'View')).toEqual({
      ModuleId: 19,
      OperationId: 4,
    });
    expect(store.identifiersOf('institution locations', 'delete')).toEqual({
      ModuleId: 19,
      OperationId: 3,
    });
    // Catalog lists the module but not this operation, and this session's grant matrix is empty
    // too, so there is genuinely no id to send. The grant-matrix fallback is covered by the host
    // test, which resolves an operation id the catalog never carries.
    expect(store.identifiersOf('StaffMembers', 'View')).toEqual({
      ModuleId: 8,
      OperationId: undefined,
    });
    expect(store.identifiersOf('Nope', 'View')).toEqual({
      ModuleId: undefined,
      OperationId: undefined,
    });
  });

  it('marks the catalog settled even when the institution has no modules', async () => {
    localStorage.setItem('skolenza/loginInfo', JSON.stringify(createLoginInfo()));
    // The live shape for an unprovisioned institution. Gating on rows rather than on completion
    // would leave every resource idle forever.
    institutionsApiMock.getInstitutionOperations.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: { institutionId: 54, modules: [] } }),
    );

    const store = TestBed.inject(CurrentUserPermissionsStore);
    await store.loadFromStorage();
    await store.ensureCatalogLoaded();

    expect(store.isCatalogReady()).toBe(true);
    expect(store.moduleCatalog()).toEqual([]);
  });

  it('marks the catalog settled when the fetch fails', async () => {
    localStorage.setItem('skolenza/loginInfo', JSON.stringify(createLoginInfo()));
    institutionsApiMock.getInstitutionOperations.mockReturnValue(throwError(() => new Error('boom')));

    const store = TestBed.inject(CurrentUserPermissionsStore);
    await store.loadFromStorage();
    await store.ensureCatalogLoaded();

    expect(store.isCatalogReady()).toBe(true);
  });

  it('keeps an empty catalog memoised rather than refetching it', async () => {
    localStorage.setItem('skolenza/loginInfo', JSON.stringify(createLoginInfo()));
    institutionsApiMock.getInstitutionOperations.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: { institutionId: 54, modules: [] } }),
    );

    const store = TestBed.inject(CurrentUserPermissionsStore);
    await store.loadFromStorage();
    await store.ensureCatalogLoaded();
    const settled = institutionsApiMock.getInstitutionOperations.mock.calls.length;

    await store.ensureCatalogLoaded();

    // An empty catalog is a settled answer — refetching it on every call would hammer the endpoint.
    expect(institutionsApiMock.getInstitutionOperations).toHaveBeenCalledTimes(settled);
  });

  it('ensureCatalogLoaded is memoised once the catalog has settled', async () => {
    localStorage.setItem('skolenza/loginInfo', JSON.stringify(createLoginInfo()));

    const store = TestBed.inject(CurrentUserPermissionsStore);
    await store.loadFromStorage();
    await store.ensureCatalogLoaded();
    const settled = institutionsApiMock.getInstitutionOperations.mock.calls.length;

    await store.ensureCatalogLoaded();
    await store.ensureCatalogLoaded();

    expect(institutionsApiMock.getInstitutionOperations).toHaveBeenCalledTimes(settled);
  });

  it('retries the catalog fetch after a failure', async () => {
    localStorage.setItem('skolenza/loginInfo', JSON.stringify(createLoginInfo()));
    institutionsApiMock.getInstitutionOperations.mockReturnValue(throwError(() => new Error('boom')));

    const store = TestBed.inject(CurrentUserPermissionsStore);
    await store.loadFromStorage();
    await store.ensureCatalogLoaded();
    const afterFailure = institutionsApiMock.getInstitutionOperations.mock.calls.length;

    institutionsApiMock.getInstitutionOperations.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        errors: [],
        data: {
          modules: [{ id: 8, moduleName: 'StaffMembers', isEnabled: true, operations: [] }],
        },
      }),
    );
    await store.ensureCatalogLoaded();

    // A failed fetch marks the catalog settled so nothing idles, but it must not read as a settled
    // answer: one transient failure would otherwise leave every id unresolved for the session.
    expect(institutionsApiMock.getInstitutionOperations.mock.calls.length).toBeGreaterThan(afterFailure);
    expect(store.moduleCatalog().length).toBeGreaterThan(0);
  });

  it('never fetches the institution catalog when a host session awaits it', async () => {
    storeHostLogin(5);

    const store = TestBed.inject(CurrentUserPermissionsStore);
    await store.loadFromStorage();
    await store.ensureCatalogLoaded();

    expect(institutionsApiMock.getInstitutionOperations).not.toHaveBeenCalled();
  });

  it('never fetches the institution catalog for a host session', async () => {
    storeHostLogin(5);

    const store = TestBed.inject(CurrentUserPermissionsStore);
    await store.loadFromStorage();
    await store.ensureLoaded();

    // A host has no institution, so the call would 403 and toast on every host login. Host ids come
    // from the grant matrix instead, via the fallback in `identifiersOf`.
    expect(institutionsApiMock.getInstitutionOperations).not.toHaveBeenCalled();
    // Still settled, or every catalog-gated resource would idle forever for a host.
    expect(store.isCatalogReady()).toBe(true);
    expect(store.identifiersOf('HostUser', 'View')).toEqual({ ModuleId: 62, OperationId: 4 });
  });

  it('should prefer the institution bootstrap over the legacy two-call join', async () => {
    localStorage.setItem('skolenza/loginInfo', JSON.stringify(createLoginInfo()));
    accessApiMock.getInstitutionBootstrap.mockReturnValue(of(institutionBootstrapResponse()));

    const store = TestBed.inject(CurrentUserPermissionsStore);
    await store.loadFromStorage();
    await store.ensureLoaded();

    expect(accessApiMock.getInstitutionBootstrap).toHaveBeenCalled();
    // The legacy join is what must not run. `getInstitutionOperations` is still called on its own,
    // for the unfiltered `moduleCatalog` that `ModuleId` resolution needs.
    expect(rolesApiMock.getRoleBasedPermissions).not.toHaveBeenCalled();
    // Only granted operations are listed, so presence is the grant.
    expect(store.canPerform('StaffMember', 'Approve')).toBe(true);
    expect(store.canPerform('StaffMember', 'Add')).toBe(true);
    expect(store.canPerform('StaffMember', 'Export')).toBe(false);
    expect(store.canAccess('StaffMember')).toBe(true);
    // Institution catalogs stay open: a module the backend does not model is still reachable.
    expect(store.canAccessOrUnknown('Leaves')).toBe(true);
  });

  it('should union a leaf module reached through more than one sub-module', async () => {
    localStorage.setItem('skolenza/loginInfo', JSON.stringify(createLoginInfo()));
    const payload = institutionBootstrapResponse();
    payload.data.operationalMenus[0].subModules.push({
      subModuleId: 9,
      subModuleName: 'Payroll-Management',
      modules: [
        {
          ...payload.data.operationalMenus[0].subModules[0].modules[0],
          operations: [{ operationId: 3, operationName: 'Delete' }],
        },
      ],
    });
    accessApiMock.getInstitutionBootstrap.mockReturnValue(of(payload));

    const store = TestBed.inject(CurrentUserPermissionsStore);
    await store.loadFromStorage();
    await store.ensureLoaded();

    // Both slices of the same moduleId survive instead of the first one winning.
    expect(store.canPerform('StaffMember', 'Approve')).toBe(true);
    expect(store.canPerform('StaffMember', 'Delete')).toBe(true);
    expect(store.moduleNames()).toEqual(['StaffMember']);
  });

  it('should not touch the bootstrap when there is no session', async () => {
    const store = TestBed.inject(CurrentUserPermissionsStore);
    await store.loadFromStorage();

    expect(accessApiMock.getInstitutionBootstrap).not.toHaveBeenCalled();
    expect(accessApiMock.getHostBootstrap).not.toHaveBeenCalled();
    expect(store.isLoaded()).toBe(false);
    expect(store.hasLoadFailed()).toBe(false);
  });

  it('should short-circuit a super admin whose login payload omits the host role', async () => {
    localStorage.setItem(
      'skolenza/loginInfo',
      JSON.stringify(
        createLoginInfo({
          userType: 'Host',
          user: null as unknown as SessionUser,
          hostUser: {
            hostUserId: 6,
            name: 'Host User',
            loginId: 'host@skolenza.in',
            email: 'host@skolenza.in',
          },
        }),
      ),
    );
    hostApiMock.getHostUserById.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: { hostRoleId: 1 } }),
    );

    const store = TestBed.inject(CurrentUserPermissionsStore);
    await store.loadFromStorage();
    await store.ensureLoaded();

    expect(store.isSuperAdmin()).toBe(true);
    expect(accessApiMock.getHostBootstrap).not.toHaveBeenCalled();
    expect(hostApiMock.getHostRoleModulePermissions).not.toHaveBeenCalled();
  });

  it('should fall back to the legacy host call when the bootstrap returns an empty catalog', async () => {
    storeHostLogin(5);

    const store = TestBed.inject(CurrentUserPermissionsStore);
    await store.loadFromStorage();
    await store.ensureLoaded();

    expect(accessApiMock.getHostBootstrap).toHaveBeenCalled();
    expect(hostApiMock.getHostRoleModulePermissions).toHaveBeenCalledWith(5);
    expect(store.canPerform('HostUser', 'View')).toBe(true);
  });

  it('should recover the host role id when the login payload omits it', async () => {
    localStorage.setItem(
      'skolenza/loginInfo',
      JSON.stringify(
        createLoginInfo({
          userType: 'Host',
          user: null as unknown as SessionUser,
          hostUser: {
            hostUserId: 6,
            name: 'Host User',
            loginId: 'host@skolenza.in',
            email: 'host@skolenza.in',
          },
        }),
      ),
    );

    const store = TestBed.inject(CurrentUserPermissionsStore);
    await store.loadFromStorage();
    await store.ensureLoaded();

    expect(hostApiMock.getHostUserById).toHaveBeenCalledWith(6);
    expect(hostApiMock.getHostRoleModulePermissions).toHaveBeenCalledWith(5);
  });
});
