import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, vi } from 'vitest';

import { GetOkrsRequest, GetOkrsResponse, IOkr } from '@shared/interfaces';

import { OkrApi } from './okr-api';

function makeOkr(over: Partial<IOkr>): IOkr {
  return {
    id: 'x',
    title: 't',
    description: '',
    objective: '',
    ownerStaffMemberId: 'emp-1',
    ownerName: 'Owner',
    departmentId: 'dep-eng',
    department: 'Engineering',
    level: 'Team',
    quarter: 'Q2-2026',
    startDate: '2026-04-01',
    endDate: '2026-06-30',
    weight: 10,
    status: 'Active',
    visibility: 'Public',
    progress: 10,
    dueDate: '2026-06-30',
    createdDate: '2026-01-01T00:00:00Z',
    isActive: true,
    keyResults: [],
    ...over,
  };
}

const dataset: GetOkrsResponse = {
  isSucceeded: true,
  message: 'OK',
  errors: [],
  data: [
    makeOkr({
      id: 'a',
      title: 'Alpha',
      level: 'Company',
      status: 'OnTrack',
      quarter: 'Q1-2026',
      ownerName: 'Aarav',
    }),
    makeOkr({
      id: 'b',
      title: 'Beta',
      level: 'Team',
      status: 'Behind',
      quarter: 'Q2-2026',
      ownerName: 'Bina',
    }),
    makeOkr({
      id: 'c',
      title: 'Gamma',
      level: 'Company',
      status: 'Completed',
      quarter: 'Q2-2026',
      ownerName: 'Chen',
    }),
  ],
};

function baseReq(over: Partial<GetOkrsRequest> = {}): GetOkrsRequest {
  return {
    IsActive: true,
    PageNumber: 1,
    PageSize: 10,
    SortBy: '',
    SortOrder: 'desc',
    ...over,
  };
}

describe('OkrApi', () => {
  let api: OkrApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [OkrApi, provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(OkrApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.useRealTimers();
  });

  it('filters by level via #applyQuery', async () => {
    let res: GetOkrsResponse | undefined;
    api.getOkrs(baseReq({ Level: 'Company' })).subscribe((r) => (res = r));
    httpMock.expectOne('data/okr.json').flush(dataset);
    await vi.advanceTimersByTimeAsync(400);
    expect(res!.data.map((o) => o.id)).toEqual(['a', 'c']);
    expect(res!.totalRecords).toBe(2);
  });

  it('filters by search term across title/owner', async () => {
    let res: GetOkrsResponse | undefined;
    api.getOkrs(baseReq({ SearchTerm: 'bina' })).subscribe((r) => (res = r));
    httpMock.expectOne('data/okr.json').flush(dataset);
    await vi.advanceTimersByTimeAsync(400);
    expect(res!.data.map((o) => o.id)).toEqual(['b']);
  });

  it('paginates the result set', async () => {
    let res: GetOkrsResponse | undefined;
    api.getOkrs(baseReq({ PageNumber: 2, PageSize: 2 })).subscribe((r) => (res = r));
    httpMock.expectOne('data/okr.json').flush(dataset);
    await vi.advanceTimersByTimeAsync(400);
    expect(res!.data).toHaveLength(1);
    expect(res!.totalRecords).toBe(3);
  });

  it('addOkr returns a success envelope with a generated id', async () => {
    let res: { isSucceeded: boolean; data: IOkr } | undefined;
    api
      .addOkr({ okr: makeOkr({ id: '' }) as never })
      .subscribe((r) => (res = r as { isSucceeded: boolean; data: IOkr }));
    await vi.advanceTimersByTimeAsync(400);
    expect(res!.isSucceeded).toBe(true);
    expect(res!.data.id).toBeTruthy();
  });
});
