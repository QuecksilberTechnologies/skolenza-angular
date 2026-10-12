import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { asCandidateList, ModuleCodeCandidates } from '@core/feature-page-identifiers';
import { FeaturePageStore } from '@core/stores';
import { environment } from '@env/environment';
import { PROFILE_TABS } from '@shared/utilities/common-data';

import { moduleOperationInterceptor } from './module-operation-interceptor';

const IDS = { ModuleId: 3, OperationId: 4 };

describe('moduleOperationInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let isLoaded: WritableSignal<boolean>;
  let moduleOperationIds: ReturnType<typeof vi.fn>;
  let resolvedModuleCode: ReturnType<typeof vi.fn>;
  let ensureLoaded: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    isLoaded = signal(true);
    moduleOperationIds = vi.fn(() => IDS);
    resolvedModuleCode = vi.fn((code: ModuleCodeCandidates) => asCandidateList(code)[0]);
    ensureLoaded = vi.fn(() => Promise.resolve());

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([moduleOperationInterceptor])),
        provideHttpClientTesting(),
        {
          provide: FeaturePageStore,
          useValue: { isLoaded, moduleOperationIds, ensureLoaded, resolvedModuleCode },
        },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('sets PascalCase query params on a query-carrier route', () => {
    http.get(`${environment.apiUrl}/Staff/get-all`).subscribe();

    const { request } = httpMock.expectOne((r) => r.url.endsWith('/Staff/get-all'));
    expect(request.params.get('ModuleId')).toBe('3');
    expect(request.params.get('OperationId')).toBe('4');
    expect(moduleOperationIds).toHaveBeenCalledWith('STAFF_DIRECTORY', 'View');
  });

  it('resolves the profile page rather than the staffMember list on a profile read', () => {
    http.get(`${environment.apiUrl}/Staff/Bank/get`).subscribe();

    httpMock.expectOne((r) => r.url.endsWith('/Staff/Bank/get'));
    expect(moduleOperationIds).toHaveBeenCalledWith('STAFF_BANK_DETAILS', 'View');
  });

  it('adds the attendance-policy page View ids to list requests', () => {
    http.get(`${environment.apiUrl}/AttendancePolicy/get-all`).subscribe();

    const { request } = httpMock.expectOne((r) => r.url.endsWith('/AttendancePolicy/get-all'));
    expect(request.params.get('ModuleId')).toBe('3');
    expect(request.params.get('OperationId')).toBe('4');
    expect(moduleOperationIds).toHaveBeenCalledWith('INSTITUTION_ATTENDANCE_POLICIES', 'View');
  });

  it('adds the attendance-policy Create ids to create requests', () => {
    http
      .post(`${environment.apiUrl}/AttendancePolicy/create`, { policyName: 'Office' })
      .subscribe();

    const { request } = httpMock.expectOne((r) => r.url.endsWith('/AttendancePolicy/create'));
    expect(request.body).toEqual({ policyName: 'Office', moduleId: 3, operationId: 4 });
    expect(moduleOperationIds).toHaveBeenCalledWith('INSTITUTION_ATTENDANCE_POLICIES', 'Create');
  });

  it('adds the staff-employment-type page View ids to option requests', () => {
    http.get(`${environment.apiUrl}/StaffEmploymentType/option`).subscribe();

    const { request } = httpMock.expectOne((r) => r.url.endsWith('/StaffEmploymentType/option'));
    expect(request.params.get('ModuleId')).toBe('3');
    expect(request.params.get('OperationId')).toBe('4');
    expect(moduleOperationIds).toHaveBeenCalledWith('STAFF_EMPLOYMENT_TYPES', 'View');
  });

  it('merges camelCase numbers into a JSON body', () => {
    http.post(`${environment.apiUrl}/Staff/update`, { staffMemberId: 'e1' }).subscribe();

    const { request } = httpMock.expectOne((r) => r.url.endsWith('/Staff/update'));
    expect(request.body).toEqual({ staffMemberId: 'e1', moduleId: 3, operationId: 4 });
  });

  it('appends PascalCase fields to a copy of the caller FormData', () => {
    const body = new FormData();
    body.append('StaffMemberId', 'e1');

    http.post(`${environment.apiUrl}/Staff/Bank/create`, body).subscribe();

    const { request } = httpMock.expectOne((r) => r.url.endsWith('/Staff/Bank/create'));
    const sent = request.body as FormData;
    expect(sent.get('ModuleId')).toBe('3');
    expect(sent.get('StaffMemberId')).toBe('e1');
    // The caller may submit the same instance again — it must not carry the ids.
    expect(body.has('ModuleId')).toBe(false);
  });

  it('tags a sensitive update with the Identity update permission in its FormData body', () => {
    const body = new FormData();
    body.append('StaffMemberId', 'e1');

    http.post(`${environment.apiUrl}/Staff/Sensitive/update`, body).subscribe();

    const { request } = httpMock.expectOne((r) => r.url.endsWith('/Staff/Sensitive/update'));
    const sent = request.body as FormData;
    expect(sent.get('ModuleId')).toBe('3');
    expect(sent.get('OperationId')).toBe('4');
    expect(moduleOperationIds).toHaveBeenCalledWith('STAFF_IDENTITY', 'Update');
  });

  it('uses the body carrier on a DELETE that carries a body', () => {
    http
      .delete(`${environment.apiUrl}/Staff/Insurance/delete`, { body: { staffMemberId: 'e1' } })
      .subscribe();

    const { request } = httpMock.expectOne((r) => r.url.endsWith('/Staff/Insurance/delete'));
    expect(request.body).toEqual({ staffMemberId: 'e1', moduleId: 3, operationId: 4 });
    expect(request.params.has('ModuleId')).toBe(false);
  });

  it('uses the query carrier on a multipart route that declares the ids as params', () => {
    const body = new FormData();
    body.append('EducationDocument', 'doc');

    http.post(`${environment.apiUrl}/Staff/Education/update-education`, body).subscribe();

    const { request } = httpMock.expectOne((r) => r.url.endsWith('/update-education'));
    expect(request.params.get('ModuleId')).toBe('3');
    expect((request.body as FormData).has('ModuleId')).toBe(false);
  });

  it('seeds a body when a body-carrier route has none', () => {
    http.post(`${environment.apiUrl}/Staff/update-bulk`, null).subscribe();

    const { request } = httpMock.expectOne((r) => r.url.endsWith('/Staff/update-bulk'));
    expect(request.body).toEqual({ moduleId: 3, operationId: 4 });
  });

  it('falls back to the query string when a body-carrier body cannot be merged', () => {
    http.post(`${environment.apiUrl}/Staff/update`, ['a']).subscribe();

    const { request } = httpMock.expectOne((r) => r.url.endsWith('/Staff/update'));
    expect(request.params.get('ModuleId')).toBe('3');
    expect(request.body).toEqual(['a']);
  });

  it('resolves the module from the body on a verification-status write', () => {
    http
      .post(`${environment.apiUrl}/Staff/update-verification-status`, {
        tabInfoType: PROFILE_TABS.Bank,
        isVerified: true,
      })
      .subscribe();

    const { request } = httpMock.expectOne((r) => r.url.endsWith('/update-verification-status'));
    expect(moduleOperationIds).toHaveBeenCalledWith('STAFF_BANK_DETAILS', 'Verify');
    expect(request.body).toMatchObject({ moduleId: 3, operationId: 4 });
  });

  it('resolves the profile overview for the basic-info tab on an edit-status write', () => {
    http
      .post(`${environment.apiUrl}/Staff/update-edit-status`, {
        tabInfoType: PROFILE_TABS.StaffMember,
        isEditable: true,
      })
      .subscribe();

    httpMock.expectOne((r) => r.url.endsWith('/update-edit-status'));
    expect(moduleOperationIds).toHaveBeenCalledWith('STAFF_OVERVIEW', 'Allow Editing');
  });

  it('sends nothing when the body does not name a module', () => {
    http.post(`${environment.apiUrl}/Staff/update-verification-status`, {}).subscribe();

    const { request } = httpMock.expectOne((r) => r.url.endsWith('/update-verification-status'));
    expect(request.body).toEqual({});
    expect(moduleOperationIds).not.toHaveBeenCalled();
  });

  it('sends nothing when neither id resolves', () => {
    moduleOperationIds.mockReturnValue({ ModuleId: undefined, OperationId: undefined });

    http.get(`${environment.apiUrl}/Staff/get`).subscribe();

    const { request } = httpMock.expectOne((r) => r.url.endsWith('/Staff/get'));
    expect(request.params.has('ModuleId')).toBe(false);
    expect(request.params.has('OperationId')).toBe(false);
  });

  it('sends only the id that resolved', () => {
    moduleOperationIds.mockReturnValue({ ModuleId: 3, OperationId: undefined });

    http.get(`${environment.apiUrl}/Staff/get`).subscribe();

    const { request } = httpMock.expectOne((r) => r.url.endsWith('/Staff/get'));
    expect(request.params.get('ModuleId')).toBe('3');
    expect(request.params.has('OperationId')).toBe(false);
  });

  it('leaves a param the call site already set', () => {
    http.get(`${environment.apiUrl}/Staff/get-all`, { params: { ModuleId: 99 } }).subscribe();

    const { request } = httpMock.expectOne((r) => r.url.endsWith('/Staff/get-all'));
    expect(request.params.get('ModuleId')).toBe('99');
  });

  it('does not duplicate an id baked into the URL query string', () => {
    http.get(`${environment.apiUrl}/Staff/get-all?ModuleId=99`).subscribe();

    const { request } = httpMock.expectOne((r) => r.url.includes('/Staff/get-all'));
    expect(request.urlWithParams.match(/ModuleId=/gi)).toHaveLength(1);
    expect(request.urlWithParams).toContain('ModuleId=99');
  });

  it('treats a lowercase id in the URL as already set, since query binding is case-insensitive', () => {
    http.get(`${environment.apiUrl}/Staff/get-all?moduleId=99`).subscribe();

    const { request } = httpMock.expectOne((r) => r.url.includes('/Staff/get-all'));
    expect(request.urlWithParams.match(/moduleId=/gi)).toHaveLength(1);
  });

  it('ignores a controller with no module code of its own', () => {
    // `my-menu` publishes no Asset page yet, so there is nothing to name.
    http.get(`${environment.apiUrl}/Asset/get-all`).subscribe();

    const { request } = httpMock.expectOne((r) => r.url.endsWith('/Asset/get-all'));
    expect(request.params.has('ModuleId')).toBe(false);
    expect(moduleOperationIds).not.toHaveBeenCalled();
  });

  it('never waits on the menu it reads from, nor on the token refresh', () => {
    isLoaded.set(false);

    http.get(`${environment.apiUrl}/Navigation/my-menu`).subscribe();
    http.get(`${environment.apiUrl}/Institution/get-all-institution-operations`).subscribe();
    http.post(`${environment.apiUrl}/Auth/refresh-token`, {}).subscribe();

    httpMock.expectOne((r) => r.url.endsWith('/Navigation/my-menu'));
    httpMock.expectOne((r) => r.url.endsWith('/get-all-institution-operations'));
    httpMock.expectOne((r) => r.url.endsWith('/Auth/refresh-token'));
    expect(ensureLoaded).not.toHaveBeenCalled();
  });

  it('dispatches on the same tick when a tree is already loaded', () => {
    http.get(`${environment.apiUrl}/Staff/get-all`).subscribe();

    httpMock.expectOne((r) => r.url.endsWith('/Staff/get-all'));
    expect(ensureLoaded).not.toHaveBeenCalled();
  });

  it('parks the request until the feature pages land, then sends it with the ids', async () => {
    isLoaded.set(false);
    let settle: () => void = () => undefined;
    ensureLoaded.mockReturnValue(new Promise<void>((resolve) => (settle = resolve)));

    http.get(`${environment.apiUrl}/Staff/get-all`).subscribe();

    httpMock.expectNone((r) => r.url.endsWith('/Staff/get-all'));

    isLoaded.set(true);
    settle();
    await Promise.resolve();

    const { request } = httpMock.expectOne((r) => r.url.endsWith('/Staff/get-all'));
    expect(request.params.get('ModuleId')).toBe('3');
  });

  it('sends the request bare rather than idling when the load fails', async () => {
    isLoaded.set(false);
    moduleOperationIds.mockReturnValue({ ModuleId: undefined, OperationId: undefined });

    http.get(`${environment.apiUrl}/Staff/get-all`).subscribe();
    await Promise.resolve();

    const { request } = httpMock.expectOne((r) => r.url.endsWith('/Staff/get-all'));
    expect(request.params.has('ModuleId')).toBe(false);
    expect(ensureLoaded).toHaveBeenCalledTimes(1);
  });

  it('retries the load on the next request after a failure', async () => {
    isLoaded.set(false);

    http.get(`${environment.apiUrl}/Staff/get-all`).subscribe();
    await Promise.resolve();
    httpMock.expectOne((r) => r.url.endsWith('/Staff/get-all'));

    http.get(`${environment.apiUrl}/Staff/get`).subscribe();
    await Promise.resolve();
    httpMock.expectOne((r) => r.url.endsWith('/Staff/get'));

    expect(ensureLoaded).toHaveBeenCalledTimes(2);
  });

  it('tags a request outside the staffMember family from its controller', () => {
    http.get(`${environment.apiUrl}/Designation/get-all`).subscribe();

    const { request } = httpMock.expectOne((r) => r.url.endsWith('/Designation/get-all'));
    expect(request.params.get('ModuleId')).toBe('3');
    expect(moduleOperationIds).toHaveBeenCalledWith('INSTITUTION_STAFF_DESIGNATIONS', 'View');
  });

  it('uses Institution Device workflow permissions instead of inferred CRUD names', () => {
    http.post(`${environment.apiUrl}/InstitutionDevice/create`, { deviceName: 'Door A' }).subscribe();

    const create = httpMock.expectOne((r) => r.url.endsWith('/InstitutionDevice/create'));
    expect(create.request.body).toEqual({ deviceName: 'Door A', moduleId: 3, operationId: 4 });
    expect(moduleOperationIds).toHaveBeenCalledWith(
      ['INSTITUTION_DEVICES', 'INSTITUTION_DEVICE_SETUP'],
      'Assign',
    );

    http.delete(`${environment.apiUrl}/InstitutionDevice/delete/7`).subscribe();

    const remove = httpMock.expectOne((r) => r.url.endsWith('/InstitutionDevice/delete/7'));
    expect(remove.request.params.get('ModuleId')).toBe('3');
    expect(remove.request.params.get('OperationId')).toBe('4');
    expect(moduleOperationIds).toHaveBeenCalledWith(
      ['INSTITUTION_DEVICES', 'INSTITUTION_DEVICE_SETUP'],
      'Remove',
    );
  });

  it('merges the ids into the body of a write outside the staffMember family', () => {
    http.post(`${environment.apiUrl}/Department/add`, { name: 'Ops' }).subscribe();

    const { request } = httpMock.expectOne((r) => r.url.endsWith('/Department/add'));
    expect(request.body).toEqual({ name: 'Ops', moduleId: 3, operationId: 4 });
    expect(moduleOperationIds).toHaveBeenCalledWith('INSTITUTION_DEPARTMENTS', 'Add');
  });

  it('leaves a body that owns `moduleId` for its own purpose untouched', () => {
    // `/ModuleOperation` maps a module to its operations - its `moduleId` is the target, not the
    // caller's permission.
    http.post(`${environment.apiUrl}/ModuleOperation/create`, { moduleName: 'X' }).subscribe();

    const { request } = httpMock.expectOne((r) => r.url.endsWith('/ModuleOperation/create'));
    expect(request.body).toEqual({ moduleName: 'X' });
    expect(moduleOperationIds).not.toHaveBeenCalled();
  });

  it('nests the ids under `permissionRequest` on a DefaultEmailConfig write', () => {
    http
      .post(`${environment.apiUrl}/DefaultEmailConfig/create`, { configName: 'Primary' })
      .subscribe();

    const { request } = httpMock.expectOne((r) => r.url.endsWith('/DefaultEmailConfig/create'));
    expect(request.body).toEqual({
      configName: 'Primary',
      permissionRequest: { moduleId: 3, operationId: 4 },
    });
    // The flat pair would land where `PermissionRequestDTO` binds nothing.
    expect(request.body).not.toHaveProperty('moduleId');
    expect(moduleOperationIds).toHaveBeenCalledWith('HOST_DEFAULT_EMAIL_CONFIG', 'Add');
  });

  it('leaves a `permissionRequest` the call site already set alone', () => {
    http
      .post(`${environment.apiUrl}/DefaultEmailConfig/update`, {
        id: 1,
        permissionRequest: { moduleId: 99, operationId: 98 },
      })
      .subscribe();

    const { request } = httpMock.expectOne((r) => r.url.endsWith('/DefaultEmailConfig/update'));
    expect(request.body).toEqual({
      id: 1,
      permissionRequest: { moduleId: 99, operationId: 98 },
    });
  });

  it('puts the ids on the query string for the DefaultEmailConfig reads and delete', () => {
    http.get(`${environment.apiUrl}/DefaultEmailConfig/get-all`).subscribe();

    const getAll = httpMock.expectOne((r) => r.url.endsWith('/DefaultEmailConfig/get-all'));
    expect(getAll.request.params.get('ModuleId')).toBe('3');
    expect(getAll.request.params.get('OperationId')).toBe('4');
    expect(moduleOperationIds).toHaveBeenCalledWith('HOST_DEFAULT_EMAIL_CONFIG', 'View');

    http.delete(`${environment.apiUrl}/DefaultEmailConfig/delete/5`).subscribe();

    const remove = httpMock.expectOne((r) => r.url.endsWith('/DefaultEmailConfig/delete/5'));
    expect(remove.request.params.get('ModuleId')).toBe('3');
    expect(moduleOperationIds).toHaveBeenCalledWith('HOST_DEFAULT_EMAIL_CONFIG', 'Delete');
  });

  it('nests the ids under `permissionRequest` on an EmailTemplate write', () => {
    http
      .post(`${environment.apiUrl}/EmailTemplate/update-status`, { id: 4, isActive: false })
      .subscribe();

    const { request } = httpMock.expectOne((r) => r.url.endsWith('/EmailTemplate/update-status'));
    expect(request.body).toEqual({
      id: 4,
      isActive: false,
      permissionRequest: { moduleId: 3, operationId: 4 },
    });
    // The flat pair would land where `PermissionRequestDTO` binds nothing.
    expect(request.body).not.toHaveProperty('moduleId');
    expect(moduleOperationIds).toHaveBeenCalledWith('HOST_EMAIL_TEMPLATE', 'Update');
  });

  it('puts the ids on the query string for the EmailTemplate reads and delete', () => {
    http.get(`${environment.apiUrl}/EmailTemplate/get-all`).subscribe();

    const getAll = httpMock.expectOne((r) => r.url.endsWith('/EmailTemplate/get-all'));
    expect(getAll.request.params.get('ModuleId')).toBe('3');
    expect(getAll.request.params.get('OperationId')).toBe('4');
    expect(moduleOperationIds).toHaveBeenCalledWith('HOST_EMAIL_TEMPLATE', 'View');

    http.delete(`${environment.apiUrl}/EmailTemplate/delete/5`).subscribe();

    const remove = httpMock.expectOne((r) => r.url.endsWith('/EmailTemplate/delete/5'));
    expect(remove.request.params.get('ModuleId')).toBe('3');
    expect(moduleOperationIds).toHaveBeenCalledWith('HOST_EMAIL_TEMPLATE', 'Delete');
  });

  it('puts the ids on the query string for the host institution update, not in its body', () => {
    const body = { companyName: 'Quecksilber Technologies', institutionCode: 'DG' };

    http.put(`${environment.apiUrl}/Institution/new-institution-update-by-host/LZXVKN94`, body).subscribe();

    const { request } = httpMock.expectOne((r) =>
      r.url.endsWith('/Institution/new-institution-update-by-host/LZXVKN94'),
    );
    expect(request.params.get('ModuleId')).toBe('3');
    expect(request.params.get('OperationId')).toBe('4');
    // `UpdateInstitutionByHostReq` declares neither field - the body stays exactly the DTO.
    expect(request.body).toEqual(body);
    expect(moduleOperationIds).toHaveBeenCalledWith('HOST_INSTITUTION_LIST', 'Update');
  });

  it('resolves the host institution create as an Add and merges the ids into its body', () => {
    const body = { companyName: 'Quecksilber Technologies', subscriptionPlanId: 18 };

    http.post(`${environment.apiUrl}/Institution/new-tentant-creation-by-host`, body).subscribe();

    const { request } = httpMock.expectOne((r) =>
      r.url.endsWith('/Institution/new-tentant-creation-by-host'),
    );
    expect(request.body).toEqual({ ...body, moduleId: 3, operationId: 4 });
    // Prefer the dedicated page, while allowing catalogs that publish Add on the institution list.
    expect(moduleOperationIds).toHaveBeenCalledWith(
      ['HOST_INSTITUTION_CREATE', 'HOST_INSTITUTION_LIST'],
      'Add',
    );
  });

  it('names the institution status operations rather than the fallback Update', () => {
    http.post(`${environment.apiUrl}/Institution/activate-institution`, { institutionId: 'LZXVKN94' }).subscribe();
    httpMock.expectOne((r) => r.url.endsWith('/Institution/activate-institution'));
    expect(moduleOperationIds).toHaveBeenCalledWith('HOST_INSTITUTION_LIST', 'Active');

    http
      .post(`${environment.apiUrl}/Institution/deactivate-institution`, { institutionId: 'LZXVKN94' })
      .subscribe();
    httpMock.expectOne((r) => r.url.endsWith('/Institution/deactivate-institution'));
    expect(moduleOperationIds).toHaveBeenCalledWith('HOST_INSTITUTION_LIST', 'Inactive');
  });

  it('names the institution delete operation rather than the fallback Update', () => {
    http.post(`${environment.apiUrl}/Institution/delete-institution`, { institutionId: 'LZXVKN94' }).subscribe();

    httpMock.expectOne((r) => r.url.endsWith('/Institution/delete-institution'));
    // `inferOperation` says `Update` for a POST named `delete-institution`; `HOST_INSTITUTION_LIST`
    // publishes `Delete` as an operation of its own, and that is what the API acts on.
    expect(moduleOperationIds).toHaveBeenCalledWith('HOST_INSTITUTION_LIST', 'Delete');
  });

  afterEach(() => httpMock.verify());
});


