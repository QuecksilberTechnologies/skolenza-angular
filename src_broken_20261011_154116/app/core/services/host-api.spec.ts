import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';

import { AccessBootstrapApi } from './access-bootstrap-api';
import { HostApi } from './host-api';

describe('Platform administration API compatibility', () => {
  let hostApi: HostApi;
  let accessApi: AccessBootstrapApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        HostApi,
        AccessBootstrapApi,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    hostApi = TestBed.inject(HostApi);
    accessApi = TestBed.inject(AccessBootstrapApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('uses the Platform alias for users and roles without changing action contracts', () => {
    hostApi.getHostRoles().subscribe();

    const roles = httpMock.expectOne(`${environment.apiUrl}/Platform/get-all-host-roles`);
    expect(roles.request.method).toBe('GET');
    roles.flush({ isSucceeded: true, message: '', errors: [], data: [] });

    hostApi.getHostRoleModulePermissions(7).subscribe();

    const permissions = httpMock.expectOne(
      (request) =>
        request.url ===
        `${environment.apiUrl}/PlatformRolePermission/get-role-module-permissions/7`,
    );
    expect(permissions.request.method).toBe('GET');
    expect(permissions.request.params.get('isActive')).toBe('true');
    permissions.flush({ isSucceeded: true, message: '', errors: [], data: [] });
  });

  it('uses the token-scoped Platform access alias', () => {
    accessApi.getHostBootstrap().subscribe();

    const request = httpMock.expectOne(`${environment.apiUrl}/PlatformAccess/bootstrap`);
    expect(request.request.method).toBe('GET');
    request.flush({ isSucceeded: true, message: '', errors: [], data: null });
  });
});
